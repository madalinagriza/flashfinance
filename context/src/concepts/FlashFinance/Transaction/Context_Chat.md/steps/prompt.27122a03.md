---
timestamp: 'Sat Oct 18 2025 18:54:25 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_185425.bdad6439.md]]'
content_id: 27122a03154b6e3b6f8dc67851f391846e43ce6fabaebe7555a755c8e3384884
---

# prompt:  Create a single Deno test file `transaction_parse.test.ts` that validates parsing and import of the existing `sample/sample-spendings.csv` end-to-end. The test should read the CSV file, call `import_transactions(owner_id, csvContent)` on a `TransactionStore` instance created using the existing `TestDb` (do not create mocks or in-memory databases—use exactly `const db = new TestDb().db;`). After import, call a simple getter such as `list_all(): Promise<TransactionDoc[]>` to retrieve all stored transactions and assert they were imported correctly. Keep the test generic: do not rely on exact column names, since headers vary by bank (dates, merchants, debits, credits, amounts, etc.). Assert structurally that only cost/outflow rows (amount > 0) were imported, amounts are positive numbers, optional merchant text is trimmed, and date fields are parsed if present or null otherwise. Use Deno’s built-in test runner with `jsr:@std/assert` only—no other test libraries. Ensure parsing uses Deno’s CSV parser (`jsr:@std/csv/parse`), normalizes headers (uppercase, strip punctuation/whitespace), prefers debit over credit, skips inflows (credit/CR/positive credit), and uses sign or DR/CR type for single amount columns. Keep the test minimal, clean, and hermetic with `TestDb`, taking inspiration from `test-op-simple.ts` in another concept for structure and style

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
