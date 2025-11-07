---
timestamp: 'Fri Nov 07 2025 00:30:40 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_003040.bb2e11cb.md]]'
content_id: a18fbb098826d6c94ec78ffe2fc709deff33d474e95a7d481f0d6747ad706b93
---

# response:

The synchronization `GetMetricRequest` is not working for the `/Category/getMetricStats` path for two main reasons, which lead to the request timing out:

1. **Path Mismatch in `when` clause:**
   The incoming request has the `path: "/Category/getMetricStats"`. However, the `when` clause of your `GetMetricRequest` synchronization is explicitly looking for `path: "/Category/getMetric"`.
   Because the path pattern in the `when` clause does not match the actual incoming request path, this specific synchronization never fires for the `getMetricStats` request. Consequently, no `then` action (specifically, `Requesting.respond`) is ever triggered for that request, causing it to eventually time out.

2. **Incorrect Concept Action Called in `where` clause:**
   Even if the `when` clause were to match, the `where` clause is attempting to call `Category.getMetric` (which is likely intended for retrieving a raw metric document by a specific period key), instead of `Category.getMetricStats` (which is designed to compute aggregate statistics). This means it would be performing the wrong operation entirely.

**To fix this, you need to modify your synchronization as follows:**

* **Rename the sync** to reflect its actual purpose (`GetMetricStatsRequest`).
* **Update the `path` in the `when` clause** to match `"/Category/getMetricStats"`.
* **Update the `Category` action in the `where` clause** from `Category.getMetric` to `Category.getMetricStats`.
* **Adjust the `then` clause's parameters** to correctly reflect the output of `Category.getMetricStats`. The `Category.getMetricStats` method returns an array of `MetricStats` objects (in your concept, it currently returns a single-element array if successful, or a default array). The sync should ensure `metric` is correctly bound to this resulting object for the `Requesting.respond` action.

Here's the corrected `GetMetricStatsRequest` synchronization:

```typescript
import { actions, Frames, Sync } from "@engine";
import { Category, Requesting, Sessioning } from "@concepts";
import { Period } from "../concepts/Category/CategoryConcept.ts";

//-- Get Metric Stats --//
export const GetMetricStatsRequest: Sync = ( // Renamed for clarity
  {
    request,
    session,
    user,
    category_id,
    startDate,
    endDate,
    period,
    metric, // This will now bind to the MetricStats object
    error,
  },
) => ({
  when: actions([Requesting.request, {
    // Corrected path to match the incoming request
    path: "/Category/getMetricStats",
    session,
    category_id,
    startDate, // Expects ISO date string
    endDate, // Expects ISO date string
  }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0]; // Capture the original frame for responding
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      // Invalid session, respond with Unauthorized error
      return new Frames({ ...originalFrame, [error]: "Unauthorized" });
    }

    const frame = frames[0]; // Assuming only one user per session for this request
    let periodObj: Period;
    try {
      // Parse startDate and endDate from the request and create a Period object
      periodObj = Period.from(
        new Date(frame[startDate] as string),
        new Date(frame[endDate] as string),
      );
    } catch (e) {
      // Respond with an error if dates are invalid
      return new Frames({ ...originalFrame, [error]: "Invalid period dates" });
    }

    // Bind the created Period object to the frame for the query
    const framesWithPeriod = new Frames({ ...frame, [period]: periodObj });

    // Corrected to call Category.getMetricStats
    // Category.getMetricStats returns MetricStats[] (an array of metric objects).
    // The `query` helper will create new frames for each element in the array if there are multiple.
    // Given the concept's `getMetricStats` returns a single-element array when successful,
    // this will result in one frame with `metric` bound to the stats object.
    const resultFrames = await framesWithPeriod.query(
      Category.getMetricStats, // Corrected concept action
      { owner_id: user, category_id, period },
      { metric }, // This will bind the single MetricStats object to the `metric` variable
    );

    // According to CategoryConcept.ts, getMetricStats always returns at least one default
    // stats object, so resultFrames.length should not be 0 here if previous steps succeeded.
    if (resultFrames.length === 0) {
      // Defensive check, return a default metric if for some reason the concept returned empty.
      return new Frames({ ...originalFrame, [metric]: {
        total_amount: 0,
        transaction_count: 0,
        average_per_day: 0,
        days: 0,
      } });
    }

    // Merge the metric from the resultFrames back into the original frame for response.
    // This ensures other original request bindings (like 'request') are preserved.
    return new Frames({
        ...originalFrame,
        [metric]: resultFrames[0][metric], // Extract the actual metric object
        [error]: undefined // Ensure no error is returned on success
    });
  },
  // Respond with the request ID, the calculated metric stats, and any error
  then: actions([Requesting.respond, { request, metric, error }]),
});
```

By making these changes, your `GetMetricStatsRequest` synchronization will correctly `when` on the incoming request, perform the correct `where` queries using the `Category.getMetricStats` concept action, and then `then` respond to the request, resolving the timeout issue.
