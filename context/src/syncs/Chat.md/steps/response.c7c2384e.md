---
timestamp: 'Fri Nov 07 2025 01:00:59 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_010059.9b8dae0e.md]]'
content_id: c7c2384eceb23c494ab52e9486ff5a25fbf34db3fe8887dce35f2df65dc1e63f
---

# response:

Of course. This is a fantastic and very common debugging scenario in concept design. Let's break down the logs to make sense of the synchronization and pinpoint exactly why `get_unlabeled_transactions` isn't working as expected.

### Making Sense of the Sync (Analysis of the Logs)

The good news is that almost everything is working perfectly. Your concepts and the sync engine are doing exactly what you told them to. Let's trace the execution for the failing request:

1. **Request Received:** The server gets a request for `/Transaction/get_unlabeled_transactions` with a valid session ID.
   ```
   [Requesting] Received request for path: /Transaction/get_unlabeled_transactions
   ```

2. **`Requesting.request` Action Fires:** The `Requesting` concept turns this HTTP call into an action. This is the entry point for your syncs.
   ```
   Requesting.request {
       session: '019a5ce3-d425-717f-8537-5e814f1aedf8',
       path: '/Transaction/get_unlabeled_transactions'
   } => { request: '019a5ce3-d895-7163-be3f-9c8a884a079c' }
   ```

3. **`GetUnlabeledTransactionsRequest` Sync Triggers:** Your synchronization sees this `Requesting.request` action and its `when` clause matches. The `where` clause begins execution.
   ```
   [GetUnlabeledTransactions] where start { request: "019a5ce3-d895-7163-be3f-9c8a884a079c" }
   ```

4. **Session is Validated:** The first line in your `where` clause queries the `Sessioning` concept to get the user ID from the session ID. This succeeds.
   ```typescript
   // This line works!
   frames = await frames.query(Sessioning._getUser, { session }, { user });
   ```

5. **Transaction Concept is Queried:** The `where` clause then calls `Transaction.get_unlabeled_transactions` with the correct `owner_id`.
   ```
   [GetUnlabeledTransactions] querying transactions { owner: "019a5974-cc78-7739-a34b-fe51150580d2" }
   ```

6. **Database Query Succeeds:** Your `TransactionConcept` code runs correctly. It finds and returns 8 unlabeled transactions from the database. The trace logs confirm this.
   ```
   Trace: [TransactionConcept] get_unlabeled_transactions - result { owner_id: "...", count: 8 }
   ...
   Transaction.get_unlabeled_transactions { owner_id: '...' } => [ ... 8 documents ... ]
   ```

7. **Frames are Created:** The sync engine's `.query()` method takes the array of 8 documents and correctly expands the execution into 8 separate "frames" or potential execution paths.
   ```
   [GetUnlabeledTransactions] transactionFrames length 8
   ```

8. **The Error Occurs:** Right after the `where` clause successfully completes and passes its frames to the `then` clause, the system crashes.
   ```
   [Requesting] Error processing request: Missing binding: Symbol(error) in frame: [object Object]
   ```

### The Root Cause

The error message is the key: **`Missing binding: Symbol(error)`**.

Let's look at the `then` clause of your `GetUnlabeledTransactionsRequest` sync:

```typescript
// src/syncs/transaction.sync.ts

// ...
then: actions([Requesting.respond, { request, results, error }]),
```

This `then` clause tells the engine: "For every frame you give me, fire a `Requesting.respond` action. The parameters for that action will be the values bound to the `request`, `results`, and `error` variables in the frame."

Now, let's look at the two possible paths your `where` clause can take:

* **Failure Path (Unauthorized):** If `Sessioning._getUser` returns no user, you correctly create a new frame that **includes an `error` binding**.
  ```typescript
  // This path would work with your `then` clause
  if (frames.length === 0) {
    // ...
    return new Frames({ ...originalFrame, [error]: "Unauthorized" });
  }
  ```

* **Success Path (This is what's happening):** If the user is found and transactions are retrieved, you use `collectAs` to create a final frame. This frame contains bindings for `request`, `session`, `user`, and the newly created `results`. **It does not contain a binding for `error`**.

**The problem is that your single `then` clause is trying to handle both success and error, but the frame it receives on the success path is missing the `error` variable it's looking for.**

### The Solution

The most robust and idiomatic way to solve this in concept design is to **split the logic into separate, mutually exclusive synchronizations**: one for the success case and one for each failure case you want to handle explicitly. This makes the logic cleaner and avoids conditional complexity inside a single sync.

We will refactor `GetUnlabeledTransactionsRequest` into two syncs:

1. `GetUnlabeledTransactionsSuccess`: Handles the successful retrieval of transactions.
2. `GetUnlabeledTransactionsUnauthorized`: Handles the case where the session is invalid.

Here is the corrected code for `src/syncs/transaction.sync.ts`:
