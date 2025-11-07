---
timestamp: 'Fri Nov 07 2025 00:45:57 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_004557.d817b589.md]]'
content_id: 954ebb6885f9ed87f817b0c1503fbb550fba17b4989a4b708185a7cc7102c202
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

    // 1. Authenticate the user session
    const userFrames = await frames.query(Sessioning._getUser, { session }, { user });

    // 2. Handle the unauthorized case
    if (userFrames.length === 0) {
      // Respond with an error and null results
      return new Frames({ ...originalFrame, [error]: "Unauthorized", [results]: null });
    }

    // 3. Query for the unlabeled transactions for the authenticated user
    const transactionFrames = await userFrames.query(
      Transaction.get_unlabeled_transactions,
      { owner_id: user },
      { tx_id, date, merchant_text, amount, status },
    );

    // 4. Handle the case where no transactions are found (successful but empty response)
    if (transactionFrames.length === 0) {
      // Respond with an empty array for results and a null error
      return new Frames({ ...userFrames[0], [results]: [], [error]: null });
    }

    // 5. Handle the success case where transactions are found
    const collectedFrames = transactionFrames.collectAs(
      [tx_id, date, merchant_text, amount, status],
      results,
    );
    
    // Ensure the 'error' binding is present but null for the success case
    return collectedFrames.map((frame) => ({ ...frame, [error]: null }));
  },
  then: actions([Requesting.respond, { request, results, error }]),
});
```
