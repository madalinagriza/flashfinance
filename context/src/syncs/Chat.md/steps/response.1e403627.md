---
timestamp: 'Fri Nov 07 2025 01:51:33 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_015133.0fb83356.md]]'
content_id: 1e4036270257a7ed6bb0e94b77cc5f41cc38706ed3f1e40694310472d0cce737
---

# response:

Based on the trace you've provided, the `/Label/finalize` API is failing due to a `TypeError: Cannot read properties of undefined (reading 'tx_id')`. This error occurs after several labels have been successfully staged.

Here's a breakdown of the problem and the solution:

### The Problem

The error originates within the `where` clause of the `FinalizeWithLabels` synchronization located in `src/syncs/label.sync.ts`.

1. **Synchronization Logic**: This sync is designed to fetch all staged labels for a user, then for each staged label, it fetches the corresponding full transaction details.
2. **Incorrect Query Binding**: The `where` clause calls `Transaction.getTransaction` using the following query pattern:
   ```typescript
   // in src/syncs/label.sync.ts
   const txDocFrame = await new Frames(frame).query(
     Transaction.getTransaction,
     { owner_id: userId, tx_id: sl.tx_id },
     { tx }, // <--- THIS IS THE PROBLEM
   );
   ```
   The output pattern `{ tx }` tells the synchronization engine to look for a property named `tx` on the objects returned by the `Transaction.getTransaction` query.
3. **Mismatched Concept Method**: However, if we look at the implementation of `Transaction.getTransaction` in `src/concepts/Transaction/TransactionConcept.ts`, its return signature is `Promise<TransactionDoc[]>`. It returns an array of raw `TransactionDoc` objects, like this: `[ { _id: "...", tx_id: "...", amount: ... } ]`.
4. **The Consequence**: The `TransactionDoc` object itself does not have a property called `tx`. Because the engine cannot find a `tx` property on the returned object, it binds the variable `tx` to `undefined`. Later in the `where` clause, the code attempts to use this `undefined` variable (`const txDoc = f[tx]`), which leads to the `TypeError` when its properties are accessed to build the payload for the next actions.

While the error message mentions `tx_id`, the root cause is that the entire `txDoc` object is `undefined`, and any attempt to access its properties (`.amount`, `.date`, etc.) will fail.

### The Solution

To fix this, you need to modify the `Transaction.getTransaction` method in `src/concepts/Transaction/TransactionConcept.ts` to return data in the shape that the `FinalizeWithLabels` synchronization expects. The query should return an array of objects, where each object has a `tx` property containing the transaction document.

You also need to update the `getTxInfo` method, which calls `getTransaction`, to handle this new return structure correctly.
