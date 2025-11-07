---
timestamp: 'Fri Nov 07 2025 04:33:12 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_043312.d876aa18.md]]'
content_id: 604a73a87b49f2ea853abd4c75feb058d71a841700d8a4fba7d564617f25199f
---

# response:

The error `Missing binding: Symbol(error)` indicates that a synchronization's `then` clause is trying to use a variable named `error` that was not bound to the frame by the `where` clause.

The problem lies in the `GetTxInfoRequest` synchronization in `src/syncs/transaction.sync.ts`. Its `then` clause expects both a `txInfo` and an `error` variable to be available for the response. However, the logic within its `where` clause has three distinct paths, and each path produces a frame that is missing one of the required variables:

1. **Unauthorized Path**: Binds `error` but not `txInfo`.
2. **Not Found Path**: Binds `error` but not `txInfo`.
3. **Success Path**: Binds `txInfo` but not `error`.

The provided log shows that the `Transaction.getTxInfoInternal` query succeeded, meaning the **Success Path** was taken. The frame passed to the `then` clause correctly contained the `txInfo` data but was missing a binding for `error`, causing the crash.

The fix is to refactor the single, complex synchronization into three separate, simpler ones, each handling a specific case (Success, Unauthorized, Not Found). This is an idiomatic pattern in concept-based design that improves clarity and correctness by ensuring each `then` clause only receives frames with the exact variables it needs.

Here are the modified functions for `src/syncs/transaction.sync.ts`. Replace the original `GetTxInfoRequest` synchronization with the following three:
