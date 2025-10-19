# Design Changes

## Label Concept

The update came from test cases showing that applying two labels to the same transaction was undefined. I wanted labeling to be **atomic per session**, but the old `apply` wrote directly to the persistent state, leaving no clear path for unfinished sessions. If a user stopped mid-labeling, the work would be lost unless they reuploaded their bank statement.

To address this, I added a **staging phase** before committing labels. Each label is first stored as pending; if the user **finalizes**, all staged labels are applied together, while **cancel** discards them. This makes labeling sessions all-or-nothing and prevents inconsistent or partial states.


## User Concept

Adding reactivate as an action, as a response to our deactivate action (see details in interesting moments #1 (for user concept))

## Category Concept

I decided to combine feedbackmetric and transactions for the following reasons:
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



# Interesting moments

## Category Concept

1. I realized that the requirements in delete (whic is that no labels are for the given category) don't quite work because it reaches into the label state. Which means I either have to start storing label ids and amounts in the state (would be good for metrics which I still haven't figured out how to fully integrate), or let the sync take care of it and pass it as an argument (my current solution right now).

## Label Concept

1. Atomic-session redesign: I realized that direct applying labels left transactions half-labeled; introduced stage + finalize to make sessions atomic.
[Context Snapshot `20251017_181902.7498d0eb`](../../../context/src/concepts/FlashFinance/Label/Context_Chat.md/20251017_181902.7498d0eb.md) - running this test, realizing the behavior is undefined when there's two applies; and that probably the user may be in a situation where their labeling session is interrupted

[Context Snapshot  `20251017_193248.db1985bc`](../../../context/src/concepts/FlashFinance/Label/Context_Chat.md/20251017_193248.db1985bc.md) - AI tries to use the *now* private apply function to directly insert and stress-test something. I had to iterate and tell it not to. 

2. Failed a testcase in which 2 different users were labeling under the same stage id (the error was saying the transaction id already exists for userB, even though it existed for userA). ALthough my search to find if there's an entry was per-user, when inserting in the database, I was inserting only per transaction id and not per user. Now I am keyeing by the user too. 
[Label Snapshot](../../../context/src/concepts/FlashFinance/Label/label.ts/20251017_192345.e6ae5480.md) - before, the ids were just tx_ids (because of the one to one relationship, for one user)
[Updated Label.ts Snapshot](../../../context/src/concepts/FlashFinance/Label/label.ts/20251017_201613.fc74a44a.md) - updates so that keys are both user & tx related (there's been iterations from these files as I was finding bugs, but this is the moment of change) 

## User Concept

1. I had the deactivate method but hadn't thought about the case that a user registers under the same email that is deactivate. I will have the AI implement a testcase for it, see the current behavior, and then make changes where I deem necessary. My strategy is probably to create a new user id with the same email, so we can keep the information about that user id around (I remember how this was talked in class that it could be a good idea, in case I would decide to extend to some reactivation/recovery functionality). For now, a new account will be made
[Snapshot - prompt to add testcase](../../../\context\src\concepts\FlashFinance\User\Context_Chat.md\steps\prompt.df0ce9fb.md)
[Snapshot - response outlines that my requires doesn't allow for reregistration](../../../context\src\concepts\FlashFinance\User\Context_Chat.md\steps\response.9a738f15.md)
As a result I'll add an action for specific reactivation, which is technically not required but it makes sense to me and to the user experience to have it.
[Snapshot - Final testcase on it](../../../context/src/concepts/FlashFinance/User/Context_Chat.md/steps/response.d30d9c30.md)
2. Per Chatgpt's suggestions, I have realized the input emailed is not normalized for capitalized letters, even though it could be a user input (say, if you type from a phone, the keyboard may automatically capitalize the first letter). I am adding this extension and including a testcase for it. 
[Snapshot - Making the testcase](../../../context/src/concepts/FlashFinance/User/Context_Chat.md/steps/prompt.7d0c731e.md)


## Transaction Concept


1. Parsing the bank statements is a *big* fish to fry although it feels like one action. I need to ask more friends to give me sample bank statements, and if the current, deterministic parsing doesn't satisfy a good chunk of the bank statements, I'll probably integrate AI calls to determine which columns refer to merchant_info, to amounts, etc.   

[Snapshot - 200 lines for parsing?](../../../../context\src\concepts\FlashFinance\Transaction\Context_Chat.md\steps\response.8b3a436d.md)


2. Now that labels have a *pending* state, this has some interesting interactions with the fact that transactions can be labeled or unlabeled. UI-wise, the unlabeled transactions are going to be kept in a "bucket" before the user starts a labeling session. This alllows the user to finalize a labeling session even if they hadn't labeles *all* the transactions that are unlabeled, and allows them to come back later to the unlabeled transactions. I think this is good! I'll have to introduce some logic about transactions that could overlap (like say user uploads transactions from 14/10-24/10 and then from 20/10-30/10, transactions shouldn't be double-counted). This might be in the near future as I'm working on the syncs and set up their interactions.

3. Because bank statement/ spending records can vary from bank to bank so much, I made some background data explaining the fields. I also had to be clear in the prompts what kind of expression could be equivalent and should be labeled as a specific field we were interesting in (e.g. 'amount' could be split from 'credit' and 'debit' or use another synonym for amount).
[Snapshot - very detailed prompt on the vast structure of the bank statements](../../../../context\src\concepts\FlashFinance\Transaction\Context_Chat.md\steps\prompt.ba189b37.md)