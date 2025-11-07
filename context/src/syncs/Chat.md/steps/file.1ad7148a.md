---
timestamp: 'Fri Nov 07 2025 04:33:12 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_043312.d876aa18.md]]'
content_id: 1ad7148a198e1c3c5ce68559cd4e7a4b1a06c875beab3ee211311c68b69d64f4
---

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
