---
timestamp: 'Fri Nov 07 2025 01:39:48 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_013948.654d8a33.md]]'
content_id: 777f27cc177114f1f20ae473766120e57047abbe0805c7b06e12475b58edc0f4
---

# response:

Excellent investigation. You've correctly identified the core issue and the symptom: the request for `/Category/getMetricStats` runs the underlying concept query successfully but then fails before responding, leading to a timeout. The error message `Missing binding: Symbol(stats) in frame` is the smoking gun.

### Why It's Happening: A Data Shape Mismatch

The problem is a classic mismatch between what a data provider (the `Category.getMetricStats` query) returns and what a data consumer (the `GetMetricStatsRequest` synchronization) expects.

1. **What the Sync Expects:**
   Your `GetMetricStatsRequest` sync's `where` clause has this line:
   ```typescript
   frames.query(
     Category.getMetricStats,
     { /* inputs */ },
     { stats } // <-- This is shorthand for { stats: stats }
   )
   ```
   This tells the synchronization engine: "Execute the query, and from each result object, find the key named `stats`. Take the value of that key and bind it to a variable named `stats` in our frame."

2. **What the Concept Actually Provides:**
   Your log shows that the `Category.getMetricStats` query returns the following structure:
   ```json
   [
     {
       "total_amount": 0,
       "transaction_count": 0,
       "average_per_day": 0,
       "days": 366
     }
   ]
   ```
   As you can see, the object inside the array **does not have a `stats` key**. It has keys like `total_amount`, `transaction_count`, etc.

Because the engine cannot find the `stats` key it was told to look for, it cannot create the binding. When the `then` clause is reached and tries to use the `stats` variable to respond, the variable doesn't exist in the frame, causing the "Missing binding" error and preventing a response from being sent.

### The Solution

The most robust solution is to fix this mismatch. While one could argue for changing the concept's return value, the prompt is to rework the sync. We will adjust the `GetMetricStatsRequest` synchronization to correctly handle the data it receives.

The key change is in the `where` clause. Instead of trying to bind to a non-existent `stats` key, we will now correctly call the query and bind its output to the `stats` variable. The existing `GetMetricStatsRequest` sync combines request, authorization, query, and response logic into one unit, which is a valid pattern. We will refine it to work correctly.

Here is the corrected version of the `GetMetricStatsRequest` synchronization.
