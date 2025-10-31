# Design Changes

## Label Concept

Introduced a discard action, for transactions we don't want to label to any category. The is also the delete action, but this one requires an existing label. 
This addition was introduced to distinguish between the following:
- transactions you don't want as a record in your platform (no label created for them)
- transactions labeled to a category you want to delete (goes into the trash category, and can be moved from the trash)

Not an action, but I moved getTxInfo in the Transaction Concept since that functionality clearly belonged there, and it was a poor misplacement.



## Category Concept

Metrics had to have more information than the totals. Becase we want to provide insightful stats (avg per day, totals), but also support moving transactions from one category to another, I needed to store some information about the transaction as well. 
Similarly to how the label concept 'remembers' transaction info to then give it to the AI, I changed the Category Concept to do so as well. 

Metrics update automatically when a transaction is moved from a category to another (or moved to trash). 


The arguments for getMetrics is simplified, before it was a Period type, but I needed a simpler type for communication with the frontend. 
Similarly, ID -> strings updates were done. 


# General Changes (Backend & Frontend)

- User can now import a csv file instead of pasting into the textbox
- User can set a preference to either have AI suggest labels or no

