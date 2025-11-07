---
timestamp: 'Fri Nov 07 2025 01:31:43 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_013143.cb3d7f45.md]]'
content_id: d6bb6bb30da1ff11199f19eadf8c8a5636ea60e658e6c1da6005c511ce66826b
---

# file: src\syncs\category.sync.ts

```typescript
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
export const GetCategoriesFromOwnerRequest: Sync = (
  { request, session, user, category_id, name, results },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/getCategoriesFromOwner",
    session,
  }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      // Invalid session, return empty list as there are no categories for a non-user.
      return new Frames({ ...originalFrame, [results]: [] });
    }

    // Assumes a query `_getCategoriesFromOwner(owner_id): (category_id, name)` exists.
    frames = await frames.query(
      Category.getCategoriesFromOwner,
      { owner_id: user },
      { category_id, name },
    );
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    return frames.collectAs([category_id, name], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

export const ListTransactionsRequest: Sync = (
  { request, session, user, category_id, tx_id, amount, tx_date, results },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/listTransactions",
    session,
    category_id,
  }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      // User is not authorized. We veto this sync; another sync will handle the error response.
      return new Frames();
    }

    // Query for the transactions in the specified category
    const transactionFrames = await frames.query(
      Category.listTransactions,
      { owner_id: user, category_id },
      { tx_id, amount, tx_date },
    );

    // If there are no transactions, we must still respond with an empty array.
    if (transactionFrames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    // Collect all found transactions into a 'results' array.
    return transactionFrames.collectAs([tx_id, amount, tx_date], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});

export const ListTransactionsUnauthorized: Sync = (
  { request, session, user, error },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/listTransactions",
    session,
  }, { request }]),
  where: async (frames) => {
    const userFrames = await frames.query(Sessioning._getUser, { session }, {
      user,
    });
    // This sync ONLY fires if the session is invalid.
    if (userFrames.length === 0) {
      return frames.map((f) => ({ ...f, [error]: "Unauthorized" }));
    }
    // Veto this sync if the session is valid.
    return new Frames();
  },
  then: actions([Requesting.respond, { request, error }]),
});

//-- Get Metric Stats --//
export const GetMetricStatsRequest: Sync = (
  { request, session, user, category_id, period, stats, error },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/getMetricStats", // 1. CORRECTED PATH
    session,
    category_id,
    period, // The request sends a 'period' object directly
  }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Unauthorized" });
    }

    // 2. CALL THE CORRECT QUERY
    // The `period` variable is already bound from the `when` clause.
    // The concept method `getMetricStats` accepts it directly.
    const resultFrames = await frames.query(
      Category.getMetricStats,
      { owner_id: user, category_id, period },
      { stats }, // 3. BIND THE OUTPUT TO 'stats'
    );

    if (resultFrames.length === 0) {
      // This is a safeguard. `getMetricStats` should always return at least
      // an array with the default zero-value stats object.
      return new Frames({ ...originalFrame, [stats]: [] });
    }

    return resultFrames;
  },
  then: actions([Requesting.respond, { request, stats, error }]),
});
export const GetMetricStatsUnauthorized: Sync = (
  { request, session, user, error },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/getMetricStats",
    session,
  }, { request }]),
  where: async (frames) => {
    const userFrames = await frames.query(Sessioning._getUser, { session }, {
      user,
    });
    if (userFrames.length === 0) {
      return frames.map((f) => ({ ...f, [error]: "Unauthorized" }));
    }
    return new Frames();
  },
  then: actions([Requesting.respond, { request, error }]),
});

```
