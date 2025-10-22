
**concept:** Category[ID, Period]

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
>> a period Period
>> a current_total Number 



**actions:**
> create(owner_id: ID, name: String): (category_id: ID)  
>> *requires:*  
user owner_id exists; for the same owner_id, no existing category with same name  
>> *effects:*  
generated a new category_id; creates and stores a category under owner_id associated with name; returns it

> rename(owner_id: ID, category: Category, new_name: String): (category_id: ID)  
>> *requires:*  
category exists and category.owner_id = owner_id; for the same owner_id, no existing category with same new_name  
>> *effects:*  
updates category.name to new_name; returns updated category

> delete(owner_id: ID, category: Category, can_delete : Boolean): (ok: Boolean)  
>> *requires:*  
category exists and category.owner_id = owner_id  \
can_delete = true (only called by the sync which gets result from label's)
>> *effects:*  
removes the category (and its CategoryMetrics) and returns true; otherwise leaves state unchanged and returns false


> set_metric_total(owner_id: ID, category_id: ID, period: Period, total: Number)
>> *requires:* owner and category exist; total ≥ 0  
>> *effects:* creates or updates the metric for (owner, category, period) with current_total = total


**invariants:**
- (owner_id, name) is unique among Categories
- category_id is unique for the same user
- categories cannot belong to multiple users
- (owner_id, category_id, period) uniquely identifies a CategoryMetric  
- CategoryMetric.current_total is nonnegative


