---
timestamp: 'Thu Nov 06 2025 10:01:26 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_100126.e1ae7acd.md]]'
content_id: 2364978ab513ccca71951b00ddc16701953cdabd400eea1971d2b960f6c76f82
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

//-- Get Metric Stats --//
/**
 * Handles requests to get aggregate metric statistics for a category within a specified period.
 *
 * @param request The ID of the incoming request.
 * @param session The user's session ID for authentication.
 * @param user The ID of the authenticated user (bound during `where` clause).
 * @param category_id The ID of the category for which to retrieve stats.
 * @param startDate The start date of the period (ISO string).
 * @param endDate The end date of the period (ISO string).
 * @param metricStats The aggregated metric statistics (total_amount, transaction_count, average_per_day, days).
 * @param error Any error message if the request fails.
 */
export const GetMetricStatsRequest: Sync = (
  {
    request,
    session,
    user,
    category_id,
    startDate, // Expects ISO date string
    endDate, // Expects ISO date string
    metricStats, // Variable to hold the results from getMetricStats
    error,
  },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/getMetricStats", // New path for this specific metric
    session,
    category_id,
    startDate,
    endDate,
  }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0]; // Preserve original request details for the response

    // 1. Authenticate user
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Unauthorized" });
    }

    const authenticatedFrame = frames[0]; // Sessioning._getUser returns at most one user or empty

    // 2. Parse and validate period dates
    let periodObj: Period;
    try {
      const start = authenticatedFrame[startDate] as string;
      const end = authenticatedFrame[endDate] as string;
      periodObj = Period.from(new Date(start), new Date(end));
    } catch (e) {
      return new Frames({
        ...originalFrame,
        [error]: "Invalid period dates: " + (e as Error).message,
      });
    }

    // 3. Query Category.getMetricStats
    // The query expects owner_id, category_id, and a Period object.
    // It returns an array of objects matching { total_amount, transaction_count, average_per_day, days }.
    // Even if no transactions match, Category.getMetricStats returns a single object with zero values and calculated days.
    const metricResultFrames = await new Frames(authenticatedFrame)
      .query(
        Category.getMetricStats,
        {
          owner_id: authenticatedFrame[user],
          category_id: authenticatedFrame[category_id],
          period: periodObj, // Pass the constructed Period object
        },
        // Output pattern: bind properties of the returned object to variables in new frames.
        // `query` will create a new frame for each element in the array returned by `getMetricStats`.
        // Since `getMetricStats` returns one aggregate result, `metricResultFrames` will contain one frame.
        {
          total_amount: "total_amount",
          transaction_count: "transaction_count",
          average_per_day: "average_per_day",
          days: "days",
        },
      );

    // Transform these result frames into the desired `metricStats` array for the response.
    // `metricStats` will be an array containing the single aggregate metric object.
    const finalMetricStats = metricResultFrames.map((f) => ({
      total_amount: f["total_amount"],
      transaction_count: f["transaction_count"],
      average_per_day: f["average_per_day"],
      days: f["days"],
    }));

    // Construct the final frames for the `then` clause.
    // This combines the original request details with the `metricStats` array.
    const finalFrames = new Frames({
      ...originalFrame,
      [metricStats]: finalMetricStats, // Bind the array of metric stats to the `metricStats` variable
    });

    return finalFrames;
  },
  then: actions([Requesting.respond, { request, metricStats, error }]),
});

```
