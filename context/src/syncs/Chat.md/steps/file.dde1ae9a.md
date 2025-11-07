---
timestamp: 'Fri Nov 07 2025 02:55:09 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_025509.2e9d1ec6.md]]'
content_id: dde1ae9a635a6996ba0a7b16627f4304c9a98a50bc8a2b21021250386683bc49
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
  { request, session, category_id, user },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/delete",
    session,
    category_id,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Category.delete, { owner_id: user, category_id }]),
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
//-- Get Metric Stats --//
export const GetMetricStatsRequest: Sync = (
  { request, session, user, category_id, period, stats },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/getMetricStats",
    session,
    category_id,
    period,
  }, { request }]),
  where: async (frames) => {
    // 1. Authorize the user
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      // Veto this sync if unauthorized. The Unauthorized sync will handle the response.
      return new Frames();
    }

    // 2. Execute the query. The concept returns an array with a single stats object.
    // The query result (the whole object) is bound to the 'stats' variable.
    // Since the concept returns [{...}], the engine binds the object itself to `stats`.
    return await frames.query(
      Category.getMetricStats,
      { owner_id: user, category_id, period },
      { stats }, // This now expects the concept to return [{ stats: ... }]
    );
  },
  then: actions([Requesting.respond, { request, stats }]), // Respond with the bound stats object
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
