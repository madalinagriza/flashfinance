---
timestamp: 'Sun Oct 19 2025 10:33:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_103330.2c7cb929.md]]'
content_id: 4415144c7ddec35d95b2ea4ff3f1bd24c32b0cba2e8fc38ac206905cb1530754
---

# response:

To address the request, I'll first create the `testsample.csv` with a mix of valid, invalid, and edge-case transaction rows. Then, I'll create a new Deno test file, `test-parsing-edge-cases.ts`, structured similarly to `test-parsing.ts`, to cover the proposed scenarios for the `importTransactions` action.

### 1. `testsample.csv` (Mixed Valid and Invalid Rows)

This CSV file contains a variety of scenarios to test the robustness of the `parse_csv_info` method, including valid outflows, inflows, invalid amounts, invalid dates, missing data, and mixed-type columns.

**File:** `src/concepts/FlashFinance/Transaction/test-actions/sample/testsample.csv`

```csv
Date,Description,Debit,Credit,Type,Notes
2024-03-01,Coffee Shop,5.00,,DR,Valid outflow
2024-03-02,Parking Meter,1.50,,DR,Valid outflow
2024-03-03,Salary,,2000.00,CR,Inflow (should be skipped)
2024-03-04,Refund,-10.00,,DR,Negative debit (inflow, should be skipped)
2024-03-05,Gift Shop,BAD_AMOUNT,,DR,Invalid amount (should be skipped)
2024-03-06,Zero Transaction,0.00,,DR,Zero amount (should be skipped)
2024-03-07,Missing Debit,,0.00,DR,Debit column empty, Credit is zero (should be skipped)
,Lunch,12.00,,DR,Missing date (should use Epoch date)
INVALID_DATE,Hardware Store,25.00,,DR,Invalid date (should use Epoch date)
2024-03-08,Dividends,100.00,,CR,Value in Debit column, Type is CR (Current implementation treats as outflow due to Debit column)
2024-03-09,Book Store,20.00,,,Generic amount, assumed outflow
2024-03-10,Bill Payment,-50.00,,,Generic negative amount (assumed inflow, should be skipped)

2024-03-11,Short Row,,,,Too few columns (missing amount field, should be skipped)
2024-03-12,Extra Col,10.00,,DR,Extra Data,Valid outflow with extra data (should be imported)
```

**Expected Transactions from `testsample.csv`:**
Based on the `parse_csv_info` logic, only positive outflow transactions are imported. The `Date` column takes precedence, then `Debit` then `Credit` then a generic `Amount` column. If a `Debit` or `Credit` column is present, the `Type` column is *not* used to override the inflow/outflow determination from the debit/credit column itself.

1. `2024-03-01,Coffee Shop,5.00` (Valid Outflow)
2. `2024-03-02,Parking Meter,1.50` (Valid Outflow)
3. `,Lunch,12.00` (Missing Date, Valid Outflow - will have Epoch date)
4. `INVALID_DATE,Hardware Store,25.00` (Invalid Date, Valid Outflow - will have Epoch date)
5. `2024-03-08,Dividends,100.00` (Value in `Debit` column, imported as outflow despite `Type=CR`)
6. `2024-03-09,Book Store,20.00` (Generic amount, assumed outflow)
7. `2024-03-12,Extra Col,10.00` (Valid Outflow with extra data)

Total expected imported transactions: **7**

***

### 2. Deno Test for Edge Cases

This new test file, `test-parsing-edge-cases.ts`, will contain dedicated tests for the `importTransactions` action covering various non-ideal CSV inputs and a test for invalid `owner_id`.

**File:** `src/concepts/FlashFinance/Transaction/test-actions/test-parsing-edge-cases.ts`

```typescript
import {
  assertEquals,
  assertExists,
  assertInstanceOf,
  assertRejects,
} from "jsr:@std/assert";
import { Db, MongoClient } from "npm:mongodb";
import { Id, TransactionStatus, TransactionStore } from "../transaction.ts";
import { testDb } from "@utils/database.ts";

// Determine the path to the sample CSV files
const TESTS_CSV_PATH = "./sample/testsample.csv";
const EMPTY_CSV_PATH = "./sample/empty.csv";
const HEADERS_ONLY_CSV_PATH = "./sample/headers-only.csv";
const INFLOWS_ONLY_CSV_PATH = "./sample/inflows-only.csv";
const ZERO_NEGATIVE_AMOUNTS_CSV_PATH = "./sample/zero-negative-amounts.csv";
const MISSING_AMOUNT_COL_CSV_PATH = "./sample/missing-amount-col.csv";

// Helper to create small CSV files for specific tests
async function createTempCsvFile(
  path: string,
  content: string,
): Promise<string> {
  const url = new URL(path, import.meta.url);
  await Deno.writeTextFile(url, content);
  return url.pathname;
}

// Ensure cleanup of temporary files
async function cleanupTempCsvFile(path: string) {
  const url = new URL(path, import.meta.url);
  try {
    await Deno.remove(url);
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      console.error(`Failed to clean up temp CSV file ${path}:`, e);
    }
  }
}

Deno.test("TransactionStore: import_transactions handles empty CSV content", async () => {
  let db: Db | null = null;
  let client: MongoClient | null = null;
  const tempFilePath = EMPTY_CSV_PATH;

  try {
    await createTempCsvFile(tempFilePath, "");

    [db, client] = await testDb();
    const store = new TransactionStore(db);
    const ownerId = Id.generate();

    console.log(`\n--- Test: Empty CSV import for Owner: ${ownerId.toString()} ---`);

    const csvUrl = new URL(tempFilePath, import.meta.url);
    const csvContent = await Deno.readTextFile(csvUrl);

    const importedTransactions = await store.import_transactions(
      ownerId,
      csvContent,
    );

    assertEquals(
      importedTransactions.length,
      0,
      "Expected no transactions to be imported from empty CSV.",
    );
    const allStoredTransactions = await store.list_all();
    assertEquals(
      allStoredTransactions.length,
      0,
      "Database should be empty after importing empty CSV.",
    );
    console.log("   ✅ Verified: Empty CSV resulted in no imported transactions.");
  } finally {
    if (client) await client.close(true);
    await cleanupTempCsvFile(tempFilePath);
  }
});

Deno.test("TransactionStore: import_transactions handles CSV with only headers", async () => {
  let db: Db | null = null;
  let client: MongoClient | null = null;
  const tempFilePath = HEADERS_ONLY_CSV_PATH;

  try {
    await createTempCsvFile(tempFilePath, "Date,Description,Amount");

    [db, client] = await testDb();
    const store = new TransactionStore(db);
    const ownerId = Id.generate();

    console.log(`\n--- Test: Headers-only CSV import for Owner: ${ownerId.toString()} ---`);

    const csvUrl = new URL(tempFilePath, import.meta.url);
    const csvContent = await Deno.readTextFile(csvUrl);

    const importedTransactions = await store.import_transactions(
      ownerId,
      csvContent,
    );

    assertEquals(
      importedTransactions.length,
      0,
      "Expected no transactions to be imported from headers-only CSV.",
    );
    const allStoredTransactions = await store.list_all();
    assertEquals(
      allStoredTransactions.length,
      0,
      "Database should be empty after importing headers-only CSV.",
    );
    console.log(
      "   ✅ Verified: Headers-only CSV resulted in no imported transactions.",
    );
  } finally {
    if (client) await client.close(true);
    await cleanupTempCsvFile(tempFilePath);
  }
});

Deno.test("TransactionStore: import_transactions skips CSV rows with only inflows", async () => {
  let db: Db | null = null;
  let client: MongoClient | null = null;
  const tempFilePath = INFLOWS_ONLY_CSV_PATH;

  try {
    const csvContent = `Date,Description,Debit,Credit,Type
2024-01-01,Deposit,,100.00,CR
2024-01-02,Refund from Amazon,-50.00,,DR
2024-01-03,Salary Deposit,,2500.00,CR
2024-01-04,Generic Inflow Amount,-75.00,,
`;
    await createTempCsvFile(tempFilePath, csvContent);

    [db, client] = await testDb();
    const store = new TransactionStore(db);
    const ownerId = Id.generate();

    console.log(`\n--- Test: Inflows-only CSV import for Owner: ${ownerId.toString()} ---`);

    const csvUrl = new URL(tempFilePath, import.meta.url);
    const content = await Deno.readTextFile(csvUrl);

    const importedTransactions = await store.import_transactions(
      ownerId,
      content,
    );

    assertEquals(
      importedTransactions.length,
      0,
      "Expected no transactions to be imported from an inflows-only CSV.",
    );
    const allStoredTransactions = await store.list_all();
    assertEquals(
      allStoredTransactions.length,
      0,
      "Database should be empty after importing inflows-only CSV.",
    );
    console.log(
      "   ✅ Verified: Inflow transactions were successfully skipped.",
    );
  } finally {
    if (client) await client.close(true);
    await cleanupTempCsvFile(tempFilePath);
  }
});

Deno.test("TransactionStore: import_transactions skips transactions with zero or negative outflow amounts", async () => {
  let db: Db | null = null;
  let client: MongoClient | null = null;
  const tempFilePath = ZERO_NEGATIVE_AMOUNTS_CSV_PATH;

  try {
    const csvContent = `Date,Description,Debit,Type
2024-01-01,Zero Purchase,0.00,DR
2024-01-02,Negative Debit,-15.00,DR
2024-01-03,Zero Generic Amount,0.00,
`;
    await createTempCsvFile(tempFilePath, csvContent);

    [db, client] = await testDb();
    const store = new TransactionStore(db);
    const ownerId = Id.generate();

    console.log(
      `\n--- Test: Zero/Negative Outflow CSV import for Owner: ${ownerId.toString()} ---`,
    );

    const csvUrl = new URL(tempFilePath, import.meta.url);
    const content = await Deno.readTextFile(csvUrl);

    const importedTransactions = await store.import_transactions(
      ownerId,
      content,
    );

    assertEquals(
      importedTransactions.length,
      0,
      "Expected no transactions to be imported with zero or negative outflow amounts.",
    );
    const allStoredTransactions = await store.list_all();
    assertEquals(
      allStoredTransactions.length,
      0,
      "Database should be empty after importing zero/negative amounts CSV.",
    );
    console.log(
      "   ✅ Verified: Transactions with zero or negative amounts were skipped.",
    );
  } finally {
    if (client) await client.close(true);
    await cleanupTempCsvFile(tempFilePath);
  }
});

Deno.test("TransactionStore: import_transactions handles mixed valid and invalid rows from testsample.csv", async () => {
  let db: Db | null = null;
  let client: MongoClient | null = null;

  try {
    [db, client] = await testDb();
    const store = new TransactionStore(db);
    const ownerId = Id.generate();

    console.log(
      `\n--- Test: Mixed Valid/Invalid CSV import for Owner: ${ownerId.toString()} ---`,
    );

    const csvUrl = new URL(TESTS_CSV_PATH, import.meta.url);
    const csvContent = await Deno.readTextFile(csvUrl);

    const importedTransactions = await store.import_transactions(
      ownerId,
      csvContent,
    );

    // Based on testsample.csv and parsing logic, 7 valid outflow transactions are expected.
    const expectedNumberOfOutflows = 7;
    assertEquals(
      importedTransactions.length,
      expectedNumberOfOutflows,
      `Expected ${expectedNumberOfOutflows} outflow transactions to be imported from mixed CSV.`,
    );
    console.log(
      `   ✅ Verified: Correct number of outflow transactions (${expectedNumberOfOutflows}) imported from mixed CSV.`,
    );

    const allStoredTransactions = await store.list_all();
    assertEquals(
      allStoredTransactions.length,
      expectedNumberOfOutflows,
      "list_all() should return the same number of imported transactions.",
    );

    // Define expected values for the imported transactions (dates are UTC)
    // Sorted by date and then amount for consistent comparison. Epoch dates will be Jan 1, 1970 UTC.
    const expectedTxDetails = [
      {
        date: new Date("1970-01-01T00:00:00.000Z"),
        merchant_text: "Lunch",
        amount: 12.00,
      }, // Missing date
      {
        date: new Date("1970-01-01T00:00:00.000Z"),
        merchant_text: "Hardware Store",
        amount: 25.00,
      }, // Invalid date
      {
        date: new Date("2024-03-01T00:00:00.000Z"),
        merchant_text: "Coffee Shop",
        amount: 5.00,
      },
      {
        date: new Date("2024-03-02T00:00:00.000Z"),
        merchant_text: "Parking Meter",
        amount: 1.50,
      },
      {
        date: new Date("2024-03-08T00:00:00.000Z"),
        merchant_text: "Dividends",
        amount: 100.00,
      },
      {
        date: new Date("2024-03-09T00:00:00.000Z"),
        merchant_text: "Book Store",
        amount: 20.00,
      },
      {
        date: new Date("2024-03-12T00:00:00.000Z"),
        merchant_text: "Extra Col",
        amount: 10.00,
      },
    ];

    allStoredTransactions.sort((a, b) => {
      if (a.date.getTime() !== b.date.getTime()) {
        return a.date.getTime() - b.date.getTime();
      }
      return a.amount - b.amount;
    });

    for (let i = 0; i < expectedNumberOfOutflows; i++) {
      const storedTx = allStoredTransactions[i];
      const expectedTx = expectedTxDetails[i];

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
      assertEquals(
        storedTx.date.toISOString(),
        expectedTx.date.toISOString(),
        `Transaction ${i} date should match.`,
      );
      assertEquals(
        storedTx.merchant_text,
        expectedTx.merchant_text,
        `Transaction ${i} merchant_text should match.`,
      );
      assertEquals(
        storedTx.amount,
        expectedTx.amount,
        `Transaction ${i} amount should match.`,
      );
    }
    console.log("   ✅ Verified: All valid transactions from mixed CSV imported correctly.");
  } finally {
    if (client) await client.close(true);
  }
});

Deno.test("TransactionStore: import_transactions skips rows when essential amount columns are missing", async () => {
  let db: Db | null = null;
  let client: MongoClient | null = null;
  const tempFilePath = MISSING_AMOUNT_COL_CSV_PATH;

  try {
    const csvContent = `Date,Description
2024-01-01,Just a description
2024-01-02,Another description
`;
    await createTempCsvFile(tempFilePath, csvContent);

    [db, client] = await testDb();
    const store = new TransactionStore(db);
    const ownerId = Id.generate();

    console.log(
      `\n--- Test: Missing Amount Column CSV import for Owner: ${ownerId.toString()} ---`,
    );

    const csvUrl = new URL(tempFilePath, import.meta.url);
    const content = await Deno.readTextFile(csvUrl);

    const importedTransactions = await store.import_transactions(
      ownerId,
      content,
    );

    assertEquals(
      importedTransactions.length,
      0,
      "Expected no transactions to be imported when amount column is missing.",
    );
    const allStoredTransactions = await store.list_all();
    assertEquals(
      allStoredTransactions.length,
      0,
      "Database should be empty after importing CSV with missing amount column.",
    );
    console.log(
      "   ✅ Verified: Transactions were skipped due to missing amount column.",
    );
  } finally {
    if (client) await client.close(true);
    await cleanupTempCsvFile(tempFilePath);
  }
});

Deno.test("TransactionStore: import_transactions rejects falsy owner_id", async () => {
  let db: Db | null = null;
  let client: MongoClient | null = null;
  const tempFilePath = EMPTY_CSV_PATH; // Use any valid CSV path, content doesn't matter for this test.

  try {
    await createTempCsvFile(tempFilePath, "Date,Description,Amount\n2024-01-01,Test,10.00");

    [db, client] = await testDb();
    const store = new TransactionStore(db);

    console.log(`\n--- Test: Falsy Owner ID for import_transactions ---`);

    const csvUrl = new URL(tempFilePath, import.meta.url);
    const csvContent = await Deno.readTextFile(csvUrl);

    // Test with null owner_id
    await assertRejects(
      async () => {
        // Type casting to 'any' to allow testing runtime validation for falsy values
        await store.import_transactions(null as any, csvContent);
      },
      Error,
      "Owner ID is required for importing transactions.",
      "Should reject import with null owner_id.",
    );
    console.log("   ✅ Verified: import_transactions rejects null owner_id.");

    // Test with undefined owner_id
    await assertRejects(
      async () => {
        await store.import_transactions(undefined as any, csvContent);
      },
      Error,
      "Owner ID is required for importing transactions.",
      "Should reject import with undefined owner_id.",
    );
    console.log("   ✅ Verified: import_transactions rejects undefined owner_id.");

    const allStoredTransactions = await store.list_all();
    assertEquals(
      allStoredTransactions.length,
      0,
      "Database should remain empty after failed imports due to falsy owner_id.",
    );
  } finally {
    if (client) await client.close(true);
    await cleanupTempCsvFile(tempFilePath);
  }
});

```
