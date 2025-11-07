---
timestamp: 'Thu Nov 06 2025 23:37:16 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_233716.d0ee2d62.md]]'
content_id: 1b79ed024d81dcec261225e44febbcea6d72bbc952677397adb16f390ab43b9c
---

# prompt: some of my requests are timing out. here is the trace. why is this happening?

Requesting concept initialized with a timeout of 10000ms.

Registering concept passthrough routes.
-> /api/UserAuthentication/register
-> /api/UserAuthentication/login

🚀 Requesting server listening for POST requests at base path of /api/\*
Listening on http://localhost:8000/ (http://localhost:8000/)

UserAuthentication.login { username: 'madalina', password: 'madalina1' } => { user: '019a5974-cc78-7739-a34b-fe51150580d2' }

Sessioning.create { user: '019a5974-cc78-7739-a34b-fe51150580d2' } => { session: '019a5c89-1e5f-74ae-929c-f89effd3b643' }

\[Requesting] Received request for path: /login

Requesting.request { username: 'madalina', password: 'madalina1', path: '/login' } => { request: '019a5c89-1ea7-7be5-9b3c-c32744c0053d' }

UserAuthentication.login { username: 'madalina', password: 'madalina1' } => { user: '019a5974-cc78-7739-a34b-fe51150580d2' }

Sessioning.create { user: '019a5974-cc78-7739-a34b-fe51150580d2' } => { session: '019a5c89-1f12-7d84-b02d-289cce68b8ab' }

Requesting.respond {
request: '019a5c89-1ea7-7be5-9b3c-c32744c0053d',
session: '019a5c89-1f12-7d84-b02d-289cce68b8ab'
} => { request: '019a5c89-1ea7-7be5-9b3c-c32744c0053d' }

\[Requesting] Received request for path: /Category/getCategoriesFromOwner
\[Requesting] Received request for path: /Transaction/get\_unlabeled\_transactions

Requesting.request {
owner\_id: '019a5974-cc78-7739-a34b-fe51150580d2',
path: '/Category/getCategoriesFromOwner'
} => { request: '019a5c89-239f-71de-9e80-7af3ce1474b5' }

Requesting.request {
owner\_id: '019a5974-cc78-7739-a34b-fe51150580d2',
path: '/Transaction/get\_unlabeled\_transactions'
} => { request: '019a5c89-23a3-7c2f-ae90-a998abf12245' }

\[Requesting] Error processing request: Request 019a5c89-239f-71de-9e80-7af3ce1474b5 timed out after 10000ms
\[Requesting] Error processing request: Request 019a5c89-23a3-7c2f-ae90-a998abf12245 timed out after 10000ms
