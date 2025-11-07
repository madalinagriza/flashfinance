

**concept:** Transaction[ID]

**purpose:** represent each imported bank record that a user will label

**principle:** if a user imports a statement, then transactions are created as immutable records in UNLABELED status; when a label is applied (via sync), the transaction’s status becomes LABELED.

**state:**
> a set of Transactions with  
>> a tx_id ID  
>> an owner_id ID    
>> a date Date  
>> a merchant_text String  
>> an amount Number  
>> a status {UNLABELED | LABELED}

**actions:**
> import_transactions(owner_id: ID, fileContent: String)  
>> *requires:* owner exists; file content parses into ≥ 0 valid rows  
>> *effects:* parses the csv rows and creates Transactions for owner_id with status UNLABELED; generates tx_ids for each new record; returns nothing  

> mark_labeled(tx_id: ID, requester_id: ID): (tx_id: ID)  
>> *requires:*  
transaction tx_id exists; requester_id = transaction.owner_id  
>> *effects:*  
sets transaction.status to LABELED and returns the marked tx_id

> bulk_mark_labeled(tx_ids: [ID], requester_id: ID)  
>> *requires:* each tx_id exists and is owned by requester_id  
>> *effects:* marks every listed transaction as LABELED; if any update fails the whole operation aborts

**invariants:**
- each transaction has exactly one owner_id
- transaction.amount is positive
- status is {UNLABELED, LABELED}
- transactions are created only by parsing a bank statement
- after a transaction first becomes LABELED, it never returns to UNLABELED
- after import, transactions remain immutable records that can be labeled but not directly edited.
