---
timestamp: 'Thu Nov 06 2025 11:11:37 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_111137.6f318d5c.md]]'
content_id: 3bc4d504c337864e09b3c65fe94b86e6913af2d1a3f4132d8c681d78e1112753
---

# prompt: I am pasting a trace of a user changing password timing out through syncs in after. Why do you think it failed, are there backend problems?

UserAuthentication.login { username: 'madalina', password: 'madalina' } => { user: '019a5974-cc78-7739-a34b-fe51150580d2' }

Sessioning.create { user: '019a5974-cc78-7739-a34b-fe51150580d2' } => { session: '019a59ee-b6a8-70f0-ac6f-b18858ef95b2' }

\[Requesting] Received request for path: /login

Requesting.request { username: 'madalina', password: 'madalina', path: '/login' } => { request: '019a59ee-b6de-740d-b15b-0da7399431e8' }

UserAuthentication.login { username: 'madalina', password: 'madalina' } => { user: '019a5974-cc78-7739-a34b-fe51150580d2' }

Sessioning.create { user: '019a5974-cc78-7739-a34b-fe51150580d2' } => { session: '019a59ee-b6fd-758f-93fd-b6e004b88d28' }

Requesting.respond {
request: '019a59ee-b6de-740d-b15b-0da7399431e8',
session: '019a59ee-b6fd-758f-93fd-b6e004b88d28'
} => { request: '019a59ee-b6de-740d-b15b-0da7399431e8' }

\[Requesting] Received request for path: /Category/getCategoriesFromOwner
\[Requesting] Received request for path: /Transaction/get\_unlabeled\_transactions

Requesting.request {
owner\_id: '019a5974-cc78-7739-a34b-fe51150580d2',
path: '/Category/getCategoriesFromOwner'
} => { request: '019a59ee-bb1a-7224-a4ba-571e8dae151b' }

Requesting.request {
owner\_id: '019a5974-cc78-7739-a34b-fe51150580d2',
path: '/Transaction/get\_unlabeled\_transactions'
} => { request: '019a59ee-bb1c-7da5-a152-4e2e2dfacc77' }

\[Requesting] Error processing request: Request 019a59ee-bb1a-7224-a4ba-571e8dae151b timed out after 10000ms
\[Requesting] Error processing request: Request 019a59ee-bb1c-7da5-a152-4e2e2dfacc77 timed out after 10000ms
\[Requesting] Received request for path: /Transaction/getUnlabeledTransactions

Requesting.request {
owner\_id: '019a5974-cc78-7739-a34b-fe51150580d2',
path: '/Transaction/getUnlabeledTransactions'
} => { request: '019a59ee-e24b-75d5-a10d-bfc8fc0f5ca2' }

\[Requesting] Received request for path: /UserAuthentication/changePassword

Requesting.request {
user: '019a5974-cc78-7739-a34b-fe51150580d2',
oldPassword: 'madalina',
newPassword: 'madalina1',
path: '/UserAuthentication/changePassword'
} => { request: '019a59ef-0725-702c-abe8-bc0ec4bf5c20' }

\[Requesting] Error processing request: Request 019a59ee-e24b-75d5-a10d-bfc8fc0f5ca2 timed out after 10000ms
\[Requesting] Error processing request: Request 019a59ef-0725-702c-abe8-bc0ec4bf5c20 timed out after 10000ms
