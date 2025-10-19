---
timestamp: 'Sat Oct 18 2025 18:29:04 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_182904.9e1b93e2.md]]'
content_id: c148b9da338785a5f02f39a9c3ba670e566c34b306efe3efca1017291b4d45f2
---

# prompt: Implement new test cases in `src/concepts/FlashFinance/Category/test-actions/test-op-simple.ts` to verify the functionality of the **CategoryMetrics** actions integrated into the `CategoryStore`. Follow the existing test structure, imports, and assertion style. Your tests should demonstrate the following behaviors clearly and minimally: (1) creating a category and calling `setMetricTotal(owner, category, period, 0)` succeeds and allows retrieving the metric with `getMetric`, returning `current_total = 0`; (2) calling `setMetricTotal` again with a new total updates the same metric rather than creating a duplicate; (3) `listMetrics(owner, category)` returns all metrics sorted by `period_start` ascending; and (4) deleting a category with `delete(owner, category, true)` removes both the category and all metrics associated with it. The test should use the `Period` class for defining valid periods and confirm that attempts to set a negative total throw `"Metric update failed: total must be nonnegative."`, and that setting a metric for a nonexistent category throws `"Metric update failed: Category not found."`. Do not modify other files or add unrelated assertions—focus purely on CategoryMetrics behavior and its correct integration with category lifecycle.

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
