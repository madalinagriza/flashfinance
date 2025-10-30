---
timestamp: 'Sun Oct 19 2025 10:44:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_104437.e3c0cdbf.md]]'
content_id: a4b9f5ec9b3ca443c235e09d4e9d89f293c15339f8816303008e8dfd81885c2e
---

# prompt: we're working towards finishing test-parsing-edge-cases.ts, and we need the remaining csv files for it. please create them, looking at what contents they should have by seeing how they're parsed and tested in parsing-edge-cases.ts. The spec, transaction.ts, testsample.csv, and sample-spendings.csv is informative of how the environment is set up and what functionsa re available.

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
