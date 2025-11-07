---
timestamp: 'Fri Nov 07 2025 00:40:51 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_004051.6cc86d92.md]]'
content_id: ce6cf7f28e318a0cab70b180d309a9b2c180f40f80ca307df30438b0063eafec
---

# response:

Of course. Based on the trace and the provided code, the synchronization isn't working because of a direct mismatch between the requested API path and the path defined in your synchronization.

Here is a step-by-step breakdown of the issue and how to resolve it.

### 1. The Core Problem: Path Mismatch

The trace log clearly shows the incoming request is for the path `/Category/getMetricStats`:

```
[Requesting] Received request for path: /Category/getMetricStats
Requesting.request {
  ...
  path: '/Category/getMetricStats' 
}
```

However, if we look at `src/syncs/category.sync.ts`, the synchronization you've written is listening for a different path, `/Category/getMetric`:

```typescript
// file: src/syncs/category.sync.ts

export const GetMetricRequest: Sync = (
  { ... }
) => ({
  when: actions([Requesting.request, {
    path: "/Category/getMetric", // <-- THIS IS THE MISMATCH
    session,
    category_id,
    startDate,
    endDate,
  }, { request }]),
  // ...
});
```

Because the path in the `when` clause (`/Category/getMetric`) does not match the path from the request (`/Category/getMetricStats`), the `GetMetricRequest` synchronization is never triggered. Since no other synchronization handles this path, the request sits unanswered until it eventually times out.

### 2. Secondary Problem: Incorrect Concept Method

Even if you corrected the path, the existing `GetMetricRequest` sync is designed to call the `Category.getMetric` method, not `Category.getMetricStats`.

Your concept `CategoryConcept.ts` has two distinct methods:

1. `getMetric`: Fetches a raw `CategoryMetricDoc`.
2. `getMetricStats`: Computes aggregate statistics like `total_amount`, `transaction_count`, etc.

The path `/Category/getMetricStats` strongly implies you want to call the `getMetricStats` method. The current sync is not configured to do this.

### Solution: Create a New Synchronization

The correct solution is to create a new synchronization specifically for the `/Category/getMetricStats` endpoint that calls the corresponding `Category.getMetricStats` concept method.

You can add the following synchronization to your `src/syncs/category.sync.ts` file. It's modeled after your existing `GetMetricRequest` but is corrected to handle the new path and call the correct query.

```typescript
// Add this new sync to src/syncs/category.sync.ts

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
```

### Summary of Changes in the New Sync

1. **Correct Path:** The `when` clause now correctly matches `path: "/Category/getMetricStats"`.
2. **Correct Parameters:** It expects a `period` object in the request body, which matches what your trace shows you are sending.
3. **Correct Query:** The `where` clause now calls `Category.getMetricStats`, which is the intended business logic.
4. **Correct Output:** It binds the result of the query to a new variable `stats` and includes that in the `Requesting.respond` action.

After adding this new synchronization, your server will correctly handle requests to `/Category/getMetricStats`, execute the aggregation logic, and return the result without timing out.
