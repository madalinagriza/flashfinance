---
timestamp: 'Sat Oct 18 2025 01:19:43 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_011943.b3fdf283.md]]'
content_id: 93464850528ec72fd1f2564aced25fb779cdf322bbe13e24defa4463b111048b
---

# prompt: # setup a small test for the rename action of the category class. use the getCategoryNamesAndOwners to verify the information. you can integrate it in the existing test-op-simple test module. I want least amount of steps that demonstrate functionality.   Use only the public functions you've written in category.ts . I need very minimal function. LEAST amount of work for it. rename only one category or something. paste only the test you're adding.

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
