---
timestamp: 'Thu Nov 06 2025 11:01:30 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_110130.bc8e025b.md]]'
content_id: 277f1830b7241eb62fa2994b854a06a1222ce65a7483b4b6e02d5b9682b97863
---

# prompt: I am pasting a trace of a user register & logging in after. Why do you think it failed, are there backend problems?

C:\Users\mgriz\flashfinance>deno run start
Task start deno run --allow-net --allow-write --allow-read --allow-sys --allow-env src/main.ts

Requesting concept initialized with a timeout of 10000ms.

Registering concept passthrough routes.

🚀 Requesting server listening for POST requests at base path of /api/\*
Listening on http://localhost:8000/ (http://localhost:8000/)
\[Requesting] Received request for path: /UserAuthentication/register

Requesting.request {
username: 'ploua',
password: 'plouapicpic',
path: '/UserAuthentication/register'
} => { request: '019a59e4-bc9e-7a42-a21d-8cb5a77f06eb' }

UserAuthentication.register { username: 'ploua', password: 'plouapicpic' } => { user: '019a59e4-bcc6-7361-9605-468247d73229' }

Requesting.respond {
request: '019a59e4-bc9e-7a42-a21d-8cb5a77f06eb',
user: '019a59e4-bcc6-7361-9605-468247d73229'
} => { request: '019a59e4-bc9e-7a42-a21d-8cb5a77f06eb' }

\[Requesting] Received request for path: /UserAuthentication/login

Requesting.request {
username: 'ploua',
password: 'plouapicpic',
path: '/UserAuthentication/login'
} => { request: '019a59e5-0dda-774f-a177-9faf57abee62' }

\[Requesting] Error processing request: Request 019a59e5-0dda-774f-a177-9faf57abee62 timed out after 10000ms
