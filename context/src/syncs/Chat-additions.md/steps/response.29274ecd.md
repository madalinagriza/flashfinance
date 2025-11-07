---
timestamp: 'Fri Nov 07 2025 03:16:32 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_031632.2e70c266.md]]'
content_id: 29274ecddcfd0e9b982ab867092ab247ffc0006dbcf85dd4e7a32391ecbcca5d
---

# response:

You are absolutely right to ask this, and it hits on a crucial and subtle point about how the synchronization engine works. Your understanding is correct: **getters (queries) must always return a list (an array)**.

The solution I provided still adheres to this rule, but it corrects the *structure of the objects inside that list*. Let's break down the distinction, because it's the root cause of the bug.

### The Core Distinction: An Array of *Documents* vs. an Array of *Bindings*

The documentation states: "queries MUST return an **array** of the type specified by the return signature."

The subtle part is what the sync engine's `.query()` method does with that array and how it relates to the output pattern you provide.

Let's look at the `FinalizeWithLabels` sync:

```typescript
// The sync `where` clause
const stagedLabelFrames = await userFrames.query(
  Label.getStagedLabels, // The concept query
  { user_id: user },     // The input pattern
  { stagedLabel }        // The output pattern
);
```

The output pattern `{ stagedLabel }` is shorthand for `{ stagedLabel: stagedLabel }`. It tells the sync engine:

1. "For each object in the array returned by `Label.getStagedLabels`..."
2. "...look for a property named **`stagedLabel`** (the left-hand side key)."
3. "Take the value of that property and bind it to the **`stagedLabel`** variable (the right-hand side symbol) in a new frame."

***

#### What Was Happening Before (The Bug)

* `Label.getStagedLabels` returned: `Promise<StagedLabelDoc[]>`
  * The actual array looked like: `[ { _id: '...', tx_id: '...' }, { _id: '...', tx_id: '...' } ]`
* The sync engine received this array and tried to apply the output pattern `{ stagedLabel }`.
* It looked at the first object ` { _id: '...', tx_id: '...' }`.
* It asked: "Does this object have a property named `stagedLabel`?"
* The answer was **no**. The object has properties `_id`, `tx_id`, etc., but not `stagedLabel`.
* Therefore, the binding failed. The `stagedLabel` variable was `undefined` in the frame, which is exactly what your log showed: `"[Label.sync] FinalizeWithLabels: missing staged label binding"`.

#### What Happens Now (The Fix)

* `Label.getStagedLabels` now returns: `Promise<{ stagedLabel: StagedLabelDoc }[]>`
  * The actual array now looks like: `[ { stagedLabel: { _id: '...', tx_id: '...' } }, { stagedLabel: { _id: '...', tx_id: '...' } } ]`
* The sync engine receives this array and applies the same output pattern `{ stagedLabel }`.
* It looks at the first object `{ stagedLabel: { ... } }`.
* It asks: "Does this object have a property named `stagedLabel`?"
* The answer is **yes**.
* It takes the value of that property (which is the actual `StagedLabelDoc` object) and successfully binds it to the `stagedLabel` variable in the frame.

### Summary and Rule of Thumb

You are correct that the query must return an **array**. The critical rule is:

> The structure of the objects *inside* the returned array must match the keys of the output pattern in your `.query()` call.

* If your output pattern is `{ user, name }`, the query must return `[{ user: '...', name: '...' }, ...]`.
* If your output pattern is `{ txInfo }`, the query must return `[{ txInfo: { ... } }, ...]`.
* If your output pattern is `{ stagedLabel }`, the query must return `[{ stagedLabel: { ... } }, ...]`.

The fixes I provided make the concept queries return arrays with the correct internal structure, allowing the sync engine to perform its bindings correctly. This resolves the "missing binding" error and allows the rest of the `where` clause to execute, ultimately preventing the timeout.
