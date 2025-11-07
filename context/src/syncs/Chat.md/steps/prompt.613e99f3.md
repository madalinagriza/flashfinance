---
timestamp: 'Thu Nov 06 2025 11:25:47 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_112547.7ade31fe.md]]'
content_id: 613e99f3fac4555e6d27604c8d1a481531456d75a2d1e3a9a705f206a37b5eef
---

# prompt: I am pasting a trace of a user changing password timing out through syncs in after. Why do you think it failed, are there backend problems? I changed the password successfully, but I could still log in with the wrong password.

localhost:8000/ (http://localhost:8000/)

UserAuthentication.login { username: 'madalina', password: 'madalina' } => { user: '019a5974-cc78-7739-a34b-fe51150580d2' }

Sessioning.create { user: '019a5974-cc78-7739-a34b-fe51150580d2' } => { session: '019a59fb-8d78-774d-9138-26fcf24f79c9' }

\[Requesting] Received request for path: /login

Requesting.request { username: 'madalina', password: 'madalina', path: '/login' } => { request: '019a59fb-8db2-710c-90d8-1f312d57dd37' }

UserAuthentication.login { username: 'madalina', password: 'madalina' } => { user: '019a5974-cc78-7739-a34b-fe51150580d2' }

Sessioning.create { user: '019a5974-cc78-7739-a34b-fe51150580d2' } => { session: '019a59fb-8dd9-7059-9e4a-9a72bdb5f5a6' }

Requesting.respond {
request: '019a59fb-8db2-710c-90d8-1f312d57dd37',
session: '019a59fb-8dd9-7059-9e4a-9a72bdb5f5a6'
} => { request: '019a59fb-8db2-710c-90d8-1f312d57dd37' }

\[Requesting] Received request for path: /Category/getCategoriesFromOwner
\[Requesting] Received request for path: /Transaction/get\_unlabeled\_transactions

Requesting.request {
owner\_id: '019a5974-cc78-7739-a34b-fe51150580d2',
path: '/Category/getCategoriesFromOwner'
} => { request: '019a59fb-9207-7f32-9534-fa6bb5c18f8a' }

Requesting.request {
owner\_id: '019a5974-cc78-7739-a34b-fe51150580d2',
path: '/Transaction/get\_unlabeled\_transactions'
} => { request: '019a59fb-9209-7096-9b7f-a7ab1e3a4c45' }

\[Requesting] Error processing request: Request 019a59fb-9207-7f32-9534-fa6bb5c18f8a timed out after 10000ms
\[Requesting] Error processing request: Request 019a59fb-9209-7096-9b7f-a7ab1e3a4c45 timed out after 10000ms
\[Requesting] Received request for path: /Transaction/getUnlabeledTransactions

Requesting.request {
owner\_id: '019a5974-cc78-7739-a34b-fe51150580d2',
path: '/Transaction/getUnlabeledTransactions'
} => { request: '019a59fb-b948-74ee-a9a4-7d7feb90b2db' }

\[Requesting] Received request for path: /UserAuthentication/changePassword

Requesting.request {
user: '019a5974-cc78-7739-a34b-fe51150580d2',
oldPassword: 'madalina',
newPassword: 'madalina1',
path: '/UserAuthentication/changePassword'
} => { request: '019a59fb-bb1d-78fb-9d4b-b453f176c78e' }

UserAuthentication.changePassword {
username: 'madalina',
oldPassword: 'madalina',
newPassword: 'madalina1'
} => {}

Requesting.respond {
request: '019a59fb-bb1d-78fb-9d4b-b453f176c78e',
status: 'password\_changed'
} => { request: '019a59fb-bb1d-78fb-9d4b-b453f176c78e' }

\[Requesting] Received request for path: /logout

Requesting.request { session: '019a59fb-8dd9-7059-9e4a-9a72bdb5f5a6', path: '/logout' } => { request: '019a59fb-e058-710e-a663-082b261f171c' }

\[Requesting] Error processing request: Request 019a59fb-b948-74ee-a9a4-7d7feb90b2db timed out after 10000ms

Sessioning.delete { session: '019a59fb-8dd9-7059-9e4a-9a72bdb5f5a6' } => {}

Requesting.respond {
request: '019a59fb-e058-710e-a663-082b261f171c',
status: 'logged\_out'
} => { request: '019a59fb-e058-710e-a663-082b261f171c' }

UserAuthentication.login { username: 'madalina', password: 'madalina' } => { error: 'Invalid username or password' }

\[Requesting] Received request for path: /login

Requesting.request { username: 'madalina', password: 'madalina', path: '/login' } => { request: '019a59fb-f010-7b17-8bf1-6b643b2eaf85' }

UserAuthentication.login { username: 'madalina', password: 'madalina' } => { error: 'Invalid username or password' }

Requesting.respond {
request: '019a59fb-f010-7b17-8bf1-6b643b2eaf85',
error: 'Invalid username or password'
} => { request: '019a59fb-f010-7b17-8bf1-6b643b2eaf85' }

\[Requesting] Received request for path: /Login

Requesting.request { username: 'madalina', password: 'madalina', path: '/Login' } => { request: '019a59fb-f042-7e36-9186-2a1c0c8c3c22' }

\[Requesting] Error processing request: Request 019a59fb-f042-7e36-9186-2a1c0c8c3c22 timed out after 10000ms
\[Requesting] Received request for path: /Category/getCategoriesFromOwner
\[Requesting] Received request for path: /Transaction/get\_unlabeled\_transactions

Requesting.request {
owner\_id: '\[object Object]',
path: '/Category/getCategoriesFromOwner'
} => { request: '019a59fc-1b6c-7fb5-998d-3d8f693a9e73' }

Requesting.request {
owner\_id: '\[object Object]',
path: '/Transaction/get\_unlabeled\_transactions'
} => { request: '019a59fc-1b6d-7737-ae3a-a7acb1980f03' }

\[Requesting] Error processing request: Request 019a59fc-1b6c-7fb5-998d-3d8f693a9e73 timed out after 10000ms
