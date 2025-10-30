---
timestamp: 'Sat Oct 18 2025 19:13:02 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_191302.5f6b4722.md]]'
content_id: ac50500ab153ac2b460bfded18e28364daeb2097bcd62d82a6e01a218438799a
---

# prompt: Implement a testcase that verifies **renaming a category does not affect its existing metrics**. Use `src/concepts/FlashFinance/Category/test-actions/test-op-simple.ts` for structure, imports, and assertion style, but add this as a new `Deno.test` in the Category tests (a separate block). The test should: (1) create a category for an owner, (2) set two metrics for different `Period`s via `setMetricTotal`, (3) rename the category using `rename`, then (4) confirm both metrics are still retrievable with the same totals via `getMetric`, and `listMetrics` still returns both in ascending order by `period_start`. Do not access collections directly or add unrelated assertions. Use only public methods on `CategoryStore` (`create`, `rename`, `setMetricTotal`, `getMetric`, `listMetrics`) and the `Period` helper. Keep logs brief and assertions minimal.

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
