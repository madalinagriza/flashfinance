---
timestamp: 'Fri Nov 07 2025 01:11:42 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_011142.adf86dfc.md]]'
content_id: 44b17152bb46ddbaba8bb3ca388403baa3042b86090ef43f03d30145e827560c
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

//-- Get Categories From Owner --//
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
      return new Frames({ ...originalFrame, [results]: [] });
    }

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

//-- [NEW] List Transactions in a Category --//
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
    startDate,
    endDate,
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

    const resultFrames = await framesWithPeriod.query(
      Category.getMetric,
      { owner_id: user, category_id, period },
      { metric },
    );

    if (resultFrames.length === 0) {
      return new Frames({ ...originalFrame, [metric]: null });
    }

    return resultFrames;
  },
  then: actions([Requesting.respond, { request, metric, error }]),
});

//-- [FIXED] Get Metric Stats --//
export const GetMetricStatsRequest: Sync = (
  { request, session, user, category_id, period, stats },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/getMetricStats", // 1. CORRECTED PATH
    session,
    category_id,
    period, // The request sends a 'period' object directly
  }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    if (frames.length === 0) {
      // Veto this sync, the Unauthorized one will handle it.
      return new Frames();
    }
    
    // 2. CALL THE CORRECT QUERY
    // The `period` variable is already bound from the `when` clause.
    const resultFrames = await frames.query(
      Category.getMetricStats,
      { owner_id: user, category_id, period },
      { stats }, // 3. BIND THE OUTPUT TO 'stats'
    );

    // Safeguard: getMetricStats should always return one frame with the stats object.
    if (resultFrames.length === 0) {
        // This case shouldn't happen, but if it does, respond with default stats.
        const originalFrame = frames[0];
        const defaultStats = { total_amount: 0, transaction_count: 0, average_per_day: 0, days: 0 };
        return new Frames({...originalFrame, [stats]: [defaultStats] });
    }
    
    // The result 'stats' is an array with one object. We want to return just the object.
    return resultFrames.map(frame => {
        const statsArray = frame[stats] as any[];
        return {...frame, [stats]: statsArray[0]};
    });
  },
  then: actions([Requesting.respond, { request, stats }]), // 4. Only respond with success variables
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
