---
timestamp: 'Sun Oct 19 2025 10:31:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_103114.1a8d7223.md]]'
content_id: d6ecf32e22bdf686e4941a1a40cda0ee6ff517f152bef9086d2fc2ca11bc6c5d
---

# prompt: create a testsample csv where rows are mixed valid and invalid. then, make a deno test in test-parsing addressing the test. for more information on the details, consult testcase scenario brainstorming. Also, keep the deno test structure close to test-parsing.ts

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
