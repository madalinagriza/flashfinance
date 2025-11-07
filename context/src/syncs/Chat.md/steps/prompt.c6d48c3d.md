---
timestamp: 'Fri Nov 07 2025 00:21:41 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_002141.9ac93746.md]]'
content_id: c6d48c3de5c8ddc245ec622e64b8ed40dcc8be5cccb12ace1dd50b5bafd0a398
---

# prompt: invesitgate which syncs have problems and why, as well as labeling whether this is a backend or frontend problem.

UI ERRORS:

```
Categories
Better categories, clearer trends.

(raw || []).map is not a function

Manage Categories
Unlabeled Transactions
Label new activity to keep reports current.

Request timed out.


```

backend trace:
🚀 Requesting server listening for POST requests at base path of /api/\*
Listening on http://localhost:8000/ (http://localhost:8000/)
\[Requesting] Received request for path: /login

Requesting.request { username: 'madalina', password: 'madalina1', path: '/login' } => { request: '019a5cc2-2325-7884-bfec-9365a25040ba' }

UserAuthentication.login { username: 'madalina', password: 'madalina1' } => { user: '019a5974-cc78-7739-a34b-fe51150580d2' }

Sessioning.create { user: '019a5974-cc78-7739-a34b-fe51150580d2' } => { session: '019a5cc2-2354-72e7-807d-11d81a9eae56' }

Requesting.respond {
request: '019a5cc2-2325-7884-bfec-9365a25040ba',
session: '019a5cc2-2354-72e7-807d-11d81a9eae56'
} => { request: '019a5cc2-2325-7884-bfec-9365a25040ba' }

\[Requesting] Received request for path: /Category/getCategoriesFromOwner
\[Requesting] Received request for path: /Transaction/get\_unlabeled\_transactions

Requesting.request {
session: '019a5cc2-2354-72e7-807d-11d81a9eae56',
path: '/Transaction/get\_unlabeled\_transactions'
} => { request: '019a5cc2-27bb-72a5-ab73-9f3644bac3e2' }

Requesting.request {
session: '019a5cc2-2354-72e7-807d-11d81a9eae56',
path: '/Category/getCategoriesFromOwner'
} => { request: '019a5cc2-27b9-7b8c-954c-cbe42064d2ab' }

Category.getCategoriesFromOwner { owner\_id: '019a5974-cc78-7739-a34b-fe51150580d2' } => \[
{
category\_id: '1886c3ec-3a50-4266-9e8a-03f435879d59',
name: 'Travel'
},
{
category\_id: 'd5b4ff11-fd10-4428-9b61-d95106942a39',
name: 'Groceries'
},
{
category\_id: 'e679bd1c-698d-49f1-ab59-0efe08d37705',
name: 'Miscellaneous'
},
{ category\_id: 'TRASH\_CATEGORY', name: 'Trash' }
]

Requesting.respond {
request: '019a5cc2-27b9-7b8c-954c-cbe42064d2ab',
results: \[
{
category\_id: '1886c3ec-3a50-4266-9e8a-03f435879d59',
name: 'Travel'
},
{
category\_id: 'd5b4ff11-fd10-4428-9b61-d95106942a39',
name: 'Groceries'
},
{
category\_id: 'e679bd1c-698d-49f1-ab59-0efe08d37705',
name: 'Miscellaneous'
},
{ category\_id: 'TRASH\_CATEGORY', name: 'Trash' }
]
} => { request: '019a5cc2-27b9-7b8c-954c-cbe42064d2ab' }

\[Requesting] Error processing request: Request 019a5cc2-27bb-72a5-ab73-9f3644bac3e2 timed out after 10000ms
