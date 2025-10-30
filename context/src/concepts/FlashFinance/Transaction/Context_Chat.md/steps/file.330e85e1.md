---
timestamp: 'Sun Oct 19 2025 10:18:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_101855.dd95ba0e.md]]'
content_id: 330e85e13560d38a905aa025a7d12137f1f7c08f3c5fc270efed926f09eb6fd2
---

# file: src/concepts/FlashFinance/Transaction/test-actions/test-parsing.ts

```typescript
import {
  assertEquals,
  assertExists,
  assertInstanceOf,
  assertRejects,
} from "jsr:@std/assert";
import { Db, MongoClient } from "npm:mongodb"; // Import Db and MongoClient types
import { Id, TransactionStatus, TransactionStore } from "../transaction.ts";
import { testDb } from "@utils/database.ts";

// Determine the path to the sample CSV file
const SAMPLE_CSV_PATH = "./sample/sample-spendings.csv";

Deno.test("TransactionStore: CSV import parses and stores outflow transactions correctly", async () => {
  // Declare db and client variables to be assigned in the try block
  // and used in the finally block for cleanup.
  let db: Db | null = null;
  let client: MongoClient | null = null;

  try {
    // 1. Setup: Initialize testDb and TransactionStore
    // Correctly destructure the return value of testDb() into Db and MongoClient instances.
    [db, client] = await testDb();
    // The testDb() utility is expected to return an already connected Db instance.
    // Therefore, no explicit 'connect()' call is needed here on the Db instance.
    const store = new TransactionStore(db);

    const ownerId = Id.generate(); // Generate a new owner ID for this test
    console.log(`\n--- Test CSV Import for Owner: ${ownerId.toString()} ---`);

    // 2. Action: Read CSV content and import transactions
    console.log(`Reading CSV from: ${SAMPLE_CSV_PATH}`);

    const csvUrl = new URL(SAMPLE_CSV_PATH, import.meta.url);
    const csvContent = await Deno.readTextFile(csvUrl);

    assertExists(csvContent, "CSV content should not be empty.");
    console.log("CSV content read successfully.");

    console.log("Calling import_transactions...");
    const importedTransactions = await store.import_transactions(
      ownerId,
      csvContent,
    );
    console.log(
      `import_transactions returned ${importedTransactions.length} transactions.`,
    );

    // 3. Verification: Check the number of imported transactions
    // Based on sample-spendings.csv and the parsing logic (only positive outflows):
    // 1. "Starbucks Inc." 4.25 DR -> Outflow
    // 2. "Payroll Deposit" 2500 CR -> Inflow (skipped)
    // 3. "Whole Foods Market" 52.3 DR -> Outflow
    // 4. "Refund from Amazon" -12.5 CR -> Inflow (skipped)
    // 5. "Electric Company Payment" 150 DR -> Outflow
    // 6. "ATM Withdrawal" 60 DR -> Outflow
    // 7. "Salary Deposit" 2400 CR -> Inflow (skipped)
    // 8. "Gym Membership" -35 DR -> Negative debit (skipped as it's an inflow reversal)
    // 9. "Netflix Subscription" 15.99 DR -> Outflow
    // 10. "Credit Card Payment" 350 CR -> Inflow (skipped)
    const expectedNumberOfOutflows = 5;
    assertEquals(
      importedTransactions.length,
      expectedNumberOfOutflows,
      `Expected ${expectedNumberOfOutflows} outflow transactions to be imported.`,
    );
    console.log(
      `   ✅ Verified: Correct number of outflow transactions (${expectedNumberOfOutflows}) imported.`,
    );

    // 4. Verification: Retrieve all transactions using list_all() (a function API) and assert structural correctness
    const allStoredTransactions = await store.list_all();
    assertEquals(
      allStoredTransactions.length,
      expectedNumberOfOutflows,
      "list_all() should return the same number of imported transactions.",
    );
    console.log(
      "   ✅ Verified: list_all() retrieves all imported transactions.",
    );

    // Define expected values for the imported transactions (dates are UTC)
    const expectedTxDetails = [
      {
        date: new Date("2025-01-03T00:00:00.000Z"),
        merchant_text: "Starbucks Inc.",
        amount: 4.25,
      },
      {
        date: new Date("2025-01-05T00:00:00.000Z"),
        merchant_text: "Whole Foods Market",
        amount: 52.3,
      },
      {
        date: new Date("2025-01-07T00:00:00.000Z"),
        merchant_text: "Electric Company Payment",
        amount: 150,
      },
      {
        date: new Date("2025-01-08T00:00:00.000Z"),
        merchant_text: "ATM Withdrawal",
        amount: 60,
      },
      {
        date: new Date("2025-01-11T00:00:00.000Z"),
        merchant_text: "Netflix Subscription",
        amount: 15.99,
      },
    ];

    // Sort stored transactions by date and then amount for consistent comparison
    allStoredTransactions.sort((a, b) => {
      if (a.date.getTime() !== b.date.getTime()) {
        return a.date.getTime() - b.date.getTime();
      }
      return a.amount - b.amount;
    });

    for (let i = 0; i < expectedNumberOfOutflows; i++) {
      const storedTx = allStoredTransactions[i];
      const expectedTx = expectedTxDetails[i];

      console.log(
        `   Verifying transaction ${
          i + 1
        }: ${storedTx.merchant_text} - ${storedTx.amount}`,
      );

      assertExists(storedTx._id, "Transaction should have a MongoDB _id.");
      assertExists(storedTx.tx_id, "Transaction should have a tx_id.");
      assertEquals(
        storedTx.owner_id,
        ownerId.toString(),
        `Transaction ${i} owner_id should match.`,
      );
      assertEquals(
        storedTx.status,
        TransactionStatus.UNLABELED,
        `Transaction ${i} status should be UNLABELED.`,
      );
      assertInstanceOf(
        storedTx.date,
        Date,
        `Transaction ${i} date should be a Date object.`,
      );
      assertEquals(
        storedTx.date.toISOString(),
        expectedTx.date.toISOString(),
        `Transaction ${i} date (${storedTx.date.toISOString()}) should match expected (${expectedTx.date.toISOString()}).`,
      );
      assertEquals(
        storedTx.merchant_text,
        expectedTx.merchant_text,
        `Transaction ${i} merchant_text should match and be trimmed.`,
      );
      assertEquals(
        typeof storedTx.amount,
        "number",
        `Transaction ${i} amount should be a number.`,
      );
      assertEquals(
        storedTx.amount > 0,
        true,
        `Transaction ${i} amount should be positive.`,
      );
      assertEquals(
        storedTx.amount,
        expectedTx.amount,
        `Transaction ${i} amount should match.`,
      );
      console.log(
        `      ✅ Transaction ${i + 1} structural assertions passed.`,
      );
    }

    // Verify that inflow transactions were indeed skipped.
    // This is already implicitly covered by checking 'allStoredTransactions.length' against 'expectedNumberOfOutflows',
    // which was populated using 'store.list_all()'.
    assertEquals(
      allStoredTransactions.length, // Reusing the result from a function API
      expectedNumberOfOutflows,
      "Database should only contain the expected outflow transactions (no inflows).",
    );
    console.log(
      "   ✅ Verified: Inflow transactions were successfully skipped, and only outflows stored.",
    );
  } finally {
    // 5. Cleanup: Close the database connection and drop the test database
    // Ensure the MongoClient is closed, which also drops the test database.
    if (client) {
      await client.close(true);
    }
    console.log("Database client closed and test database dropped.");
  }
});
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
    console.log(`Reading CSV from: ${SAMPLE_CSV_PATH}`);
    const csvUrl = new URL(SAMPLE_CSV_PATH, import.meta.url);
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
    assertExists(
      txToLabel1,
      "There should be at least one transaction to label.",
    );
    const txId1 = Id.from(txToLabel1.tx_id);
    console.log(
      `Attempting to mark transaction ${txId1.toString()} as LABELED.`,
    );

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
    console.log(
      `   ✅ Verified: Transaction ${txId1.toString()} is now LABELED.`,
    );

    // 4. Demonstrate mark_labeled (success case 2)
    // As per prompt, demonstrate mark_labeled at most 1-2 times. We'll do a second one.
    const txToLabel2 = importedTransactions[1]; // Pick the second imported transaction
    assertExists(
      txToLabel2,
      "There should be at least two transactions to label.",
    );
    const txId2 = Id.from(txToLabel2.tx_id);
    console.log(
      `Attempting to mark transaction ${txId2.toString()} as LABELED.`,
    );

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
    console.log(
      `   ✅ Verified: Transaction ${txId2.toString()} is now LABELED.`,
    );

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
    console.log(
      "   ✅ Verified: Cannot mark a transaction owned by another user.",
    );
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
    console.log(
      "   ✅ Verified: Cannot re-mark an already labeled transaction.",
    );
  } finally {
    // 6. Cleanup: Close the database connection and drop the test database
    if (client) {
      await client.close(true);
    }
    console.log("Database client closed and test database dropped.");
  }
});

```

\[@sample-spendings.csv]\[/src/concepts/FlashFinance/Transaction/test-actions/sample/sample-spendings.csv]

## Test Parsing of Sample Data & Mark\_Labeled Actions

Check file:///C:/Users/mgriz/flashfinance/src/concepts/FlashFinance/Transaction/test-actions/test-parsing.ts
running 2 tests from ./src/concepts/FlashFinance/Transaction/test-actions/test-parsing.ts
TransactionStore: CSV import parses and stores outflow transactions correctly ...
\------- output -------

\--- Test CSV Import for Owner: 7634b657-b6b1-43c8-9133-f098dfcab080 ---
Reading CSV from: ./sample/sample-spendings.csv
CSV content read successfully.
Calling import\_transactions...
Skipping value (2500) from credit-identified column (assumed inflow).
Skipping value (-12.5) from credit-identified column (assumed inflow).
Skipping value (2400) from credit-identified column (assumed inflow).
Skipping negative value (-35) from debit-identified column (assumed inflow).
Skipping value (350) from credit-identified column (assumed inflow).
Successfully imported 5 transactions.
import\_transactions returned 5 transactions.
✅ Verified: Correct number of outflow transactions (5) imported.
✅ Verified: list\_all() retrieves all imported transactions.
Verifying transaction 1: Starbucks Inc. - 4.25
✅ Transaction 1 structural assertions passed.
Verifying transaction 2: Whole Foods Market - 52.3
✅ Transaction 2 structural assertions passed.
Verifying transaction 3: Electric Company Payment - 150
✅ Transaction 3 structural assertions passed.
Verifying transaction 4: ATM Withdrawal - 60
✅ Transaction 4 structural assertions passed.
Verifying transaction 5: Netflix Subscription - 15.99
✅ Transaction 5 structural assertions passed.
✅ Verified: Inflow transactions were successfully skipped, and only outflows stored.
Database client closed and test database dropped.
\----- output end -----
TransactionStore: CSV import parses and stores outflow transactions correctly ... ok (726ms)
TransactionStore: mark\_labeled action behaves correctly ...
\------- output -------

\--- Test mark\_labeled for Owner: 62c933ec-c370-4ba0-a397-3a271e576aeb ---
Reading CSV from: ./sample/sample-spendings.csv
CSV content read successfully.
Calling import\_transactions...
Skipping value (2500) from credit-identified column (assumed inflow).
Skipping value (-12.5) from credit-identified column (assumed inflow).
Skipping value (2400) from credit-identified column (assumed inflow).
Skipping negative value (-35) from debit-identified column (assumed inflow).
Skipping value (350) from credit-identified column (assumed inflow).
Successfully imported 5 transactions.
✅ Imported 5 transactions successfully.
✅ All imported transactions are verified to be initially UNLABELED.
Attempting to mark transaction cb66ec8f-53b5-4133-a8aa-c7b4a24e4279 as LABELED.
✅ mark\_labeled for cb66ec8f-53b5-4133-a8aa-c7b4a24e4279 successful.
✅ Verified: Transaction cb66ec8f-53b5-4133-a8aa-c7b4a24e4279 is now LABELED.
Attempting to mark transaction 9643efcf-d61c-4184-a292-35a43a3b09c9 as LABELED.
✅ mark\_labeled for 9643efcf-d61c-4184-a292-35a43a3b09c9 successful.
✅ Verified: Transaction 9643efcf-d61c-4184-a292-35a43a3b09c9 is now LABELED.
Attempting to mark non-existent transaction ID: f02f654e-12aa-4118-9dd7-c2738269e688.
✅ Verified: Cannot mark a non-existent transaction.
Attempting to mark transaction 58bec232-7797-42f7-85ff-23088654dc4e with wrong owner ID: 31a43f51-cc8c-4156-92f2-62d6e22658e3.
✅ Verified: Cannot mark a transaction owned by another user.
✅ Verified: Transaction 58bec232-7797-42f7-85ff-23088654dc4e status remained UNLABELED.
Attempting to re-mark an already labeled transaction ID: cb66ec8f-53b5-4133-a8aa-c7b4a24e4279.
✅ Verified: Cannot re-mark an already labeled transaction.
Database client closed and test database dropped.
\----- output end -----
TransactionStore: mark\_labeled action behaves correctly ... ok (1s)

ok | 2 passed | 0 failed (1s)
