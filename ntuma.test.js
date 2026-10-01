// Exercise the request-manifest logic from ntuma.html with a DOM stub.
const alerts = [];
let html = "";
function el(id) {
  return {
    id, value: "", focused: false,
    set innerHTML(v) { html = v; }, get innerHTML() { return html; },
    focus() { this.focused = true; }
  };
}
const els = {};
for (const id of ["cart-items","custom-item-name","custom-item-qty","custom-item-notes",
                  "delivery-window","retailer-loc","mic-btn","mic-icon","mic-text"]) els[id] = el(id);
global.document = {
  getElementById: (id) => els[id] || null,
  querySelector: () => null, querySelectorAll: () => []
};
global.alert = (m) => alerts.push(m);
global.window = {};

// Pull the page's own <script> straight out of ntuma.html and evaluate it, so
// the test exercises the shipped code rather than a copy of it.
const fs = require("fs");
const path = require("path");
const pageSource = fs.readFileSync(path.join(__dirname, "ntuma.html"), "utf8");
const blocks = pageSource.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
if (blocks.length === 0) {
  console.error("FAIL  no <script> block found in ntuma.html");
  process.exit(1);
}
const source = blocks.map((b) => b.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "")).join("\n;\n");
eval(source);

const fail = [];
const check = (n, c) => { console.log((c ? "PASS  " : "FAIL  ") + n); if (!c) fail.push(n); };

check("empty list renders placeholder", /empty/i.test(els["cart-items"].innerHTML));
check("submit with empty list is blocked", (() => { submitOrder(); return alerts.some(a => /at least one item/i.test(a)); })());

els["custom-item-name"].value = "Pakistan Rice";
els["custom-item-qty"].value = "3";
els["custom-item-notes"].value = "25kg sacks";
addCustomItemToList();
check("item added to manifest", /Pakistan Rice/.test(els["cart-items"].innerHTML));
check("quantity shown", /Qty 3/.test(els["cart-items"].innerHTML));
check("total units computed", (() => { const m = els["cart-items"].innerHTML.match(/Total units<\/span><span>([^<]*)/); return m && m[1] === "3"; })());
check("form cleared after add", els["custom-item-name"].value === "");
check("list length is 1", requestList.length === 1);

els["custom-item-name"].value = "Sugar";
els["custom-item-qty"].value = "2";
addCustomItemToList();
check("second item added", /Sugar/.test(els["cart-items"].innerHTML) && /Total units/.test(els["cart-items"].innerHTML));

// XSS: item names are user input and are rendered into innerHTML.
els["custom-item-name"].value = '<img src=x onerror=alert(1)>';
els["custom-item-qty"].value = "1";
addCustomItemToList();
// The name is rendered as inert text: the angle brackets are entities, so no
// tag can be parsed out of it. Checking for the substring "onerror=" would be
// wrong - it is still present, but as literal text a user typed.
check("markup in item name is escaped", (() => {
  const h = els["cart-items"].innerHTML;
  return h.includes("&lt;img") && !h.includes("<img");
})());

check("empty name rejected", (() => {
  const n = alerts.length; els["custom-item-name"].value = "   ";
  addCustomItemToList(); return alerts.length > n && /Enter an item name/.test(alerts[alerts.length-1]);
})());
check("bad quantity rejected", (() => {
  const n = alerts.length; els["custom-item-name"].value = "Rice"; els["custom-item-qty"].value = "0";
  addCustomItemToList(); return alerts.length > n && /at least 1/.test(alerts[alerts.length-1]);
})());

removeRequestItem(0);
check("removal works", requestList.length === 2 && !/Pakistan Rice/.test(els["cart-items"].innerHTML));

els["retailer-loc"].value = "Kimisenyi";
els["delivery-window"].value = "Morning";
submitOrder();
check("confirmation lists items and location", alerts.some(a => /Kimisenyi/.test(a) && /Morning/.test(a)));
check("confirmation is explicit that nothing was sent", alerts.some(a => /nothing has actually been sent|front-end prototype/i.test(a)));
check("list resets after submit", requestList.length === 0 && /empty/i.test(els["cart-items"].innerHTML));

console.log("");
if (fail.length) { console.log(fail.length + " FAILED: " + fail.join(", ")); process.exit(1); }
console.log("All checks passed.");
