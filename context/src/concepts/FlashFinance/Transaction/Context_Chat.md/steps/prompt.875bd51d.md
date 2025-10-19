---
timestamp: 'Sun Oct 19 2025 10:10:12 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_101012.7eaf8c5b.md]]'
content_id: 875bd51d01f03600c9de913fe77cc2c7b3794b769a0e0ba29e202e091fb1d678
---

# prompt: test the mark\_labeled actions. get data by parsing from the sample csv (bank\_statement\_columns.csv). look at the previous test in test-parsing.ts to see how it's done. Be niminal in the things you demonstrate (demonstrate mark labeled at most 1-2 times)

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
