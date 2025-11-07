---
timestamp: 'Fri Nov 07 2025 01:33:26 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_013326.67d2a9a6.md]]'
content_id: 46043e1dee0a90349af8d0f327e826790a3d8e42951130b7403a57f9777ebcf8
---

# response:

Based on the logs you've provided, you've correctly diagnosed that `getMetricStats` is the source of the problem. The request is received, the `Category.getMetricStats` action runs successfully and returns data, but the process fails right before sending the final response.

Let's break down why this is happening.

### The Problem: Mismatched Data Shape

The error message `Missing binding: Symbol(stats) in frame` is the key clue. It means that when the synchronization engine tried to execute the `then` clause of your `GetMetricStatsRequest` sync, it couldn't find the `stats` variable it needed.

1. **The Synchronization's Expectation (`category.sync.ts`)**:
   In `GetMetricStatsRequest`, the `where` clause makes this call:
   ```typescript
   const resultFrames = await frames.query(
     Category.getMetricStats,
     { owner_id: user, category_id, period },
     { stats }, // <-- This is the output pattern
   );
   ```
   This tells the sync engine: "Call the `getMetricStats` query, and from each object in the returned array, find a property named `stats`. Bind the value of that property to a new variable in my frame, also called `stats`."

2. **The Concept's Reality (`CategoryConcept.ts`)**:
   Your `getMetricStats` method in `CategoryConcept.ts` returns a value that looks like this:
   ```typescript
   // Example from your log
   => [
     {
       total_amount: 0,
       transaction_count: 0,
       average_per_day: 0,
       days: 366
     }
   ]
   ```
   This is an array of `MetricStats` objects. Notice that there is no top-level `stats` property inside the objects. The properties are `total_amount`, `transaction_count`, etc.

Because the synchronization engine cannot find the `stats` property it's looking for in the returned data, it never binds the `stats` variable to the frame. When the `then` clause tries to use `stats` to build the response, the program crashes.

### The Solution

The solution is to modify the `CategoryConcept.getMetricStats` method to return data in the shape that the synchronization expects. According to the framework's rules, a query method's return value must be an array of objects, where each object has keys that match the output variable names used in `frames.query`.

We need to wrap the `MetricStats` object inside another object with a `stats` key.
