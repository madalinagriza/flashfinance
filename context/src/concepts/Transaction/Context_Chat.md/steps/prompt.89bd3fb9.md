---
timestamp: 'Tue Oct 21 2025 19:54:08 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_195408.b2640035.md]]'
content_id: 89bd3fb94a1af12b459ad70f94561ba6589988b0dbc305973577c7482ccc8bb0
---

# prompt: add a function to TransactionConcept.ts that returns the transactions which are unlabeled, belonging to an owner\_id. Likewise, make a function that returns all the labeled transactions beloging to an user\_id. For each, devise a small testcase in test-parsing.ts. The data shuould be of 2-3 entries but demonstrate functionality

**concept:** Transaction\[ID]

**purpose:** represent each imported bank record that a user will label

**principle:** if a user imports a statement, then transactions are created as immutable records in UNLABELED status; when a label is applied (via sync), the transaction’s status becomes LABELED.

**state:**

> a set of Transactions with
>
> > a tx\_id ID\
> > an owner\_id ID\
> > a date Date\
> > a merchant\_text String\
> > an amount Number\
> > a status {UNLABELED | LABELED}

**actions:**

> importTransactions(owner\_id: ID, file: String)
>
> > *requires:* owner exists; file id is valid\
> > *effects:* parses the files and converts rows into Transactions owned by owner\_id with status UNLABELED; generates new tx\_ids for each transaction; adds them to state; returns the created list

> mark\_labeled(tx\_id: ID, requester\_id: ID)
>
> > *requires:*\
> > transaction tx\_id exists; requester\_id = transaction.owner\_id\
> > *effects:*\
> > sets transaction.status to LABELED

**invariants:**

* each transaction has exactly one owner\_id
* transaction.amount is positive
* status is {UNLABELED, LABELED}
* transactions are created only by parsing a bank statement
* after a transaction first becomes LABELED, it never returns to UNLABELED
* after import, transactions remain immutable records that can be labeled but not directly edited.
