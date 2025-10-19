---
timestamp: 'Sun Oct 19 2025 10:10:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_101055.f6c6ee09.md]]'
content_id: ea17a6be6c1e009f9a5f5c345f93ff6cf5ef0fd02d8d4b142b0a69cb6ca28423
---

# response:

```typescript
// src/concepts/FlashFinance/Transaction/test-actions/test-mark-labeled.ts
import {
  assertEquals,
  assertExists,
  assertRejects,
} from "jsr:@std/assert";
import { Db, MongoClient } from "npm:mongodb";
import { Id, TransactionStatus, TransactionStore } from "../transaction.ts";
import { testDb } from "@utils/database.ts"; // Utility for managing test database

// Determine the path to the sample CSV file for this test
const BANK_STATEMENT_CSV_PATH = "./sample/bank_statement_columns.csv";

Deno.test("TransactionStore: mark_labeled action behaves correctly", async () => {
  // Declare db and client variables to be assigned in the try block
  // and used in the finally block for cleanup.
  let db: Db | null = null;
  let client: MongoClient | null = null;

  try {
    // 1. Setup: Initialize testDb and TransactionStore
    // Correctly destructure the return value of testDb() into Db and MongoClient instances.
    [db, client] = await testDb();
    const store = new TransactionStore(db);

    const ownerId = Id.generate(); // Generate a new owner ID for this test
    const anotherOwnerId = Id.generate(); // A different owner for testing permissions
    console.log(`\n--- Test mark_labeled for Owner: ${ownerId.toString()} ---`);

    // 2. Action: Read CSV content from bank_statement_columns.csv and import transactions
    console.log(`Reading CSV from: ${BANK_STATEMENT_CSV_PATH}`);
    const csvUrl = new URL(BANK_STATEMENT_CSV_PATH, import.meta.url);
    const csvContent = await Deno.readTextFile(csvUrl);
    assertExists(csvContent, "CSV content should not be empty.");
    console.log("CSV content read successfully.");

    console.log("Calling import_transactions...");
    const importedTransactions = await store.import_transactions(
      ownerId,
      csvContent,
    );
    // Based on bank_statement_columns.csv and the parsing logic (only positive outflows):
    // 1. "Online Transfer To Savings" CR 200 -> Inflow (skipped)
    // 2. "ATM Withdrawal" DR 50 -> Outflow (imported)
    // 3. "Groceries - SuperMart" DR 75.50 -> Outflow (imported)
    // 4. "Salary Deposit" CR 1500 -> Inflow (skipped)
    // 5. "Coffee Shop" DR 12 -> Outflow (imported)
    // 6. "Utility Bill Payment" DR 120 -> Outflow (imported)
    // 7. "Refund - Online Store" DR -25 -> Negative debit (inflow reversal, skipped)
    // 8. "Gym Membership" DR 40 -> Outflow (imported)
    const expectedNumberOfOutflows = 5;
    assertEquals(
      importedTransactions.length,
      expectedNumberOfOutflows,
      `Expected ${expectedNumberOfOutflows} outflow transactions to be imported.`,
    );
    console.log(
      `   ✅ Imported ${importedTransactions.length} transactions successfully.`,
    );

    // Verify all imported transactions are UNLABELED initially
    for (const tx of importedTransactions) {
      const fetchedTx = await store.getTransaction(Id.from(tx.tx_id));
      assertExists(fetchedTx);
      assertEquals(
        fetchedTx.status,
        TransactionStatus.UNLABELED,
        `Imported transaction ${tx.tx_id} should be UNLABELED initially.`,
      );
    }
    console.log(
      "   ✅ All imported transactions are verified to be initially UNLABELED.",
    );

    // 3. Demonstrate mark_labeled (success case 1)
    const txToLabel1 = importedTransactions[0]; // Pick the first imported transaction
    assertExists(txToLabel1, "There should be at least one transaction to label.");
    const txId1 = Id.from(txToLabel1.tx_id);
    console.log(`Attempting to mark transaction ${txId1.toString()} as LABELED.`);

    // Call the action: mark_labeled
    const result1 = await store.mark_labeled(txId1, ownerId);
    assertEquals(
      result1.tx_id.toString(),
      txId1.toString(),
      "The returned tx_id from mark_labeled should match the labeled tx_id.",
    );
    console.log(`   ✅ mark_labeled for ${txId1.toString()} successful.`);

    // Verification 1: Fetch the transaction and check its status
    const fetchedTx1 = await store.getTransaction(txId1);
    assertExists(fetchedTx1);
    assertEquals(
      fetchedTx1.status,
      TransactionStatus.LABELED,
      `Transaction ${txId1.toString()} status should now be LABELED.`,
    );
    console.log(`   ✅ Verified: Transaction ${txId1.toString()} is now LABELED.`);

    // 4. Demonstrate mark_labeled (success case 2)
    // As per prompt, demonstrate mark_labeled at most 1-2 times. We'll do a second one.
    const txToLabel2 = importedTransactions[1]; // Pick the second imported transaction
    assertExists(txToLabel2, "There should be at least two transactions to label.");
    const txId2 = Id.from(txToLabel2.tx_id);
    console.log(`Attempting to mark transaction ${txId2.toString()} as LABELED.`);

    // Call the action: mark_labeled
    const result2 = await store.mark_labeled(txId2, ownerId);
    assertEquals(
      result2.tx_id.toString(),
      txId2.toString(),
      "The returned tx_id from mark_labeled should match the labeled tx_id.",
    );
    console.log(`   ✅ mark_labeled for ${txId2.toString()} successful.`);

    // Verification 2: Fetch the transaction and check its status
    const fetchedTx2 = await store.getTransaction(txId2);
    assertExists(fetchedTx2);
    assertEquals(
      fetchedTx2.status,
      TransactionStatus.LABELED,
      `Transaction ${txId2.toString()} status should now be LABELED.`,
    );
    console.log(`   ✅ Verified: Transaction ${txId2.toString()} is now LABELED.`);

    // 5. Demonstrate error cases for mark_labeled

    // 5a. Attempt to mark a non-existent transaction
    const nonExistentTxId = Id.generate();
    console.log(
      `Attempting to mark non-existent transaction ID: ${nonExistentTxId.toString()}.`,
    );
    await assertRejects(
      async () => {
        await store.mark_labeled(nonExistentTxId, ownerId);
      },
      Error,
      `Transaction with ID ${nonExistentTxId.toString()} not found.`,
      "Should reject marking a transaction that does not exist.",
    );
    console.log("   ✅ Verified: Cannot mark a non-existent transaction.");

    // 5b. Attempt to mark a transaction with a non-matching owner_id
    const txToLabelByWrongOwner = importedTransactions[2];
    const txIdWrongOwner = Id.from(txToLabelByWrongOwner.tx_id);
    console.log(
      `Attempting to mark transaction ${txIdWrongOwner.toString()} with wrong owner ID: ${anotherOwnerId.toString()}.`,
    );
    await assertRejects(
      async () => {
        await store.mark_labeled(txIdWrongOwner, anotherOwnerId);
      },
      Error,
      `Requester ID ${anotherOwnerId.toString()} does not own transaction ${txIdWrongOwner.toString()}.`,
      "Should reject marking a transaction by an owner who does not own it.",
    );
    console.log("   ✅ Verified: Cannot mark a transaction owned by another user.");
    // Verify its status is still UNLABELED after the failed attempt
    const fetchedTxWrongOwner = await store.getTransaction(txIdWrongOwner);
    assertExists(fetchedTxWrongOwner);
    assertEquals(
      fetchedTxWrongOwner.status,
      TransactionStatus.UNLABELED,
      `Transaction ${txIdWrongOwner.toString()} status should remain UNLABELED after failed attempt.`,
    );
    console.log(
      `   ✅ Verified: Transaction ${txIdWrongOwner.toString()} status remained UNLABELED.`,
    );

    // 5c. Attempt to mark an already labeled transaction
    console.log(
      `Attempting to re-mark an already labeled transaction ID: ${txId1.toString()}.`,
    );
    await assertRejects(
      async () => {
        await store.mark_labeled(txId1, ownerId);
      },
      Error,
      `Transaction with ID ${txId1.toString()} is already labeled.`,
      "Should reject marking a transaction that is already LABELED.",
    );
    console.log("   ✅ Verified: Cannot re-mark an already labeled transaction.");
  } finally {
    // 6. Cleanup: Close the database connection and drop the test database
    if (client) {
      await client.close(true);
    }
    console.log("Database client closed and test database dropped.");
  }
});

```

***

```markdown
# file: src/concepts/FlashFinance/Transaction/test-actions/sample/bank_statement_columns.csv
"Account Number","Transaction Date","Posting Date","Description","Debit","Credit","Type","Balance"
"XXXXX1234","01/01/2025","01/01/2025","Online Transfer To Savings","","200.00","CR","1200.00"
"XXXXX1234","01/02/2025","01/02/2025","ATM Withdrawal","50.00","","DR","1150.00"
"XXXXX1234","01/03/2025","01/03/2025","Groceries - SuperMart","75.50","","DR","1074.50"
"XXXXX1234","01/04/2025","01/04/2025","Salary Deposit","","1500.00","CR","2574.50"
"XXXXX1234","01/05/2025","01/05/2025","Coffee Shop","12.00","","DR","2562.50"
"XXXXX1234","01/06/2025","01/06/2025","Utility Bill Payment","120.00","","DR","2442.50"
"XXXXX1234","01/07/2025","01/07/2025","Refund - Online Store","-25.00","","DR","2467.50"
"XXXXX1234","01/08/2025","01/08/2025","Gym Membership","40.00","","DR","2427.50"
```
