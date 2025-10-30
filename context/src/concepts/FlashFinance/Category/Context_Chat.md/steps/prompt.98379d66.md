---
timestamp: 'Sat Oct 18 2025 19:40:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_194018.558b9218.md]]'
content_id: 98379d669d2dd22de5439bd9625f41616e8d381b3bda672601b12ceb1fb912fc
---

# prompt: Implement one new `Deno.test` in `src/concepts/FlashFinance/Category/test-actions/test-non-popular.ts` that verifies the standalone maintenance behavior of `deleteMetricsForCategory`. Follow the existing imports/assertion style and use only public `CategoryStore` methods plus `Period`. The test should: create one owner and one category, call `setMetricTotal` three times for **three distinct Periods** for that category, assert via `listMetrics` that 3 metrics exist, then call `deleteMetricsForCategory(owner, category)` and assert it returns `3` and that `listMetrics(owner, category)` is now empty. Keep it minimal (≤5 assertions), no direct DB access, no extra logging, and do not touch unrelated behaviors (no delete of the category itself, no renames, no cross-owner checks).

**concept:** Category\[ID, Period]

**purpose:** allow users to define and manage meaningful groupings of their transactions

**principle:** categories are user-defined and reusable; if a user creates categories and later renames or deletes one, then names remain unique per user; deletion is blocked while referenced by labels.

**state:**

> a set of Categories with
>
> > a name String
> > a category\_id ID\
> > an owner\_id ID

> a set of CategoryMetrics with
>
> > an owner\_id ID\
> > a category\_id ID\
> > a period Period
> > a current\_total Number

**actions:**

> create(owner\_id: ID, name: String): (category\_id: ID)
>
> > *requires:*\
> > user owner\_id exists; for the same owner\_id, no existing category with same name\
> > *effects:*\
> > generated a new category\_id; creates and stores a category under owner\_id associated with name; returns it

> rename(owner\_id: ID, category: Category, new\_name: String): (category\_id: ID)
>
> > *requires:*\
> > category exists and category.owner\_id = owner\_id; for the same owner\_id, no existing category with same new\_name\
> > *effects:*\
> > updates category.name to new\_name; returns updated category

> delete(owner\_id: ID, category: Category, can\_delete : Boolean): (ok: Boolean)
>
> > *requires:*\
> > category exists and category.owner\_id = owner\_id  \
> > can\_delete = true (only called by the sync which gets result from label's)
> > *effects:*\
> > removes the category (and its CategoryMetrics) and returns true; otherwise leaves state unchanged and returns false

> set\_metric\_total(owner\_id: ID, category\_id: ID, period: Period, total: Number)
>
> > *requires:* owner and category exist; total ≥ 0\
> > *effects:* creates or updates the metric for (owner, category, period) with current\_total = total

**invariants:**

* (owner\_id, name) is unique among Categories
* category\_id is unique for the same user
* categories cannot belong to multiple users
* (owner\_id, category\_id, period) uniquely identifies a CategoryMetric
* CategoryMetric.current\_total is nonnegative
