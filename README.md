# NTUMA SMART

A logistics platform for Nyabugogo market in Kigali. Independent retailers order
what they need; a logistics fleet collects it from wholesalers and delivers it,
so shop owners no longer make the trip themselves.

Static HTML, CSS and vanilla JavaScript. No framework, no build step, no
backend. Open `all.html` to start.

## The portals

| Page | Persona | What it does |
|---|---|---|
| `all.html` | Entry point | Access gate; pick a role and it routes to the right panel |
| `retailer.html` | Retailer | Build a request list of goods with quantities and notes |
| `wholesaler.html` | Wholesaler | Depot stock list and profile |
| `team.html` | Fleet | Logistics console; sees wholesaler profiles and incoming loads |
| `ntuma.html` | Retailer, single page | Delivery request with a working item list and voice entry |
| `ntuma1-4.html` | Variants | Market hub gate variants that open a workspace in place |

## How it works

There is no server. State lives in a JavaScript array in the page, and "placing"
an order shows a confirmation that explicitly says nothing was transmitted.
That is deliberate: a prototype that implied a real order had been placed would
be misleading, so the confirmation states the boundary.

## What was fixed

The project looked finished but did nothing when you clicked it. Five separate
faults, all in the same category:

**Every button was dead.** Five functions were called by `onclick` handlers but
never written: `executeRoleAuthentication`, `routeToWorkspace`, `returnToGate`,
`addCustomItemToList`, `submitOrder` and `toggleMic`. The access gate had a role
dropdown, a phone field and an "Authenticate" button, and pressing it did
nothing. All six are now implemented.

**Six files were truncated mid-document.** `all.html` and `ntuma.html` through
`ntuma4.html` were all saved with `<div>`, `<main>`, `<body>` and `<html>` still
open. Browsers recover from this and render the page anyway, which is why it
went unnoticed, but it meant any script appended to a file was swallowed into an
unclosed `<div>` rather than landing in `<body>`. `fix_truncated_html.py` closes
exactly what each file leaves open, measured with `html.parser` rather than
assumed.

**The phone fields were unlabelled.** The label had no `for`, the input had no
`id`, and the value was a hardcoded `+250 78` placeholder, so screen readers
announced nothing and the field looked filled when it was not. Now paired, with
`type="tel"` and `autocomplete="tel"`.

**The gate pages had no way back.** `returnToGate` did not exist, so a user who
entered a workspace was stuck there until a manual page reload.

## A note on escaping

Item names in the request manifest come from a text input and are rendered with
`innerHTML`. They are escaped with `escapeHtml()` before storage, so a name
containing markup renders as literal text instead of executing. The test suite
asserts this directly, because it is the kind of bug that looks fine in a demo
and is exploitable in use.

## Tests

```bash
node ntuma.test.js
```

15 checks, no dependencies. The suite pulls the `<script>` block straight out of
`ntuma.html` and evaluates it against a DOM stub, so it exercises the shipped
code rather than a copy. It covers adding items, quantity validation, totals,
removal, the empty-list and submit guards, the confirmation message, and the
escaping behaviour described above.

`node --check` on each page's script confirms all nine files parse.

## Project layout

```
all.html            entry point and access gate
retailer.html       retailer procurement portal
wholesaler.html     wholesaler depot panel
team.html           fleet and logistics console
ntuma.html          delivery request with working item list
ntuma1-4.html       market hub gate variants
ntuma.test.js       headless test suite
fix_truncated_html.py  one-off repair for the truncated files
```

## Status

This is a front-end prototype. There is no authentication, no persistence and
no server, so the access gate is a routing convenience rather than a security
control. Deploying it would need a real backend, server-side authorisation, and
the fleet console reading from the same store the retailer writes to.
