---
timestamp: 'Fri Nov 07 2025 00:39:50 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_003950.91dc0d1d.md]]'
content_id: b31b69417aaefe1c52aac966e75f42ce1c357b0526ab54e232fae86ce37b665e
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
    path: "/Transaction/import_transactions",
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
    [Requesting.request, { path: "/Transaction/import_transactions" }, {
      request,
    }],
    [Transaction.import_transactions, {}, {}], // Success has empty output
  ),
  then: actions([Requesting.respond, { request, ok: true }]),
});

export const ImportTransactionsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Transaction/import_transactions" }, {
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
export const GetUnlabeledTransactionsRequest: Sync = ({
  request,
  session,
  user,
  tx_id,
  date,
  merchant_text,
  amount,
  status,
  results,
  error,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Transaction/get_unlabeled_transactions", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0];
    console.log("[GetUnlabeledTransactions] where start", { request: originalFrame[request] });

    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      console.log("[GetUnlabeledTransactions] no user for session", { session: originalFrame[session] });
      return new Frames({ ...originalFrame, [error]: "Unauthorized" });
    }

    console.log("[GetUnlabeledTransactions] querying transactions", { owner: frames[0][user] });
    const transactionFrames = await frames.query(
      Transaction.get_unlabeled_transactions,
      { owner_id: user },
      { tx_id, date, merchant_text, amount, status },
    );
    console.log("[GetUnlabeledTransactions] transactionFrames length", transactionFrames.length);

    if (transactionFrames.length === 0) {
      console.log("[GetUnlabeledTransactions] empty result set");
      return new Frames({ ...originalFrame, [results]: [] });
    }

    return transactionFrames.collectAs(
      [tx_id, date, merchant_text, amount, status],
      results,
    );
  },
  then: actions([Requesting.respond, { request, results, error }]),
});
```
