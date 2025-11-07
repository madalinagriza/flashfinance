---
timestamp: 'Fri Nov 07 2025 01:27:17 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_012717.65913df3.md]]'
content_id: bf851a20fc63105a62ad3b9d7791ccce2c6adf79c99d53a9e0f75039840eba10
---

# file: src\syncs\transaction.sync.ts

```typescript
import { actions, Frames, Sync } from "@engine";
import { FileUploading, Requesting, Sessioning, Transaction } from "@concepts";

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
 * This synchronization creates a pipeline between the FileUploading and Transaction concepts.
 * When a file upload is successfully confirmed, this sync automatically triggers the
 * transaction import process using the content of that file.
 */
export const ImportTransactionsOnUpload: Sync = (
  { file, owner, content },
) => ({
  // WHEN a file upload is successfully confirmed...
  when: actions(
    [FileUploading.confirmUpload, {}, { file }],
  ),
  // WHERE we can retrieve the file's owner and content...
  where: async (frames) => {
    frames = await frames.query(FileUploading._getOwner, { file }, { owner });
    frames = await frames.query(
      FileUploading._getFileContent,
      { file },
      { content },
    );
    return frames;
  },
  // THEN import the transactions from the file content for that owner.
  then: actions(
    [Transaction.import_transactions, {
      owner_id: owner,
      fileContent: content,
    }],
  ),
});

//-- Get Transaction Info --//
export const GetTxInfoRequest: Sync = (
  { request, session, user, tx_id, txInfo, error },
) => ({
  when: actions([Requesting.request, {
    path: "/Transaction/getTxInfo",
    session,
    tx_id,
  }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // Handle unauthorized request
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Unauthorized" });
    }

    // Query for the transaction info.
    // Transaction.getTxInfo returns an array with one ParsedTransactionInfo object,
    // or the query results in empty frames if the transaction is not found for the user.
    const infoFrames = await frames.query(
      Transaction.getTxInfo,
      { owner_id: user, tx_id },
      { txInfo },
    );

    // Handle transaction not found
    if (
      infoFrames.length === 0 ||
      (infoFrames[0][txInfo] as unknown[]).length === 0
    ) {
      return new Frames({ ...originalFrame, [error]: "Transaction not found" });
    }

    // The result from the query (`txInfo`) is an array. We want to respond with the
    // single object inside it. We map the frame to replace the array with its first element.
    return infoFrames.map((frame) => {
      const infoArray = frame[txInfo] as any[];
      return {
        ...frame,
        [txInfo]: infoArray[0],
      };
    });
  },
  then: actions([Requesting.respond, { request, txInfo, error }]),
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
