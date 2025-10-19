---
timestamp: 'Sat Oct 18 2025 19:34:16 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_193416.86444058.md]]'
content_id: 51a194385962560ce44e9c7f04cddcf3f53e0a540131e6e52b6ea51ac058e9fb
---

# prompt: Implement one new `Deno.test` in `src/concepts/FlashFinance/Category/test-actions/test-non-popular.ts` that verifies **cross-owner isolation** between categories and metrics. Follow the existing imports/assertion style and use only public `CategoryStore` methods plus `Period`. Keep the test minimal (≤5 assertions) and provide exactly one proof pattern: create **two owners**, create a category **with the same name** for each owner, call `setMetricTotal` **only for owner A’s category** for a given `Period`, then assert that `(1)` `getMetric(ownerA, catA, period)` returns the expected `current_total`, and `(2)` `getMetric(ownerB, catB, period)` returns `null` (or alternatively `listMetrics(ownerB, catB)` is empty). Do not access the DB directly, do not add extra logging, and do not test unrelated behaviors (no deletes, renames, or sorting).

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
