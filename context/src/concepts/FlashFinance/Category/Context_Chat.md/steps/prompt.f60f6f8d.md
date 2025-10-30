---
timestamp: 'Sat Oct 18 2025 17:42:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_174236.5ae2820c.md]]'
content_id: f60f6f8d0e839270def2906f04762686968040aec2043d031f0a68242259008f
---

# prompt:  Update `src/concepts/FlashFinance/Category/category.ts` to fully integrate **CategoryMetrics** into the Category concept without modifying any other files, especially not Label. Maintain strict concept independence—Category must not call or depend on Label. You should ensure two indexes are created: one unique compound index for categories on `(owner_id, name)` (case-sensitive, no archiving logic), and one unique compound index for metrics on `(owner_id, category_id, period_start, period_end)`. The state definitions (`CategoryDoc` and `CategoryMetricDoc`) should remain as they are. Each CategoryMetric should have `_id = "${owner}:${category}:${periodString}"` and fields `owner_id`, `category_id`, `period_start`, `period_end`, and `current_total`. Keep and use the existing helper methods `makeCategoryKey(owner_id, category_id)` and `makeCategoryMetricKey(owner_id, category_id, period)`, as well as the `Period` class for validating periods. Add the following **Category-level actions** related to metrics: 1.Implement `async setMetricTotal(owner_id: Id, category_id: Id, period: Period, total: number): Promise<{ ok: boolean }>` which requires that the category exists and that `total >= 0`. It should upsert a CategoryMetric for `(owner, category, period)` with `current_total = total` and return `{ ok: true }` on success. It must throw `"Metric update failed: Category not found."` if the category does not exist, and `"Metric update failed: total must be nonnegative."` if the total is negative. 2. Implement `async getMetric(owner_id: Id, category_id: Id, period: Period): Promise<CategoryMetricDoc | null>` to return the exact metric document or `null` if not found. 3. Implement `async listMetrics(owner_id: Id, category_id: Id): Promise<CategoryMetricDoc[]>` to return all metrics for the specified `(owner, category)` sorted by `period_start` ascending. 4. Implement `async deleteMetricsForCategory(owner_id: Id, category_id: Id): Promise<number>` to delete all metrics for `(owner, category)` and return the number deleted. This method should then be called inside the existing `delete` action instead of the inline `deleteMany`. Ensure `setMetricTotal` is **idempotent** for the same inputs, and validate the period by using the existing `Period` class (throw its validation error if violated). Do not add new fields, logs, or normalization behavior. Keep error messages exactly as specified. After implementing, the following behaviors must hold: creating a category and calling `setMetricTotal(owner, cat, period, 0)` succeeds and returns `current_total = 0` on retrieval; calling it again with a different total updates the metric; `listMetrics` returns metrics sorted by period start; and deleting a category with `delete(owner, cat, true)` removes both the category and its metrics via `deleteMetricsForCategory`.

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
