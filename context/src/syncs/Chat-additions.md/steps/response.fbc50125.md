---
timestamp: 'Thu Nov 06 2025 23:22:47 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_232247.046682a3.md]]'
content_id: fbc501252d994761335abf7cf60917fb2c7b2018536c047f6d7a4762f5df1d2b
---

# response:

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, Transaction } from "@concepts";

/**
 * This synchronization handles requests to retrieve all unlabeled transactions for a given user.
 * It first authenticates the user via their session and then queries the Transaction concept
 * for transactions with an 'UNLABELED' status belonging to that user.
 *
 * It responds with an array of transaction details or an error if the user is unauthorized.
 */
export const GetUnlabeledTransactionsRequest: Sync = (
  { request, session, user, tx_id, date, merchant_text, amount, status, results, error },
) => ({
  // WHEN an HTTP request comes in for the '/Transaction/getUnlabeledTransactions' path...
  when: actions([Requesting.request, {
    path: "/Transaction/getUnlabeledTransactions",
    session, // We need the session to identify the user
  }, { request }]), // Bind the request object
  
  // WHERE we first authenticate the user and then fetch their unlabeled transactions...
  where: async (frames) => {
    // Keep a reference to the original request frame to include in responses (especially errors/empty results)
    const originalFrame = frames[0];

    // 1. Authenticate the user session
    // This query takes the session ID and attempts to retrieve the associated user ID.
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // If no user is found for the session, the frames will be empty.
    if (frames.length === 0) {
      // Respond with an "Unauthorized" error
      return new Frames({ ...originalFrame, [error]: "Unauthorized" });
    }

    // 2. Query the Transaction concept for unlabeled transactions
    // We pass the authenticated 'user' (owner_id) and bind the fields of each TransactionDoc
    // (tx_id, date, merchant_text, amount, status) to variables.
    const transactionFrames = await frames.query(
      Transaction.get_unlabeled_transactions,
      { owner_id: user }, // Input: owner_id for the query
      { tx_id, date, merchant_text, amount, status }, // Output: fields from TransactionDoc
    );

    // 3. Handle the case where no unlabeled transactions are found for the user.
    if (transactionFrames.length === 0) {
      // Return an empty array for 'results' to indicate no unlabeled transactions.
      return new Frames({ ...originalFrame, [results]: [] });
    }

    // 4. Collect the details of all found transactions into a single 'results' array.
    // 'collectAs' groups the specified variables from multiple frames into an array
    // under the 'results' variable.
    return transactionFrames.collectAs(
      [tx_id, date, merchant_text, amount, status],
      results,
    );
  },

  // THEN respond to the original request with the collected transactions or any error.
  then: actions([Requesting.respond, { request, results, error }]),
});
```
