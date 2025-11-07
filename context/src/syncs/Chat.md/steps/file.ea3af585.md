---
timestamp: 'Fri Nov 07 2025 11:57:23 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_115723.515b6755.md]]'
content_id: ea3af585ea0fe48e154ce5b33162874c0dbc8825ad9f1cb39d666411c3d1f49a
---

# file: src\syncs\transaction.sync.ts

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, Transaction } from "@concepts";

//-- Import Transactions --//
export const ImportTransactionsRequest: Sync = (
  { request, session, user, fileContent },
) => ({
  when: actions([Requesting.request, {
    path: "/Transaction/importTransactions",
    session,
    fileContent,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Transaction.import_transactions, {
    owner_id: user,
    fileContent,
  }]),
});

export const ImportTransactionsResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Transaction/importTransactions" }, {
      request,
    }],
    [Transaction.import_transactions, {}, {}], // Success has empty output
  ),
  then: actions([Requesting.respond, { request, ok: true }]),
});

export const ImportTransactionsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Transaction/importTransactions" }, {
      request,
    }],
    [Transaction.import_transactions, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

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
/**
 * This synchronization handles requests to retrieve all unlabeled transactions for a given user.
 * It first authenticates the user via their session and then queries the Transaction concept
 * for transactions with an 'UNLABELED' status belonging to that user.
 *
 * It responds with an array of transaction details or an error if the user is unauthorized.
 */
/**
 * Handles UNAUTHORIZED requests for unlabeled transactions.
 * This sync fires only if the session provided is invalid.
 */
export const GetUnlabeledTransactionsUnauthorized: Sync = (
  { request, session, user, error },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Transaction/get_unlabeled_transactions", session },
    { request },
  ]),
  where: async (frames) => {
    // We query for the user, but this sync should only proceed if the query FAILS.
    const userFrames = await frames.query(Sessioning._getUser, { session }, {
      user,
    });
    if (userFrames.length === 0) {
      // The session is invalid. Add an error to the frame and let it proceed.
      return frames.map((f) => ({ ...f, [error]: "Unauthorized" }));
    }
    // If a user was found, the session is valid, so we veto this sync.
    return new Frames();
  },
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Handles SUCCESSFUL requests for unlabeled transactions for an authorized user.
 * This sync will only fire if the session is valid. It handles both the case
 * where transactions are found and where the user has no unlabeled transactions.
 */
export const GetUnlabeledTransactionsSuccess: Sync = ({
  request,
  session,
  user,
  tx_id,
  date,
  merchant_text,
  amount,
  status,
  results,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Transaction/get_unlabeled_transactions", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    const userFrames = await frames.query(Sessioning._getUser, { session }, {
      user,
    });

    // Veto this sync if the user is not authorized. The Unauthorized sync will handle it.
    if (userFrames.length === 0) {
      return new Frames();
    }

    const transactionFrames = await userFrames.query(
      Transaction.get_unlabeled_transactions,
      { owner_id: user },
      { tx_id, date, merchant_text, amount, status },
    );

    // If the user has no unlabeled transactions, the query returns 0 frames.
    // We must handle this gracefully by responding with an empty array.
    if (transactionFrames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    // If transactions were found, collect them into the `results` variable.
    return transactionFrames.collectAs(
      [tx_id, date, merchant_text, amount, status],
      results,
    );
  },
  // This `then` clause only handles the success case and doesn't need the `error` variable.
  then: actions([Requesting.respond, { request, results }]),
});

```
