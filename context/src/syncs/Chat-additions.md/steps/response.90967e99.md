---
timestamp: 'Fri Nov 07 2025 00:28:37 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_002837.57e35bd6.md]]'
content_id: 90967e99830ddfe27f1d3083e6b65e5303933e2508d5f0d181d33f220f22f7dc
---

# response:

Without an explicit trace, I'll analyze the provided `GetMetricRequest` synchronization and `CategoryConcept` to identify potential reasons why the sync might not be working as expected.

Let's break down the sync and the concept method it calls:

## `src\syncs\category.sync.ts` - `GetMetricRequest` Sync

```typescript
export const GetMetricRequest: Sync = (
  {
    request,
    session,
    user,
    category_id,
    startDate,
    endDate,
    period, // Variable for the Period object
    metric, // Variable for the metric result
    error, // Variable for errors
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

    // This is the call in question:
    const resultFrames = await framesWithPeriod.query(
      Category.getMetric, // <--- Calls Category.getMetric
      { owner_id: user, category_id, period },
      { metric }, // <--- Expects a 'metric' property in the result
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

## `src\concepts\Category\CategoryConcept.ts` - `getMetric` and `getMetricStats` methods

Here are the two relevant methods in `CategoryConcept`:

### `getMetric`

```typescript
  /**
   * Retrieves a specific CategoryMetric document.
   * Returns the document or null if not found.
   */
  async getMetric(
    owner_id: Id,
    category_id: Id,
    period: Period,
  ): Promise<CategoryMetricDoc[]>;
  // ... (overloads)
  async getMetric(
    a: Id | { owner_id: string; category_id: string; period: Period },
    b?: Id,
    c?: Period,
  ): Promise<CategoryMetricDoc[]> {
    // ...
    const doc = await this.categoryMetrics.findOne({ _id: metric_id });
    return doc ? [doc] : []; // Returns an array of CategoryMetricDoc
  }
```

### `getMetricStats`

```typescript
  /**
   * Computes aggregate statistics for metric transactions within a period.
   */
  async getMetricStats(
    owner_id: Id,
    category_id: Id,
    period: Period,
  ): Promise<MetricStats[]>;
  // ... (overloads)
  async getMetricStats(
    a: // ... (arguments)
  ): Promise<MetricStats[]> {
    // ... logic to calculate stats ...
    return [{ total_amount, transaction_count, average_per_day, days }]; // Returns an array of MetricStats
  }
```

And `MetricStats` is defined as:

```typescript
type MetricStats = {
  total_amount: number;
  transaction_count: number;
  average_per_day: number;
  days: number;
};
```

***

## Why the Sync Might Not Be Working

The most significant issue I see is a **mismatch between the concept method called and the expected output structure in the sync's `where` clause.**

1. **Sync calls `Category.getMetric`:**
   The line `await framesWithPeriod.query(Category.getMetric, ...)` explicitly calls `Category.getMetric`.

2. **`Category.getMetric` returns `CategoryMetricDoc[]`:**
   This method returns an array of raw `CategoryMetricDoc` objects. A `CategoryMetricDoc` looks like:
   ```typescript
   type CategoryMetricDoc = {
     _id: string;
     owner_id: string;
     category_id: string;
     transactions: CategoryMetricEntry[];
     updated_at: Date;
   };
   ```

3. **Sync's output pattern ` { metric }`:**
   The `frames.query` call has an output pattern `{ metric }`. This tells the engine to look for a property named `metric` in the objects returned by `Category.getMetric` and bind its value to the `metric` symbol in the frames.

4. **The Mismatch:**
   `CategoryMetricDoc` **does not have a property named `metric`**. Therefore, when `Category.getMetric` returns a `CategoryMetricDoc` object, the output pattern `{ metric }` will fail to find a `metric` property to bind. This will result in the `metric` variable in the `frames` being `undefined` (or not bound at all), leading to an incorrect or empty response.

It seems like the intention of the `GetMetricRequest` sync is to retrieve *aggregate statistics* (like `total_amount`, `transaction_count`, etc.), which is precisely what `Category.getMetricStats` provides. The name `metric` in the sync also strongly suggests an aggregate value rather than the raw `CategoryMetricDoc`.

***

## Proposed Solution

You should be calling `Category.getMetricStats` and then collecting its individual properties into a single `metric` object.

Here's the corrected `where` clause:

```typescript
// in src/syncs/category.sync.ts

// ... (other parts of the sync) ...

export const GetMetricRequest: Sync = (
  {
    request,
    session,
    user,
    category_id,
    startDate,
    endDate,
    period,
    metric, // This will now represent the MetricStats object
    error,
    // Add variables for individual stats if you want to capture them first
    total_amount, transaction_count, average_per_day, days
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

    // 1. Call getMetricStats instead of getMetric
    // 2. Map the output properties of MetricStats to temporary variables
    let statsFrames = await framesWithPeriod.query(
      Category.getMetricStats, // <--- Corrected: call getMetricStats
      { owner_id: user, category_id, period },
      { total_amount, transaction_count, average_per_day, days }, // <--- Bind individual stats
    );

    // Category.getMetricStats guarantees returning at least one MetricStats object
    // (with zeroes if no transactions), so statsFrames should not be empty.
    // However, if the query itself failed or an underlying doc wasn't found, it might.
    if (statsFrames.length === 0) {
        // This case should ideally not be hit if getMetricStats works as expected and creates a default.
        // But if there's an earlier error not thrown, it's a fallback.
        return new Frames({ ...originalFrame, [metric]: null });
    }

    // Collect the individual stats into a single 'metric' object for the response
    return statsFrames.collectAs(
      [total_amount, transaction_count, average_per_day, days],
      metric,
    );
  },
  then: actions([Requesting.respond, { request, metric, error }]),
});
```

**Explanation of Changes:**

1. **`Category.getMetricStats` called:** This is the method designed to return aggregate statistics.
2. **Output Pattern Adjusted:** Instead of `{ metric }` which doesn't exist in the concept's return type, we bind the individual fields that `MetricStats` provides (`total_amount`, `transaction_count`, etc.) to new variables in the frame.
3. **`collectAs` used:** The `collectAs` helper is then used to group these individual statistic variables into a single object named `metric` within the frame. This ensures the `then` clause receives `metric` as a single object containing all the calculated statistics.
4. **`frames.length === 0` handling:** The original `getMetricStats` method, as implemented, already ensures that if a metric document exists (or is created), it will return at least `[{ total_amount: 0, ...}]` if no relevant transactions are found within the period. So `statsFrames.length` should ideally *not* be `0` if the `Category.getMetricStats` call itself succeeds. The fallback to `[metric]: null` is still a good safeguard for unexpected situations.

By making this change, the `GetMetricRequest` sync will correctly query for the aggregate statistics and format them into a single `metric` object for the response.
