**concept:** Label[ID, Timestamp]

**purpose:** record the user's assignment of a specific transaction to a specific category so that spending meaning is explicit and auditable  

**principle:** if a user applies a label, the transaction holds exactly one active label at a time; relabeling replaces the previous one. Users may stage labels during a session before confirming them. The system’s AI may suggest labels based on transaction context, but suggestions never change state until confirmed by the user.

---

**state:**  
> a set of **Labels** with  
>> a `tx_id` : ID  
>> a `category_id` : ID  
>> a `user_id` : ID  
>> a `created_at` : Timestamp  
>
> a set of **TransactionInfo** with  
>> a `tx_id` : ID  
>> a `tx_name` : String  
>> a `tx_merchant` : String  
>
> a set of **CategoryHistory** with  
>> a `category_id` : ID  
>> a set of `transactions` : TransactionInfos  

> a set of StagedLabels with
>> a stagedlabel_id: ID
>> a user_id : ID
>> a set of transactions : TransactionInfos
>> 

---

**actions:**  


---
> **stage**(user_id : ID, tx_id : ID, tx_name : String, tx_merchant : String, category_id : ID)  : (label_tx_id : ID)
>> *requires:* 
>> no committed label exists for `tx_id`;  no stagedLabel with ID tx_id.
>> *effects:*  
>> creates a StagedLabel for this user and transaction with the provided info and category, adds it to stagedLabels, and returns the staged label's `label_tx_id`.
---
> **discardUnstagedLabel**(user_id : ID, tx_id : ID, tx_name : String, tx_merchant : String)  : (label_tx_id : ID)
>> *requires:* 
>> no committed label exists for `tx_id`;  no stagedLabel with ID tx_id.
>> *effects:*  
>> creates a StagedLabel for this user and transaction, assigning it to the built-in **Trash** category, and returns the staged label's `label_tx_id`.
---
> **finalize**(user_id : ID)
>> *requires:*  
>> for each StagedLabel belonging to the user:  no committed label exists for `tx_id`  
>> *effects:*   
>> for each StagedLabel belonging to the user 
>>>creates a TransactionInfo
>>>creates a new Label linking `tx_id` to `category_id` and `user_id`;  
>>>adds TransactionInfo to CategoryHistory under the chosen category;  
>> after processing all staged labels, wipes stagedLabels  

---

> **cancelSession**(user_id : ID)  
>> *requires:*  
true (a user may cancel a pending session at any time)  
>> *effects:*  
deletes all StagedLabels for that user;  
no modifications to Labels or CategoryHistory  


---

> **update**(user_id : ID, tx_id : ID, new_category_id : ID) : (label_tx_id : ID)
>> *requires:*  
a label for `tx_id` exists; `transaction.owner_id = user_id`;  
`new_category_id` exists and `owner_id = user_id`;  
TransactionInfo exists with `transactionInfo.id = tx_id`  
>> *effects:*  
updates CategoryHistory, associating TransactionInfo with the new category;  
replaces the label’s `category_id` with `new_category_id`;  
updates `created_at` to now; returns updated label  

---

> **removeCommittedLabel**(user_id : ID, tx_id : ID)  
>> *requires:*  
a label for `tx_id` exists; `transaction.owner_id = user_id`  
>> *effects:*  
reassigns the transaction’s label to the user’s built-in **Trash** category;  
updates CategoryHistory, associating the transaction with the trash category  

---

**invariants:**  
- at most one label per tx_id  
- `label.user_id = transaction.owner_id` for the labeled transaction  
- a label’s category.owner_id = label.user_id  
- suggestions do not create or modify labels until the user explicitly applies or updates  

---

**significant (non-action) function**
> **suggest**(llm : GeminiLLM, user_id : ID, allCategories : [(ID, String)], transactionInfo) : (suggested_category_id : ID)  
>> *requires:*  
user has ≥ 1 category  
>> *effects:*  
returns a best-guess category_id from the user’s existing categories for this `tx_id`, highlighted in the UI;  
suggested by AI and does **not** alter Labels state  

---

**notes on suggest function:**  
> suggest has its place somewhere in between the UI and Label concept. I chose to put it here since Label in majority the necessary data for the suggest.\
 In order for the AI to be trained well on good examples, I needed to keep a history of past transactions, as well as give it full info on categories, which is why the data types involved in suggest are more complex.\
 Nevertheless, since suggest doesn't update the Label's state, it's not an action. Therefore, I considered it permissable to involve a little more complexity in the function arguments. For a little more details on the records and arguments needed for suggest:
>> catTx is a record used for AI suggestions and later UI. Labels remain the source of truth for what’s currently assigned.  \
>> txInfos carries merchant and name fields since the AI needs them for interpreting.  \
>> txInfos must be passed into `suggest` because suggestions apply to transactions not yet labeled—there’s no existing connection from transaction id -> transaction info within the Label concept.  
>> All categories and their names must be passed in since we may not have a full record of categories through past labeling (say we never assgined to the category "Restaurants" but it's still a valid suggestion)