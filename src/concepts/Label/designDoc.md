
Changes to the Label spec:
Introduced a discard action, for transactions we don't want to label to any category. The is also the delete action, but this one requires an existing label. 
This addition was introduced to distinguish between the following:
- transactions you don't want as a record in your platform (no label created for them)
- transactions labeled to a category you want to delete (goes into the trash category, and can be moved from the trash)

Not an action, but I moved getTxInfo in the Transaction Concept since that functionality clearly belonged there, and it was a poor misplacement.
