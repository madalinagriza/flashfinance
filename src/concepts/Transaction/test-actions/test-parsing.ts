import {
  assertEquals,
  assertExists,
  assertInstanceOf,
  assertRejects,
} from "jsr:@std/assert";
import { Db, MongoClient } from "npm:mongodb"; // Import Db and MongoClient types
import TransactionConcept, {
  Id,
  TransactionStatus,
} from "../TransactionConcept.ts";
import { testDb } from "@utils/database.ts";

// Determine the path to the sample CSV file
const SAMPLE_CSV_PATH = "./sample/sample-spendings.csv";

Deno.test("TransactionConcept: CSV import parses and stores outflow transactions correctly", async () => {
  // Declare db and client variables to be assigned in the try block
  // and used in the finally block for cleanup.
  let db: Db | null = null;
  let client: MongoClient | null = null;

  try {
    // 1. Setup: Initialize testDb and TransactionConcept
    // Correctly destructure the return value of testDb() into Db and MongoClient instances.
    [db, client] = await testDb();
    // The testDb() utility is expected to return an already connected Db instance.
    // Therefore, no explicit 'connect()' call is needed here on the Db instance.
    const store = new TransactionConcept(db);

    const ownerId = Id.generate(); // Generate a new owner ID for this test
    console.log(`\n--- Test CSV Import for Owner: ${ownerId.toString()} ---`);

    // 2. Action: Read CSV content and import transactions
    console.log(`Reading CSV from: ${SAMPLE_CSV_PATH}`);

    const csvUrl = new URL(SAMPLE_CSV_PATH, import.meta.url);
    const csvContent = await Deno.readTextFile(csvUrl);

    assertExists(csvContent, "CSV content should not be empty.");
    console.log("CSV content read successfully.");

    console.log("Calling import_transactions...");
    await store.import_transactions(ownerId, csvContent);
    console.log("import_transactions completed.");

    // 3. Verification: Check the number of imported transactions
    // Based on sample-spendings.csv and the parsing logic (positive debits + normalized negatives):
    // 1. "Starbucks Inc." 4.25 DR -> Outflow
    // 2. "Payroll Deposit" 2500 CR -> Inflow (skipped)
    // 3. "Whole Foods Market" 52.3 DR -> Outflow
    // 4. "Refund from Amazon" -12.5 CR -> Inflow (skipped)
    // 5. "Electric Company Payment" 150 DR -> Outflow
    // 6. "ATM Withdrawal" 60 DR -> Outflow
    // 7. "Salary Deposit" 2400 CR -> Inflow (skipped)
    // 8. "Gym Membership" -35 DR -> Negative debit normalized to 35 outflow
    // 9. "Netflix Subscription" 15.99 DR -> Outflow
    // 10. "Credit Card Payment" 350 CR -> Inflow (skipped)
    const expectedNumberOfOutflows = 6;
    // Verify by reading back from the DB using list_all()
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
        date: new Date("2025-01-10T00:00:00.000Z"),
        merchant_text: "Gym Membership",
        amount: 35,
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
Deno.test("TransactionConcept: mark_labeled action behaves correctly", async () => {
  // Declare db and client variables to be assigned in the try block
  // and used in the finally block for cleanup.
  let db: Db | null = null;
  let client: MongoClient | null = null;

  try {
    // 1. Setup: Initialize testDb and TransactionConcept
    // Correctly destructure the return value of testDb() into Db and MongoClient instances.
    [db, client] = await testDb();
    const store = new TransactionConcept(db);

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
    await store.import_transactions(ownerId, csvContent);
    const importedTransactions = await store.list_all();
    // Based on sample-spendings.csv and the parsing logic (positive debits + normalized negatives):
    // 1. "Starbucks Inc." 4.25 DR -> Outflow (imported)
    // 2. "Payroll Deposit" 2500 CR -> Inflow (skipped)
    // 3. "Whole Foods Market" 52.3 DR -> Outflow (imported)
    // 4. "Refund from Amazon" -12.5 CR -> Inflow (skipped)
    // 5. "Electric Company Payment" 150 DR -> Outflow (imported)
    // 6. "ATM Withdrawal" 60 DR -> Outflow (imported)
    // 7. "Salary Deposit" 2400 CR -> Inflow (skipped)
    // 8. "Gym Membership" -35 DR -> Negative debit normalized to 35 outflow (imported)
    // 9. "Netflix Subscription" 15.99 DR -> Outflow (imported)
    // 10. "Credit Card Payment" 350 CR -> Inflow (skipped)
    const expectedNumberOfOutflows = 6;
    assertEquals(
      importedTransactions.length,
      expectedNumberOfOutflows,
      `Expected ${expectedNumberOfOutflows} outflow transactions to be imported.`,
    );
    console.log(
      `   ✅ Imported ${importedTransactions.length} transactions successfully.`,
    );

    // Confirm the previously negative debit is stored as a positive outflow.
    const gymMembershipTx = importedTransactions.find((tx) =>
      tx.merchant_text === "Gym Membership"
    );
    if (!gymMembershipTx) {
      throw new Error(
        "Gym Membership transaction should be present after import.",
      );
    }
    assertEquals(
      gymMembershipTx.amount,
      35,
      "Negative debit should be normalized to a positive outflow amount.",
    );

    // Verify all imported transactions are UNLABELED initially
    for (const tx of importedTransactions) {
      const fetchedTxList = await store.getTransaction(
        ownerId,
        Id.from(tx.tx_id),
      );
      assertEquals(
        fetchedTxList.length,
        1,
        `Expected a single transaction for ${tx.tx_id}.`,
      );
      const fetchedTxWrapper = fetchedTxList[0];
      const fetchedTx = fetchedTxWrapper?.tx;
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
    const fetchedTxList1 = await store.getTransaction(ownerId, txId1);
    assertEquals(
      fetchedTxList1.length,
      1,
      `Expected a single transaction for ${txId1.toString()}.`,
    );
    const fetchedTxWrapper1 = fetchedTxList1[0];
    const fetchedTx1 = fetchedTxWrapper1?.tx;
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
    const fetchedTxList2 = await store.getTransaction(ownerId, txId2);
    assertEquals(
      fetchedTxList2.length,
      1,
      `Expected a single transaction for ${txId2.toString()}.`,
    );
    const fetchedTxWrapper2 = fetchedTxList2[0];
    const fetchedTx2 = fetchedTxWrapper2?.tx;
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
    const fetchedTxWrongOwnerList = await store.getTransaction(
      ownerId,
      txIdWrongOwner,
    );
    assertEquals(
      fetchedTxWrongOwnerList.length,
      1,
      `Expected a single transaction for ${txIdWrongOwner.toString()}.`,
    );
    const fetchedTxWrongOwnerWrapper = fetchedTxWrongOwnerList[0];
    const fetchedTxWrongOwner = fetchedTxWrongOwnerWrapper?.tx;
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

Deno.test("TransactionConcept: retrieve labeled and unlabeled transactions correctly", async () => {
  let db: Db | null = null;
  let client: MongoClient | null = null;

  try {
    [db, client] = await testDb();
    const store = new TransactionConcept(db);

    const ownerId1 = Id.generate();
    const ownerId2 = Id.generate();
    const nonExistentOwnerId = Id.generate();

    console.log(
      `\n--- Test Retrieve Labeled/Unlabeled for Owners: ${ownerId1.toString()}, ${ownerId2.toString()} ---`,
    );

    // Prepare CSV content for ownerId1
    const csvContentOwner1 = `Date,Description,Amount,Type
2024-01-01,Groceries,50.00,DR
2024-01-02,Coffee,5.50,DR
2024-01-03,Gas Station,40.00,DR
2024-01-04,Books,25.00,DR`;

    // Prepare CSV content for ownerId2
    const csvContentOwner2 = `Date,Description,Amount,Type
2024-01-05,Restaurant,75.00,DR
2024-01-06,Online Shopping,30.00,DR`;

    // Import transactions for ownerId1
    await store.import_transactions(ownerId1, csvContentOwner1);
    const allTxOwner1 = await store.get_unlabeled_transactions(ownerId1);
    assertEquals(
      allTxOwner1.length,
      4,
      "Owner1 should have 4 initial transactions.",
    );

    // Import transactions for ownerId2
    await store.import_transactions(ownerId2, csvContentOwner2);
    const allTxOwner2 = await store.get_unlabeled_transactions(ownerId2);
    assertEquals(
      allTxOwner2.length,
      2,
      "Owner2 should have 2 initial transactions.",
    );

    // Sort for consistent access in tests
    allTxOwner1.sort((a, b) => a.merchant_text.localeCompare(b.merchant_text));
    allTxOwner2.sort((a, b) => a.merchant_text.localeCompare(b.merchant_text));

    // Mark some transactions as labeled for ownerId1
    const booksTx = allTxOwner1.find((t) => t.merchant_text === "Books")!;
    const groceriesTx = allTxOwner1.find((t) =>
      t.merchant_text === "Groceries"
    )!;
    await store.mark_labeled(Id.from(booksTx.tx_id), ownerId1);
    await store.mark_labeled(Id.from(groceriesTx.tx_id), ownerId1);

    // Mark 1 transaction as labeled for ownerId2
    await store.mark_labeled(Id.from(allTxOwner2[1].tx_id), ownerId2); // Restaurant

    console.log("   Setup complete: Transactions imported and some labeled.");

    // --- Test get_unlabeled_transactions ---
    console.log("\n   Testing get_unlabeled_transactions...");

    const unlabeledTxOwner1 = await store.get_unlabeled_transactions(ownerId1);
    assertEquals(
      unlabeledTxOwner1.length,
      2,
      "Owner1 should have 2 unlabeled transactions.",
    );
    const unlabeledMerchants1 = unlabeledTxOwner1.map((tx) => tx.merchant_text)
      .sort();
    assertEquals(
      unlabeledMerchants1,
      ["Coffee", "Gas Station"],
      "Owner1 unlabeled merchants should match.",
    );
    console.log(
      `   ✅ Owner1 has ${unlabeledTxOwner1.length} unlabeled transactions.`,
    );

    const unlabeledTxOwner2 = await store.get_unlabeled_transactions(ownerId2);
    assertEquals(
      unlabeledTxOwner2.length,
      1,
      "Owner2 should have 1 unlabeled transaction.",
    );
    const unlabeledMerchants2 = unlabeledTxOwner2.map((tx) => tx.merchant_text)
      .sort();
    assertEquals(
      unlabeledMerchants2,
      ["Online Shopping"],
      "Owner2 unlabeled merchants should match.",
    );
    console.log(
      `   ✅ Owner2 has ${unlabeledTxOwner2.length} unlabeled transactions.`,
    );

    const unlabeledTxNonExistent = await store.get_unlabeled_transactions(
      nonExistentOwnerId,
    );
    assertEquals(
      unlabeledTxNonExistent.length,
      0,
      "Non-existent owner should have 0 unlabeled transactions.",
    );
    console.log(
      `   ✅ Non-existent owner has ${unlabeledTxNonExistent.length} unlabeled transactions.`,
    );

    // --- Test get_labeled_transactions ---
    console.log("\n   Testing get_labeled_transactions...");

    const labeledTxOwner1 = await store.get_labeled_transactions(ownerId1);
    assertEquals(
      labeledTxOwner1.length,
      2,
      "Owner1 should have 2 labeled transactions.",
    );
    const labeledMerchants1 = labeledTxOwner1.map((tx) => tx.merchant_text)
      .sort();
    assertEquals(
      labeledMerchants1,
      ["Books", "Groceries"],
      "Owner1 labeled merchants should match.",
    );
    console.log(
      `   ✅ Owner1 has ${labeledTxOwner1.length} labeled transactions.`,
    );

    const labeledTxOwner2 = await store.get_labeled_transactions(ownerId2);
    assertEquals(
      labeledTxOwner2.length,
      1,
      "Owner2 should have 1 labeled transaction.",
    );
    const labeledMerchants2 = labeledTxOwner2.map((tx) => tx.merchant_text)
      .sort();
    assertEquals(
      labeledMerchants2,
      ["Restaurant"],
      "Owner2 labeled merchants should match.",
    );
    console.log(
      `   ✅ Owner2 has ${labeledTxOwner2.length} labeled transactions.`,
    );

    const labeledTxNonExistent = await store.get_labeled_transactions(
      nonExistentOwnerId,
    );
    assertEquals(
      labeledTxNonExistent.length,
      0,
      "Non-existent owner should have 0 labeled transactions.",
    );
    console.log(
      `   ✅ Non-existent owner has ${labeledTxNonExistent.length} labeled transactions.`,
    );

    console.log("\n--- All Labeled/Unlabeled retrieval tests passed. ---");
  } finally {
    if (client) {
      await client.close(true);
    }
  }
});
