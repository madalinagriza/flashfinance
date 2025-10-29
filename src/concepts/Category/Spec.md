
**concept:** Category[ID]

**purpose:** allow users to define and manage meaningful groupings of their transactions

**principle:** categories are user-defined and reusable; if a user creates categories and later renames or deletes one, then names remain unique per user; deletion is blocked while referenced by labels.

**state:**
> a set of Categories with  
>> a name String
>> a category_id ID  
>> an owner_id ID 

> a set of CategoryMetrics with
>> an owner_id ID  
>> a category_id ID  
>> a list of transactions, where each transaction has:
>>> a tx_id ID
>>> an amount Number
>>> a tx_date Date

**actions:**
> create(owner_id: ID, name: String): (category_id: ID)  
>> *requires:*  
user owner_id exists; for the same owner_id, no existing category with same name  
>> *effects:*  
generates a new category_id; creates and stores a category under owner_id associated with name; returns it

> rename(owner_id: ID, category_id: ID, new_name: String): (category_id: ID)  
>> *requires:*  
category exists and category.owner_id = owner_id; for the same owner_id, no existing category with same new_name  
>> *effects:*  
updates category.name to new_name; returns updated category_id

> delete(owner_id: ID, category_id: ID, can_delete : Boolean): (ok: Boolean)  
>> *requires:*  
category exists and category.owner_id = owner_id; can_delete = true (derived from whether any labels reference this category)
>> *effects:*  
removes the category and its associated metrics; returns true

> addTransaction(owner_id: ID, category_id: ID, tx_id: ID, amount: Number, tx_date: Date): (ok: Boolean)
>> *requires:* owner and category exist; amount ≥ 0; transaction with tx_id is not already recorded for this category
>> *effects:* adds the transaction record to the metric for (owner, category); returns true

> removeTransaction(owner_id: ID, category_id: ID, tx_id: ID): (ok: Boolean)
>> *requires:* owner and category exist; transaction with tx_id is recorded for this category
>> *effects:* removes the transaction record from the metric for (owner, category); returns true


**invariants:**
- (owner_id, name) is unique among Categories
- category_id is unique for the same user
- categories cannot belong to multiple users
- (owner_id, category_id) uniquely identifies a CategoryMetric document
- Each transaction entry is unique by tx_id within a CategoryMetric document
- Transaction amounts are nonnegative


