---
timestamp: 'Tue Nov 04 2025 21:11:39 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_211139.80c4ae61.md]]'
content_id: c11152c2c6cfa97af37341ac4f20536583b63765b88cc1c2f3b44050cb10a3d9
---

# solution:

The error `Property 'error' does not exist on type '{ user: ID; } | { error:string; }'` occurs because TypeScript cannot guarantee which part of the union type (`{ user: ID }` or `{ error: string }`) a result variable holds. To fix this, we use a type guard to check for the presence of the `error` property. This narrows the type within the `if/else` block, allowing safe access to either `result.error` or `result.user`.

The following files provide a complete implementation of the `UserAuthentication` concept and a test suite that correctly handles the potential error states, thus resolving the TypeScript error.
