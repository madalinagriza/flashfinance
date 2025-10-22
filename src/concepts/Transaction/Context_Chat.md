
# prompt: add a function to TransactionConcept.ts that returns the transactions which are unlabeled, belonging to an owner_id. Likewise, make a function that returns all the labeled transactions beloging to an user_id. For each, devise a small testcase in test-parsing.ts. The data shuould be of 2-3 entries but demonstrate functionality


[@Spec](Spec.md)

 [@TransactionConcept.ts](/src/concepts/Transaction/TransactionConcept.ts) 

[@test-parsing-edge-cases.ts](/src/concepts/Transaction/test-actions/test-parsing-edge-cases.ts)

[@test-parsing.ts](/src/concepts/Transaction/test-actions/test-parsing.ts)



# response:

## Plan:

1.  **Modify `src/concepts/Transaction/TransactionConcept.ts`**:
    *   Add `get_unlabeled_transactions(owner_id: Id)` function. This will query the MongoDB collection for `TransactionDoc`s where `owner_id` matches the input `Id` and `status` is `TransactionStatus.UNLABELED`.
    *   Add `get_labeled_transactions(owner_id: Id)` function. This will query for `TransactionDoc`s where `owner_id` matches the input `Id` and `status` is `TransactionStatus.LABELED`.
    *   For consistency with other methods, add overloads to support both `Id` and `{ owner_id: Id }` payload styles for both new functions.

2.  **Modify `src/concepts/Transaction/test-actions/test-parsing.ts`**:
    *   Add a new `Deno.test` block named "TransactionConcept: retrieve labeled and unlabeled transactions correctly".
    *   Inside this test, perform the following steps:
        *   **Setup:** Initialize the database and `TransactionConcept`.
        *   Generate two distinct `ownerId`s (`ownerId1` and `ownerId2`).
        *   Import 3-4 transactions for `ownerId1` using `import_transactions`.
        *   Import 2 transactions for `ownerId2` using `import_transactions`.
        *   Mark 2 transactions of `ownerId1` as `LABELED` using `mark_labeled`.
        *   Mark 1 transaction of `ownerId2` as `LABELED` using `mark_labeled`.
        *   **Test `get_unlabeled_transactions`:**
            *   Call for `ownerId1`. Assert that it returns the correct count and details of the remaining `UNLABELED` transactions.
            *   Call for `ownerId2`. Assert that it returns the correct count and details of the remaining `UNLABELED` transactions.
            *   Call for a non-existent owner. Assert an empty array is returned.
        *   **Test `get_labeled_transactions`:**
            *   Call for `ownerId1`. Assert that it returns the correct count and details of the `LABELED` transactions.
            *   Call for `ownerId2`. Assert that it returns the correct count and details of the `LABELED` transactions.
            *   Call for a non-existent owner. Assert an empty array is returned.
        *   **Cleanup:** Close the database connection.

This approach will ensure that the new functions are correctly implemented and thoroughly tested for various scenarios, including mixed statuses and different owners, with a small, focused dataset.

---

## Code Changes:

### `src/concepts/Transaction/TransactionConcept.ts`

```typescript
import { Collection, Db } from "npm:mongodb";
import { parse } from "npm:csv-parse/sync";

// The Id class, defined similarly to LabelConcept.ts, to satisfy the
// `tx_id ID` and `owner_id ID` types mentioned in the specification
// while not directly importing from LabelConcept.ts. In a real-world
// application, this common utility would reside in a shared file.
export class Id {
  private constructor(private value: string) {}

  static from(value: string): Id {
    return new Id(value);
  }

  toString(): string {
    return this.value;
  }
  static generate(): Id {
    return new Id(crypto.randomUUID());
  }
}

// Prefix for MongoDB collection names, following the pattern in LabelConcept.ts
const PREFIX = "Transaction" + ".";

// Defines the possible statuses for a transaction as specified
export enum TransactionStatus {
  UNLABELED = "UNLABELED",
  LABELED = "LABELED",
}

/**
 * Interface representing the parsed information for a single transaction
 * extracted from a bank statement. This aligns with the required state fields.
 */
interface ParsedTransactionInfo {
  date: Date;
  merchant_text: string;
  amount: number;
}

const DATE_SYNONYMS = [
  "date",
  "transactiondate",
  "postingdate",
  "posted",
  "transdate",
  "valuedate",
];
const MERCHANT_SYNONYMS = [
  "description",
  "merchant",
  "merchantname",
  "payee",
  "memo",
  "details",
  "narrative",
  "name",
];
const AMOUNT_SYNONYMS = [
  "amount",
  "transactionamount",
  "amountusd",
  "amt",
  "value",
];
// Added 'dr' and 'cr' for common type column shorthands
const DEBIT_SYNONYMS = [
  "debit",
  "withdrawal",
  "debitamount",
  "outflow",
  "spent",
  "dr",
];
const CREDIT_SYNONYMS = [
  "credit",
  "deposit",
  "creditamount",
  "inflow",
  "received",
  "cr",
];
const TYPE_SYNONYMS = ["type", "drcr", "transactiontype"];

// Helper to normalize column headers as specified
function normalizeHeader(header: string): string {
  // Convert to lowercase, strip spaces, underscores, and punctuation
  return header.toLowerCase().replace(/[\s\-_.,?!'"]/g, "");
}

// Defines the MongoDB document structure for a single transaction record.
// This directly represents the "state" of each transaction as described
// in the prompt. The _id field is typically the primary key in MongoDB,
// here assumed to be the globally unique tx_id for simplicity.
export type TransactionDoc = {
  _id: string; // The primary key for MongoDB, typically mirrors tx_id
  tx_id: string; // Unique identifier for the transaction
  owner_id: string; // Identifier for the user who owns this transaction
  date: Date; // The date of the transaction
  merchant_text: string; // Description of the merchant
  amount: number; // The transaction amount
  status: TransactionStatus; // Current labeling status of the transaction
};

// The TransactionConcept class manages the collection of TransactionDoc records.
// It sets up the connection to the specific MongoDB collection for transactions.
// This class represents the "set of Transactions" mentioned in the state.
export default class TransactionConcept {
  private transactions: Collection<TransactionDoc>;

  // The constructor initializes the MongoDB collection using the provided Db instance.
  constructor(private readonly db: Db) {
    this.transactions = db.collection(PREFIX + "transactions");
  }

  private makeTxMongoId(tx_id: Id): string {
    return tx_id.toString();
  }

  /**
   * Retrieves a single transaction document by its ID.
   * Minimal getter for transaction information.
   * @param tx_id The ID of the transaction to retrieve.
   * @returns A Promise that resolves to the TransactionDoc or null if not found.
   */
  async getTransaction(tx_id: Id): Promise<TransactionDoc | null>;
  async getTransaction(payload: { tx_id: Id }): Promise<TransactionDoc | null>;
  async getTransaction(a: Id | { tx_id: Id }): Promise<TransactionDoc | null> {
    // narrow both styles
    const tx_id = a instanceof Id ? a : a.tx_id;

    return await this.transactions.findOne({ _id: this.makeTxMongoId(tx_id) });
  }

  /**
   * Implements the 'mark_labeled' action.
   * Sets a transaction's status to LABELED, after verifying ownership and current status.
   *
   * @param tx_id The ID of the transaction to mark as labeled.
   * @param requester_id The ID of the user requesting the action, must match the transaction's owner.
   * @returns A Promise resolving to an object containing the `tx_id` of the marked transaction.
   * @throws An Error if the transaction does not exist, the requester is not the owner,
   *         or the transaction is already labeled.
   */
  async mark_labeled(tx_id: Id, requester_id: Id): Promise<{ tx_id: Id }>;
  async mark_labeled(
    payload: { tx_id: Id; requester_id: Id },
  ): Promise<{ tx_id: Id }>;
  async mark_labeled(
    a: Id | { tx_id: Id; requester_id: Id },
    b?: Id,
  ): Promise<{ tx_id: Id }> {
    // narrow both styles
    const tx_id = a instanceof Id ? a : a.tx_id;
    const requester_id = a instanceof Id ? b! : a.requester_id;

    const txMongoId = this.makeTxMongoId(tx_id);
    const requesterIdStr = requester_id.toString();

    // Requirement: transaction tx_id exists
    const existingTx = await this.transactions.findOne({ _id: txMongoId });

    if (!existingTx) {
      throw new Error(`Transaction with ID ${tx_id.toString()} not found.`);
    }

    // Requirement: requester_id = transaction.owner_id
    if (existingTx.owner_id !== requesterIdStr) {
      throw new Error(
        `Requester ID ${requesterIdStr} does not own transaction ${tx_id.toString()}.`,
      );
    }

    // Invariant: after a transaction first becomes LABELED, it never returns to UNLABELED
    if (existingTx.status === TransactionStatus.LABELED) {
      throw new Error(
        `Transaction with ID ${tx_id.toString()} is already labeled.`,
      );
    }

    // Effect: sets transaction.status to LABELED
    const result = await this.transactions.updateOne(
      { _id: txMongoId },
      { $set: { status: TransactionStatus.LABELED } },
    );

    if (result.matchedCount === 0) {
      // This case should ideally not be reached if the above checks are robust,
      // but included for completeness in case of a race condition or other unexpected issue.
      throw new Error(
        `Failed to update transaction ${tx_id.toString()} status.`,
      );
    }

    return { tx_id: tx_id };
  }
  private async add_transaction(
    owner_id: Id,
    parsedTxInfo: ParsedTransactionInfo,
  ): Promise<TransactionDoc> {
    const newTxId = Id.generate(); // Generate unique tx_id
    const txMongoId = this.makeTxMongoId(newTxId);

    // Invariant: transaction.amount is positive
    // This is enforced during parsing, but a final check here for robustness.
    if (parsedTxInfo.amount <= 0) {
      // This should ideally be caught by parse_info, but good for defensive programming.
      throw new Error(
        `Transaction amount must be positive. Received: ${parsedTxInfo.amount}`,
      );
    }

    const newTransaction: TransactionDoc = {
      _id: txMongoId,
      tx_id: newTxId.toString(),
      owner_id: owner_id.toString(),
      date: parsedTxInfo.date,
      merchant_text: parsedTxInfo.merchant_text,
      amount: parsedTxInfo.amount,
      status: TransactionStatus.UNLABELED, // Status is UNLABELED by default upon import
    };

    try {
      await this.transactions.insertOne(newTransaction);
      return newTransaction;
    } catch (error) {
      console.error(
        `Failed to add transaction for owner ${owner_id.toString()}:`,
        error,
      );
      throw new Error(`Could not add transaction.`);
    }
  }

  private parse_csv_info(csvContent: string): ParsedTransactionInfo[] {
    const records: Record<string, string>[] = parse(csvContent, {
      columns: true, // Auto-detect columns based on the first row
      skip_empty_lines: true,
      trim: true, // Trim whitespace from values in cells
    });

    if (!records || records.length === 0) {
      return [];
    }

    const headers = Object.keys(records[0] || {}); // Get headers from the first record keys

    let dateCol: string | undefined;
    let merchantCol: string | undefined;
    let amountCol: string | undefined;
    let debitCol: string | undefined;
    let creditCol: string | undefined;
    let typeCol: string | undefined;

    // Identify actual column names based on normalized synonyms
    for (const header of headers) {
      const normalizedHeader = normalizeHeader(header);
      if (DATE_SYNONYMS.includes(normalizedHeader)) {
        dateCol = header;
      } else if (MERCHANT_SYNONYMS.includes(normalizedHeader)) {
        merchantCol = header;
      } else if (DEBIT_SYNONYMS.includes(normalizedHeader)) {
        debitCol = header;
      } else if (CREDIT_SYNONYMS.includes(normalizedHeader)) {
        creditCol = header;
      }
      // General amount column is lowest priority, only set if not already identified
      // by a more specific debit/credit column.
      if (
        !debitCol && !creditCol && !amountCol &&
        AMOUNT_SYNONYMS.includes(normalizedHeader)
      ) {
        amountCol = header;
      } else if (TYPE_SYNONYMS.includes(normalizedHeader)) {
        typeCol = header;
      }
    }

    const parsedTransactions: ParsedTransactionInfo[] = [];

    for (const record of records) {
      let amount: number | null = null;
      let merchantText: string = "";
      let date: Date = new Date(0); // Default to Epoch if invalid or missing

      // 1. Parse Merchant Text (optional, default to empty string)
      if (merchantCol && record[merchantCol]) {
        merchantText = record[merchantCol].trim();
      }

      // 2. Parse Date (optional, default to Epoch)
      if (dateCol && record[dateCol]) {
        const parsedDate = new Date(record[dateCol]);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate;
        } else {
          console.warn(
            `Invalid date format for row: '${
              record[dateCol]
            }'. Using default Epoch date.`,
          );
        }
      } else {
        console.warn(
          `Date column not found or missing value for a row. Using default Epoch date.`,
        );
      }

      // 3. Parse Amount - Prioritize Debit > Credit > Generic Amount
      let rawAmountStr: string | undefined;
      let isExplicitOutflow: boolean | null = null; // null: unknown, true: outflow, false: inflow

      if (debitCol && record[debitCol]) {
        rawAmountStr = record[debitCol];
        isExplicitOutflow = true;
      } else if (creditCol && record[creditCol]) {
        rawAmountStr = record[creditCol];
        isExplicitOutflow = false; // Credit column usually means inflow
      } else if (amountCol && record[amountCol]) {
        rawAmountStr = record[amountCol];
        // If a type column is present, use it to determine debit/credit for generic 'Amount'
        if (typeCol && record[typeCol]) {
          const normalizedType = normalizeHeader(record[typeCol]);
          if (DEBIT_SYNONYMS.some((s) => normalizedType.includes(s))) {
            isExplicitOutflow = true;
          } else if (CREDIT_SYNONYMS.some((s) => normalizedType.includes(s))) {
            isExplicitOutflow = false;
          }
        }
      }

      if (rawAmountStr) {
        // Clean currency symbols and parse
        const parsedValue = parseFloat(rawAmountStr.replace(/[$,]/g, ""));
        if (!isNaN(parsedValue)) {
          if (isExplicitOutflow === true) {
            // Identified as debit/outflow source. Keep if positive.
            if (parsedValue > 0) {
              amount = parsedValue;
            } else {
              // Negative value in a debit column is effectively an inflow (reversal). Skip.
              console.log(
                `Skipping negative value (${parsedValue}) from debit-identified column (assumed inflow).`,
              );
              amount = null;
            }
          } else if (isExplicitOutflow === false) {
            // Identified as credit/inflow source. Always skip for "outflow only" requirement.
            console.log(
              `Skipping value (${parsedValue}) from credit-identified column (assumed inflow).`,
            );
            amount = null;
          } else {
            // Generic 'Amount' column, no explicit debit/credit column or type
            // Assume positive value is outflow, negative value is inflow.
            if (parsedValue > 0) {
              amount = parsedValue;
            } else {
              console.log(
                `Skipping negative value (${parsedValue}) from generic amount column (assumed inflow).`,
              );
              amount = null;
            }
          }
        } else {
          console.warn(
            `Invalid amount value '${rawAmountStr}' for a row. Skipping.`,
          );
          amount = null;
        }
      } else {
        console.warn(
          `Amount information not found or missing for a row. Skipping.`,
        );
        amount = null;
      }

      // Only add transaction if a valid, positive outflow amount was determined
      if (amount !== null && amount > 0) {
        parsedTransactions.push({
          date: date,
          merchant_text: merchantText,
          amount: amount,
        });
      }
    }

    return parsedTransactions;
  }

  public parse_info(csvContent: string): ParsedTransactionInfo[] {
    return this.parse_csv_info(csvContent);
  }

  /**
   * Implements the 'importTransactions' action.
   * Parses the provided CSV file content and adds new transactions to the store.
   *
   * @param owner_id The ID of the user importing the transactions.
   * @param fileContent The raw CSV content as a string.
   * @returns A Promise resolving to an array of created TransactionDoc objects.
   * @throws An Error if the owner_id is invalid (checked by add_transaction).
   */
  async import_transactions(
    owner_id: Id,
    fileContent: string,
  ): Promise<void>;
  async import_transactions(
    payload: { owner_id: Id; fileContent: string },
  ): Promise<void>;
  async import_transactions(
    a: Id | { owner_id: Id; fileContent: unknown },
    b?: string,
  ): Promise<void> {
    // narrow both styles

    if (a == null) {
      throw new Error("Owner ID is required for importing transactions.");
    }

    // narrow both styles
    const owner_id = a instanceof Id ? a : a.owner_id;
    const fileContent = a instanceof Id ? String(b) : String(a.fileContent);

    if (!owner_id) {
      throw new Error("Owner ID is required for importing transactions.");
    }

    // Parse the CSV file content using the internal helper
    const parsedInfos = this.parse_csv_info(fileContent);

    if (parsedInfos.length === 0) {
      console.log("No valid transactions parsed from CSV. Nothing to import.");
      return; // No transactions to import
    }

    const createdTransactions: TransactionDoc[] = [];
    for (const info of parsedInfos) {
      // Use the existing add_transaction to create each record
      const newTx = await this.add_transaction(owner_id, info);
      createdTransactions.push(newTx);
    }

    console.log(
      `Successfully imported ${createdTransactions.length} transactions.`,
    );
  }

  async list_all(): Promise<TransactionDoc[]> {
    return await this.transactions.find({}).toArray();
  }

  
```

### `src/concepts/Transaction/test-actions/test-parsing.ts`

```typescript
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
  TransactionDoc,
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