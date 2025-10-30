

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
> importTransactions(owner_id: ID, file: String): (txs: [Transactions])  
>> *requires:* owner exists; file id is valid  
>> *effects:* parses the files and converts rows into Transactions owned by owner_id with status UNLABELED; generates new tx_ids for each transaction; adds them to state; returns the created list  

> mark_labeled(tx_id: ID, requester_id: ID)  
>> *requires:*  
transaction tx_id exists; requester_id = transaction.owner_id  
>> *effects:*  
sets transaction.status to LABELED

**invariants:**
- each transaction has exactly one owner_id
- transaction.amount is positive
- status is {UNLABELED, LABELED}
- transactions are created only by parsing a bank statement
- after a transaction first becomes LABELED, it never returns to UNLABELED
- after import, transactions remain immutable records that can be labeled but not directly edited.
