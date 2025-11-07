---
timestamp: 'Thu Nov 06 2025 23:22:33 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_232233.368ceaad.md]]'
content_id: b043868374deee3d1ba8df00c5949b61ad4998bac6169c176a48e5c01b76df03
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

```
