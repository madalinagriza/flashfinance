
[@sync-background](../../design/tools/sync-background.md)
 

[@category.sync.ts](category.sync.ts)

[@CategoryConcept.ts](../concepts/Category/CategoryConcept.ts)

[@label.sync.ts](label.sync.ts)

[@LabelConcept.ts](../concepts/Label/LabelConcept.ts)

[@transaction.sync.ts](transaction.sync.ts)

[@TransactionConcept.ts](../concepts/Transaction/TransactionConcept.ts)

#prompt:  what is the problem with this request? fix and only give me the modified functions

[Requesting] Error processing request: Missing binding: Symbol(error) in frame: [object Object]

Transaction.getTxInfoInternal {
  owner_id: '019a5d7a-5589-7792-a4a6-03a7679e5448',
  tx_id: 'f92cefe0-59b3-4542-96fc-d2caa0ac96c6'
} => [
  {
    txInfo: {
      date: 2025-09-29T00:00:00.000Z,
      merchant_text: 'Time Out Market Bostonon Sep 29, 2025collapsed',
      amount: 7.44
    }
  }
]

[Requesting] Error processing request: Missing binding: Symbol(error) in frame: [object Object]
# response:

The error `Missing binding: Symbol(error)` indicates that a synchronization's `then` clause is trying to use a variable named `error` that was not bound to the frame by the `where` clause.

The problem lies in the `GetTxInfoRequest` synchronization in `src/syncs/transaction.sync.ts`. Its `then` clause expects both a `txInfo` and an `error` variable to be available for the response. However, the logic within its `where` clause has three distinct paths, and each path produces a frame that is missing one of the required variables:

1.  **Unauthorized Path**: Binds `error` but not `txInfo`.
2.  **Not Found Path**: Binds `error` but not `txInfo`.
3.  **Success Path**: Binds `txInfo` but not `error`.

The provided log shows that the `Transaction.getTxInfoInternal` query succeeded, meaning the **Success Path** was taken. The frame passed to the `then` clause correctly contained the `txInfo` data but was missing a binding for `error`, causing the crash.

The fix is to refactor the single, complex synchronization into three separate, simpler ones, each handling a specific case (Success, Unauthorized, Not Found). This is an idiomatic pattern in concept-based design that improves clarity and correctness by ensuring each `then` clause only receives frames with the exact variables it needs.

Here are the modified functions for `src/syncs/transaction.sync.ts`. Replace the original `GetTxInfoRequest` synchronization with the following three:

# file: src\syncs\transaction.sync.ts

```typescript
/**
 * Handles successful requests for transaction info.
 * This sync fires only if the user is authorized and the transaction is found.
 */
export const GetTxInfoRequest: Sync = (
  { request, session, user, tx_id, txInfo },
) => ({
  when: actions([Requesting.request, {
    path: "/Transaction/getTxInfo",
    session,
    tx_id,
  }, { request }]),
  where: async (frames) => {
    // Authorize user; veto if unauthorized.
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames();

    // Query for transaction info; veto if not found.
    const infoFrames = await frames.query(
      Transaction.getTxInfoInternal,
      { owner_id: user, tx_id },
      { txInfo },
    );
    if (infoFrames.length === 0) return new Frames();

    return infoFrames;
  },
  // This `then` clause only handles the success case and correctly uses `txInfo`.
  then: actions([Requesting.respond, { request, txInfo }]),
});

/**
 * Handles unauthorized requests for transaction info.
 * This sync fires only if the session provided is invalid.
 */
export const GetTxInfoUnauthorized: Sync = (
  { request, session, user, error },
) => ({
  when: actions([Requesting.request, {
    path: "/Transaction/getTxInfo",
    session,
  }, { request }]),
  where: async (frames) => {
    const userFrames = await frames.query(Sessioning._getUser, { session }, {
      user,
    });
    // This sync only proceeds if the query for a user FAILS.
    if (userFrames.length > 0) {
      return new Frames(); // Veto, session is valid.
    }
    // The session is invalid. Add an error to the frame and let it proceed.
    return frames.map((f) => ({ ...f, [error]: "Unauthorized" }));
  },
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Handles requests for a transaction that is not found for an authorized user.
 */
export const GetTxInfoNotFound: Sync = (
  { request, session, user, tx_id, txInfo, error },
) => ({
  when: actions([Requesting.request, {
    path: "/Transaction/getTxInfo",
    session,
    tx_id,
  }, { request }]),
  where: async (frames) => {
    // Authorize user; veto if unauthorized.
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames();

    // Query for transaction info; veto if it is found.
    const infoFrames = await frames.query(
      Transaction.getTxInfoInternal,
      { owner_id: user, tx_id },
      { txInfo },
    );
    if (infoFrames.length > 0) return new Frames();

    // The transaction was not found. Add an error to the frame.
    return frames.map((f) => ({ ...f, [error]: "Transaction not found" }));
  },
  then: actions([Requesting.respond, { request, error }]),
});
```