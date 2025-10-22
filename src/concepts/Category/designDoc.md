## Significant changes to the state:
I devided to combine feedbackmetric and transactions for the following reasons:
- all the information for a goodd feedback metric is encoded in the category, and they shouldn't have complex passing of arguments
- otherwise, if feedbackmetric were to hold its own information, it would basically be mirroring the state of category which means its heavily dependant
- seemed to simp-listic and worth a combination


---
old feedbackmetric spec:
**concept:** FeedbackMetric[ID, Period]

**purpose:** provide per-user, per-category aggregates of labeled transactions so spending activity can be summarized and compared across time periods

**principle:** if labels exist for a given period, then recomputation aggregates category totals for that period without mutating transactions or labels, ensuring metrics remain reflective but not causative.

**state:**
> a set of FeedbackMetrics with  
>> an owner_id ID  
>> a category_id ID  
>> a period Period  
>> a current_total Number  


**actions:**
> recompute_for_period(owner_id: ID, category_id: ID, period: Period): (metric: FeedbackMetric)  
>> *requires:*  
owner exists;  
>> *effects:*  
creates or updates the FeedbackMetric identified by (owner_id, category_id, period), setting current_total to the sum of amounts of labeled transactions; returns it  

**invariants:**
- (owner_id, category_id, period) uniquely identifies a FeedbackMetric  
- current_total is nonnegative  
- FeedbackMetric.owner_id = Category.owner_id  


## Interesting moments

1. I realized that the requirements in delete (whic is that no labels are for the given category) doesn't quite work because it reaches into the label state. Which means I either have to start storing label ids and amounts in the state (would be good for metrics which I still haven't figured out how to fully integrate), or let the sync take care of it and pass it as an argument (my current solution right now).