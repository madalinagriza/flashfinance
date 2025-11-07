---
timestamp: 'Fri Nov 07 2025 11:59:28 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_115928.c633506d.md]]'
content_id: 3b984d7f9da21272abaaa93f43a2925b3e71499b2fc77c7676503ffeb0b36a64
---

# response:

An API request to `/Label/update` is timing out. Let's trace the cause and implement a solution.

### Problem Analysis

The log shows the following sequence of events:

1. An HTTP request arrives at the server for the path `/Label/update`.
2. The `Requesting` concept correctly translates this into a `Requesting.request` action.
3. The engine then waits for a `Requesting.respond` action with the corresponding `request` ID.
4. After 10,000ms, the request times out because no `Requesting.respond` action was ever fired.

This timeout occurs because there are no synchronizations defined that listen for a `Requesting.request` action with `path: "/Label/update"`. When the request action is fired, no sync matches it, no subsequent actions are triggered, and therefore no response is ever sent back to the client.

Furthermore, updating a transaction's label is a complex operation that must coordinate state changes across two different concepts:

1. **`LabelConcept`**: It stores the direct mapping between a transaction and its assigned category. Its `update` action must be called to change this mapping.
2. **`CategoryConcept`**: It stores the aggregated financial metrics for each category. When a transaction's category changes, its value must be removed from the old category's metrics and added to the new one. The `updateTransaction` action handles this.

The solution is to create a new set of synchronizations in `src/syncs/label.sync.ts` to handle the `/Label/update` endpoint, orchestrate the necessary actions in both concepts, and manage success and error responses.

### Solution

We will add a comprehensive set of synchronizations to `src/syncs/label.sync.ts` to handle the entire lifecycle of an update request. This includes a primary request handler, success and error responders, and specific handlers for "unauthorized" and "not found" edge cases.
