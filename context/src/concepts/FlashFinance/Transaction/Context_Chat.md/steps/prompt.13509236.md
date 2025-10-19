---
timestamp: 'Sat Oct 18 2025 19:03:02 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_190302.a8fefd4d.md]]'
content_id: 1350923606beeb250b54ba248286b301c7845237a9c1e269aa5bfd2324b35993
---

# prompt:  test-parsing is using some unfamiliar functions of testDb. Modify test-parsing.ts so that it uses testdb correctly. A strong an very good example on the template of the interactions is test-op-simple.ts from another concept. remember, setting up the state and verifying results should *only* be done through function APIs. If there is something you need to do in test-parsing that can only be done through the database access, please say it in a different text. give me the corrected test-parsing.ts that keeps the same kind of data and tests it.

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

> importTransactions(owner\_id: ID, file: String): (txs: \[Transactions])
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
