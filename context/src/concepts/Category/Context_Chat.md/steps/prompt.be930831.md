---
timestamp: 'Wed Nov 05 2025 21:26:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_212638.fe9d2847.md]]'
content_id: be93083158d99f5ce5663b8b4b973fcd6deb5f1b183eb19dbd19bc09911f7863
---

# prompt: add a function to the category concept that implements an update Transaction, which calls add transaction to another category, and calls category.removeTransaction for the old\_category.

**concept:** Category\[ID]

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
> > a list of transactions, where each transaction has:
> >
> > > a tx\_id ID
> > > an amount Number
> > > a tx\_date Date

**actions:**

> create(owner\_id: ID, name: String): (category\_id: ID)
>
> > *requires:*\
> > user owner\_id exists; for the same owner\_id, no existing category with same name\
> > *effects:*\
> > generates a new category\_id; creates and stores a category under owner\_id associated with name; returns it

> rename(owner\_id: ID, category\_id: ID, new\_name: String): (category\_id: ID)
>
> > *requires:*\
> > category exists and category.owner\_id = owner\_id; for the same owner\_id, no existing category with same new\_name\
> > *effects:*\
> > updates category.name to new\_name; returns updated category\_id

> delete(owner\_id: ID, category\_id: ID, can\_delete : Boolean): (ok: Boolean)
>
> > *requires:*\
> > category exists and category.owner\_id = owner\_id; can\_delete = true (derived from whether any labels reference this category)
> > *effects:*\
> > removes the category and its associated metrics; returns true

> addTransaction(owner\_id: ID, category\_id: ID, tx\_id: ID, amount: Number, tx\_date: Date): (ok: Boolean)
>
> > *requires:* owner and category exist; amount ≥ 0; transaction with tx\_id is not already recorded for this category
> > *effects:* adds the transaction record to the metric for (owner, category); returns true

> removeTransaction(owner\_id: ID, category\_id: ID, tx\_id: ID): (ok: Boolean)
>
> > *requires:* owner and category exist; transaction with tx\_id is recorded for this category
> > *effects:* removes the transaction record from the metric for (owner, category); returns true

> moveTransactionToTrash(owner\_id: ID, from\_category\_id: ID, tx\_id: ID): (ok: Boolean)
>
> > *requires:* owner and source category exist; transaction with tx\_id is recorded for the source category
> > *effects:* removes the transaction record from the source category, ensures the built-in Trash category exists for the owner, and records the transaction (same amount/date) under Trash; returns true

**invariants:**

* (owner\_id, name) is unique among Categories
* category\_id is unique for the same user
* categories cannot belong to multiple users
* (owner\_id, category\_id) uniquely identifies a CategoryMetric document
* Each transaction entry is unique by tx\_id within a CategoryMetric document
* Transaction amounts are nonnegative
