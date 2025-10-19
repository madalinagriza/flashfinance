---
timestamp: 'Fri Oct 17 2025 22:03:47 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_220347.bf44e6b3.md]]'
content_id: d8dc94830f0c223b2aa56ec53120eac819eaa92a58921d602cb28488c488daad
---

# prompt:   implement the state for the category concept, that you can find in spec.md. Don't be concerned about the actions, just the fields we would need in the class to satisfy the state. Take as an example the code in label.ts. Don't interleave any functions or classes from label, but follow it for imports, class structure, seeing how to call mongodb and other particularities. Be minimal in your code.

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

> delete(owner\_id: ID, category: Category): (ok: Boolean)
>
> > *requires:*\
> > category exists and category.owner\_id = owner\_id\
> > *effects:*\
> > if no current-period label references this category, removes it (and any CategoryMetrics for it) and returns true; otherwise leaves state unchanged and returns false

> recompute\_metric\_for\_period(owner\_id: ID, category\_id: ID, period: Period): (metric: CategoryMetric)
>
> > *requires:*\
> > *effects:*\
> > creates or updates the CategoryMetric identified by (owner\_id, category\_id, period), setting current\_total to the sum of amounts of transactions labeled into (owner\_id, category\_id) whose timestamps fall within `period`; does not mutate transactions or labels; returns the metric

**invariants:**

* (owner\_id, name) is unique among Categories
* category\_id is unique for the same user
* categories cannot belong to multiple users
* (owner\_id, category\_id, period) uniquely identifies a CategoryMetric
* CategoryMetric.current\_total is nonnegative
