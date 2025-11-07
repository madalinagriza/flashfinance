---
timestamp: 'Fri Nov 07 2025 00:26:54 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_002654.7b97c9f9.md]]'
content_id: dc37938bf3fe586887f7633883edfc3a46d5f2d897676291de8075ad49a50787
---

# response:

You've hit on a common point of confusion with `where` clauses and the `Frames.query` method!

Your initial hypothesis: "the where doesn't fire because of the empty array returned by the backend" is **incorrect for the specific sync you've provided**. Let me explain why, and then propose solutions if you're still experiencing a timeout.

### Why Your Current `GetUnlabeledTransactionsRequest` Sync *Should Not* Hang Due to Empty Backend Array

Let's trace the execution of your `where` clause when `Transaction.get_unlabeled_transactions` returns an empty array:

```typescript
export const GetUnlabeledTransactionsRequest: Sync = (
  // ... variables
) => ({
  when: actions([Requesting.request, { path: "/Transaction/getUnlabeledTransactions", session }, { request }]),
  where: async (frames) => {
    // 1. originalFrame captures the initial request context
    const originalFrame = frames[0]; // e.g., { [request]: 'req1', [session]: 's1' }

    // 2. Authenticate the user session
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    // Assuming a valid session, frames now looks like:
    // { [request]: 'req1', [session]: 's1', [user]: 'userA' }

    // 3. Handle unauthorized: If no user, it returns an error frame.
    if (frames.length === 0) {
      // This path returns new Frames({...originalFrame, [error]: "Unauthorized"})
      // and thus *does not hang*.
      return new Frames({ ...originalFrame, [error]: "Unauthorized" });
    }

    // 4. Query for unlabeled transactions
    const transactionFrames = await frames.query(
      Transaction.get_unlabeled_transactions,
      { owner_id: user },
      { tx_id, date, merchant_text, amount, status },
    );
    // User's concern: If Transaction.get_unlabeled_transactions returns `[]`,
    // then transactionFrames will be an empty `Frames` object (length 0).

    // 5. THIS IS THE KEY PART: It explicitly checks for empty `transactionFrames`.
    if (transactionFrames.length === 0) {
      // If no unlabeled transactions are found, it creates a new Frames object
      // with the original request context and an *explicitly empty results array*.
      return new Frames({ ...originalFrame, [results]: [] });
    }

    // 6. If transactions are found, it collects them.
    return transactionFrames.collectAs(
      [tx_id, date, merchant_text, amount, status],
      results,
    );
  },
  then: actions([Requesting.respond, { request, results, error }]),
});
```

As you can see from step 5, your `where` clause is already explicitly handling the case where `Transaction.get_unlabeled_transactions` returns an empty array. It will correctly return a `Frames` object containing the `originalFrame`'s `request` binding and an empty `results` array. This `Frames` object will then proceed to the `then` clause, and `Requesting.respond` will fire with `{ request: 'req1', results: [] }`.

**This means your current `GetUnlabeledTransactionsRequest` sync, as written, is robust against empty results and should *not* hang when there are no unlabeled transactions.** It will send a successful response with an empty `results` array.

### So, if it's still hanging, the problem lies elsewhere.

Here are the most likely causes for a "hanging" (timeout) behavior, ordered by probability:

1. **Underlying Database Call is Hanging (Most Likely)**
   * The `Transaction.get_unlabeled_transactions` (or `Sessioning._getUser`) method itself is performing a MongoDB query (`find().toArray()`). If the MongoDB server is unreachable, slow, or experiencing issues, this `await` call can hang indefinitely until a connection timeout occurs at the driver level, or the `REQUESTING_TIMEOUT` is hit.
   * **Solution**: Add detailed logging *inside* the `TransactionConcept.ts` and `SessioningConcept.ts` methods to see if the database calls are even starting, and if they're completing.
     ```typescript
     // Inside TransactionConcept.ts / get_unlabeled_transactions method
     async get_unlabeled_transactions(a: Id | { owner_id: string }): Promise<TransactionDoc[]> {
         const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
         console.log(`[TransactionConcept] Querying unlabeled transactions for owner: ${owner_id.toString()}`);
         try {
             const docs = await this.transactions.find({
                 owner_id: owner_id.toString(),
                 status: TransactionStatus.UNLABELED,
             }).toArray();
             console.log(`[TransactionConcept] Found ${docs.length} unlabeled transactions for owner: ${owner_id.toString()}`);
             return docs;
         } catch (error) {
             console.error(`[TransactionConcept] Error fetching unlabeled transactions: ${error}`);
             throw error; // Re-throw to be caught by the sync's where clause
         }
     }
     ```
   * Check your `deno.json` for the `REQUESTING_TIMEOUT` value. It might be set too high, making timeouts seem like hangs.

2. **`Requesting.request` for This Path is Not Firing/Not Matching**
   * If the `Requesting.request` action for `path: "/Transaction/getUnlabeledTransactions"` is *never actually generated* or the `when` clause of your sync doesn't match it (e.g., a typo in the path string). In this case, no sync would process the incoming HTTP request, leading to the `Requesting` concept's default timeout.
   * **Solution**: Set your application's logging level to `TRACE` (usually in `src/main.ts` or `src/concept_server.ts`) and observe the console when you make the HTTP request. Look for `Requesting.request` actions being logged. If you don't see it for this specific path, the problem is at the HTTP layer or how the `Requesting` concept is interpreting the incoming request.

3. **Synchronization File Not Loaded**
   * If `src/syncs/transaction.sync.ts` (or the file containing this sync) is not being loaded by the engine. This would be similar to point 2, where the `Requesting.request` fires, but no sync acts on it.
   * **Solution**: Ensure you've run `deno run build` recently to update the `@concepts` and `@syncs` imports. Verify the filename adheres to the `.sync.ts` convention and is within `src/syncs/` or a subdirectory.

4. **Issue in `Sessioning._getUser` itself**
   * While your `where` clause handles an *empty* result from `Sessioning._getUser`, it won't handle a *hanging* `Sessioning._getUser` call. If that query hangs, the entire `where` clause will hang.
   * **Solution**: Similar to point 1, add detailed logging inside `SessioningConcept.ts`'s `_getUser` method.

### Proposed Solutions (Debugging Plan)

1. **Set Logging to TRACE:** Modify `src/main.ts` (or `src/concept_server.ts`) to enable `TRACE` level logging for maximum visibility.
   ```typescript
   // In src/main.ts (or concept_server.ts)
   // Adjust logging as needed
   import { setLogLevel } from "@engine";
   // setLogLevel("DEBUG"); // Or "INFO", "WARN", "ERROR", "FATAL"
   setLogLevel("TRACE"); // Use TRACE for detailed debugging
   // ... rest of your server setup
   ```

2. **Add `console.log` statements throughout the `where` clause of `GetUnlabeledTransactionsRequest` and inside the `Transaction.get_unlabeled_transactions` and `Sessioning._getUser` methods.**
   This will give you a precise understanding of where execution is stopping or slowing down.

3. **Reproduce the "hang":** Make the HTTP request that causes the application to hang.

4. **Analyze the Logs:**
   * **Did `Requesting.request` for `/Transaction/getUnlabeledTransactions` fire?** If not, the problem is earlier in the request processing chain.
   * **If it fired, which `console.log` was the last one before the timeout?**
     * If it's inside `TransactionConcept.ts` before `toArray()` returns: Database connectivity is the issue.
     * If it's inside `SessioningConcept.ts` before `findOne()` returns: Database connectivity is the issue for sessions.
     * If it passed all `console.log`s but still timed out before `Requesting.respond` is logged: There might be a very subtle engine issue, but this is less likely.

By systematically inspecting the logs at various points of execution, you'll be able to pinpoint the exact location of the hang. My strong suspicion is a database connectivity or performance problem causing the `await` calls in your concept implementations to hang.
