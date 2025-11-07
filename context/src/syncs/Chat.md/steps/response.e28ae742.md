---
timestamp: 'Thu Nov 06 2025 23:29:33 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_232933.fd5a1f23.md]]'
content_id: e28ae7421b029585a7f9367f595a0f1a8bdc974fbaff3ddb625d3e05ed5a8658
---

# response:

Here are the recommended changes for the two synchronizations to properly differentiate between genuinely empty lists and error conditions, ensuring that requests do not time out due to an unhandled `where` clause outcome.

The core principle is to always return a `Frames` object from the `where` clause, even if it's a single frame containing an error message or an empty `results` array, so that the `then` clause is always triggered to respond.

***

```typescript
// file: src\syncs\category.sync.ts
import { actions, Frames, Sync } from "@engine";
import { Category, Requesting, Sessioning } from "@concepts";
import { Period } from "../concepts/Category/CategoryConcept.ts";

//-- Create Category --//
export const CreateCategoryRequest: Sync = (
  { request, session, name, user },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/create",
    session,
    name,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Category.create, { owner_id: user, name }]),
});

export const CreateCategoryResponseSuccess: Sync = (
  { request, category_id },
) => ({
  when: actions(
    [Requesting.request, { path: "/Category/create" }, { request }],
    [Category.create, {}, { category_id }],
  ),
  then: actions([Requesting.respond, { request, category_id }]),
});

export const CreateCategoryResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Category/create" }, { request }],
    [Category.create, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Rename Category --//
export const RenameCategoryRequest: Sync = (
  { request, session, category_id, new_name, user },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/rename",
    session,
    category_id,
    new_name,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Category.rename, {
    owner_id: user,
    category_id,
    new_name,
  }]),
});

export const RenameCategoryResponseSuccess: Sync = (
  { request, category_id },
) => ({
  when: actions(
    [Requesting.request, { path: "/Category/rename" }, { request }],
    [Category.rename, {}, { category_id }],
  ),
  then: actions([Requesting.respond, { request, category_id }]),
});

export const RenameCategoryResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Category/rename" }, { request }],
    [Category.rename, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// //-- Remove Transaction from Category --//
// export const RemoveTransactionRequest: Sync = (
//   { request, session, category_id, tx_id, user },
// ) => ({
//   when: actions([Requesting.request, {
//     path: "/Category/removeTransaction",
//     session,
//     category_id,
//     tx_id,
//   }, { request }]),
//   where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
//   then: actions([Category.removeTransaction, {
//     owner_id: user,
//     category_id,
//     tx_id,
//   }]),
// });

// export const RemoveTransactionResponseSuccess: Sync = ({ request, ok }) => ({
//   when: actions(
//     [Requesting.request, { path: "/Category/removeTransaction" }, { request }],
//     [Category.removeTransaction, {}, { ok }],
//   ),
//   then: actions([Requesting.respond, { request, ok }]),
// });

// export const RemoveTransactionResponseError: Sync = ({ request, error }) => ({
//   when: actions(
//     [Requesting.request, { path: "/Category/removeTransaction" }, { request }],
//     [Category.removeTransaction, {}, { error }],
//   ),
//   then: actions([Requesting.respond, { request, error }]),
// });

//-- Update Transaction Category --//
export const UpdateTransactionRequest: Sync = (
  { request, session, user, tx_id, old_category_id, new_category_id },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/updateTransaction",
    session,
    tx_id,
    old_category_id,
    new_category_id,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Category.updateTransaction, {
    owner_id: user,
    tx_id,
    old_category_id,
    new_category_id,
  }]),
});

export const UpdateTransactionResponseSuccess: Sync = ({ request, ok }) => ({
  when: actions(
    [Requesting.request, { path: "/Category/updateTransaction" }, { request }],
    [Category.updateTransaction, {}, { ok }],
  ),
  then: actions([Requesting.respond, { request, ok }]),
});

export const UpdateTransactionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Category/updateTransaction" }, { request }],
    [Category.updateTransaction, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Move Transaction To Trash --//
export const MoveTransactionToTrashRequest: Sync = (
  { request, session, from_category_id, tx_id, user },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/moveTransactionToTrash",
    session,
    from_category_id,
    tx_id,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Category.moveTransactionToTrash, {
    owner_id: user,
    from_category_id,
    tx_id,
  }]),
});

export const MoveTransactionToTrashResponseSuccess: Sync = (
  { request, ok },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Category/moveTransactionToTrash" },
      { request },
    ],
    [Category.moveTransactionToTrash, {}, { ok }],
  ),
  then: actions([Requesting.respond, { request, ok }]),
});

export const MoveTransactionToTrashResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Category/moveTransactionToTrash" },
      { request },
    ],
    [Category.moveTransactionToTrash, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Delete Category --//
export const DeleteCategoryRequest: Sync = (
  { request, session, category_id, can_delete, user },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/delete",
    session,
    category_id,
    can_delete,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Category.delete, { owner_id: user, category_id, can_delete }]),
});

export const DeleteCategoryResponseSuccess: Sync = ({ request, ok }) => ({
  when: actions(
    [Requesting.request, { path: "/Category/delete" }, { request }],
    [Category.delete, {}, { ok }],
  ),
  then: actions([Requesting.respond, { request, ok }]),
});

export const DeleteCategoryResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Category/delete" }, { request }],
    [Category.delete, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * FIX: Modified to explicitly handle unauthorized sessions and return an error.
 * Added 'error' to the destructuring and the 'then' clause.
 */
export const GetCategoriesFromOwnerRequest: Sync = (
  { request, session, user, category_id, name, results, error }, // Added 'error' here
) => ({
  when: actions([Requesting.request, {
    path: "/Category/getCategoriesFromOwner",
    session,
  }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      // If no user is found for the session, it's an unauthorized request.
      // Return a frame with an 'error' binding.
      return new Frames({ ...originalFrame, [error]: "Unauthorized" });
    }

    // Assumes a query `_getCategoriesFromOwner(owner_id): (category_id, name)` exists.
    const categoryFrames = await frames.query( // Renamed 'frames' for clarity on query result
      Category.getCategoriesFromOwner,
      { owner_id: user },
      { category_id, name },
    );
    if (categoryFrames.length === 0) {
      // If the user is authorized but has no categories, return an empty list for 'results'.
      return new Frames({ ...originalFrame, [results]: [] });
    }

    return categoryFrames.collectAs([category_id, name], results);
  },
  then: actions([Requesting.respond, { request, results, error }]), // Ensure 'error' is passed to respond
});

//-- Get Metric --//
export const GetMetricRequest: Sync = (
  {
    request,
    session,
    user,
    category_id,
    startDate,
    endDate,
    period,
    metric,
    error,
  },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/getMetric",
    session,
    category_id,
    startDate, // Expects ISO date string
    endDate, // Expects ISO date string
  }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Unauthorized" });
    }

    const frame = frames[0];
    let periodObj;
    try {
      periodObj = Period.from(
        new Date(frame[startDate] as string),
        new Date(frame[endDate] as string),
      );
    } catch (e) {
      return new Frames({ ...originalFrame, [error]: "Invalid period dates" });
    }
    const framesWithPeriod = new Frames({ ...frame, [period]: periodObj });

    // Assumes a query `_getMetric(owner_id, category_id, period): (metric)` exists.
    const resultFrames = await framesWithPeriod.query(
      Category.getMetric,
      { owner_id: user, category_id, period },
      { metric },
    );

    if (resultFrames.length === 0) {
      // Concept query for a single metric might return empty frames if not found.
      // Respond with null as the metric value.
      return new Frames({ ...originalFrame, [metric]: null });
    }

    return resultFrames;
  },
  then: actions([Requesting.respond, { request, metric, error }]),
});
```

***

```typescript
// file: src\syncs\transaction.sync.ts
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
 * FIX: This synchronization's 'where' clause was already well-structured for differentiating
 * empty lists from errors. No changes are strictly necessary to fix the *differentiating*
 * aspect, as it already returns explicit error frames or empty result frames.
 *
 * It correctly:
 * 1. Checks for an unauthorized session and returns a frame with an 'error' binding.
 * 2. Checks for no unlabeled transactions and returns a frame with an empty 'results' array.
 * 3. Otherwise, collects and returns the actual transactions.
 */
export const GetUnlabeledTransactionsRequest: Sync = (
  {
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
  },
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
