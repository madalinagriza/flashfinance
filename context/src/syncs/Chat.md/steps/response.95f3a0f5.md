---
timestamp: 'Fri Nov 07 2025 03:35:43 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_033543.439a3798.md]]'
content_id: 95f3a0f562eecfa47e99debd5c6ea13458e8d0ff3ed0081686771ca637101678
---

# response:

Of course. Let's analyze the trace and the code to figure out what's happening with the `finalize` request.

### Analysis of the Problem

Based on the trace you provided, here's a step-by-step breakdown of the issue:

1. **Request Received:** The `/Label/finalize` request is received, and the `FinalizeWithLabels` synchronization begins execution.
2. **Staged Labels Fetched:** The `where` clause successfully calls `Label.getStagedLabelsInternal` and retrieves 3 staged label documents from the database. This is confirmed by the log `fetched staged labels { count: 3, ... }`.
3. **Core Error:** Immediately after, the log shows `[Label.sync] FinalizeWithLabels: missing staged label binding` three times, once for each label it fetched.
4. **Root Cause:** This error message comes from the line `const sl = frame[stagedLabel] as ...` inside your `for...of` loop. The fact that this check fails means that `frame[stagedLabel]` is `undefined`.
5. **Why it's `undefined`:** The problem lies in the interaction between the sync engine's `.query()` method and the return value of the concept query you're calling.
   * The output pattern `{ stagedLabel }` tells the engine: "For each item in the array returned by the query, bind that item to the `stagedLabel` variable in a new frame."
   * However, for this to work, the query itself must return an array of objects where each object has a `stagedLabel` key, like this: `[{ stagedLabel: doc1 }, { stagedLabel: doc2 }, ...]`.
   * Your `Label.getStagedLabelsInternal` method returns the raw documents directly: `[doc1, doc2, ...]`.
   * The engine looks for a `stagedLabel` property on `doc1`, doesn't find it, and correctly binds `undefined` to the `stagedLabel` variable.

You correctly identified this pattern when creating `Transaction.getTxInfoInternal`, which wraps its result. However, `Label.getStagedLabelsInternal` does not. Fortunately, you already have a method in `LabelConcept` that **does** return the correctly wrapped format: `getStagedLabels`.

### The Solution

The fix is to change the `FinalizeWithLabels` sync to call `Label.getStagedLabels` instead of `Label.getStagedLabelsInternal`. This will provide the `where` clause with correctly formatted frames that include the `stagedLabel` binding.

Here is the corrected code for `src/syncs/label.sync.ts`.
