---
timestamp: 'Fri Nov 07 2025 04:26:40 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_042640.1ee2fcee.md]]'
content_id: 356747751a1138acf20f7b8abd18618b9dfc97282a7989011922d914568ea7ef
---

# response:

Of course. The error `Cannot read properties of undefined (reading 'length')` indicates that the code is trying to access the `.length` property on a variable that is `undefined`. This is happening inside the `GetTxInfoRequest` synchronization.

Here's a breakdown of the problem and the solution.

### The Problem

The issue lies in a mismatch between the data structure returned by the `Transaction.getTxInfo` query and how the `GetTxInfoRequest` synchronization expects to use that data.

1. **Query Return Shape:** Your `Transaction.getTxInfo` query returns an array of objects like this: `[{ date, merchant_text, amount }]`.
2. **Sync Binding:** The `where` clause in your sync uses `frames.query(..., { txInfo })`. This tells the sync engine to look for a property named `txInfo` inside the objects returned by the query. Since no such property exists, the engine binds `undefined` to the `txInfo` variable in the frame.
3. **The Crash:** The next line in the sync, `(infoFrames[0][txInfo] as unknown[]).length`, becomes `(undefined).length`, which causes the application to crash.

The question "doesn't the getter *need* the tx info in an array?" is a good one. Yes, queries **must** return an array. The problem isn't that it's an array, but rather the *shape of the objects inside the array*.

### The Solution

The simplest and most consistent solution, which is used elsewhere in your project (like in `LabelConcept` and `Transaction.getTxInfoInternal`), is to wrap the query's result object in a parent object with the key that the sync expects.

I will provide two fixes:

1. Update `TransactionConcept.ts` to make the query more robust and return data in the expected shape.
2. Simplify the `GetTxInfoRequest` sync in `transaction.sync.ts` to correctly handle this data.

***
