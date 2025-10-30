---
timestamp: 'Sat Oct 18 2025 18:48:42 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_184842.986fee25.md]]'
content_id: 1b57d6d06835bafeaff3cad57ed6bf5ef2deb4d5dbfff8aa11db196517e5f2fe
---

# response:

To address the prompt, we'll first modify `src/concepts/FlashFinance/Transaction/transaction.ts` to add the requested `list_all()` getter. Then, we'll create the `transaction_parse.test.ts` file, which will include a minimal in-memory mock for `npm:mongodb` to ensure hermetic testing, read the sample CSV, call `import_transactions`, and assert the results using the new getter.

***

### Step 1: Modify `src/concepts/FlashFinance/Transaction/transaction.ts`

Add the `list_all` method to the `TransactionStore` class.

```typescript
// src/concepts/FlashFinance/Transaction/transaction.ts
import { Collection, Db } from "npm:mongodb";
import { parse } from "npm:csv-parse/sync";

// The Id class, defined similarly to label.ts, to satisfy the
// `tx_id ID` and `owner_id ID` types mentioned in the specification
// while not directly importing from label.ts. In a real-world
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

// Prefix for MongoDB collection names, following the pattern in label.ts
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

// The TransactionStore class manages the collection of TransactionDoc records.
// It sets up the connection to the specific MongoDB collection for transactions.
// This class represents the "set of Transactions" mentioned in the state.
export class TransactionStore {
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
  async getTransaction(tx_id: Id): Promise<TransactionDoc | null> {
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
  async mark_labeled(tx_id: Id, requester_id: Id): Promise<{ tx_id: Id }> {
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
  ): Promise<TransactionDoc[]> {
    if (!owner_id) {
      throw new Error("Owner ID is required for importing transactions.");
    }

    // Parse the CSV file content using the internal helper
    const parsedInfos = this.parse_csv_info(fileContent);

    if (parsedInfos.length === 0) {
      console.log("No valid transactions parsed from CSV. Nothing to import.");
      return []; // No transactions to import
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
    return createdTransactions;
  }

  /**
   * Returns all stored transaction documents from the collection.
   * This is a minimal getter added for testing purposes.
   * @returns A Promise that resolves to an array of all TransactionDoc objects.
   */
  async list_all(): Promise<TransactionDoc[]> {
    return await this.transactions.find({}).toArray();
  }
}
```

***

### Step 2: Create `transaction_parse.test.ts`

```typescript
// transaction_parse.test.ts
import {
  assertEquals,
  assertExists,
  assertGreater,
  assertIsDate,
  assertNotEquals,
  assertStringIncludes,
  assertStringNotIncludes,
} from "jsr:@std/assert";
import { Collection, Db, FindCursor } from "npm:mongodb";
import {
  Id,
  TransactionDoc,
  TransactionStore,
  TransactionStatus,
} from "./src/concepts/FlashFinance/Transaction/transaction.ts"; // Adjust path as necessary

// --- Minimal Mock MongoDB Implementation for testing ---
// This mock provides just enough functionality for the TransactionStore
// and LabelStore operations used in the application logic.
class MockCollection<T extends { _id: string }> implements Collection<T> {
  #docs: T[] = [];
  #collectionName: string;

  constructor(name: string) {
    this.#collectionName = name;
  }

  async insertOne(doc: T): Promise<any> {
    if (this.#docs.some((d) => d._id === doc._id)) {
      throw new Error(`Duplicate _id: ${doc._id} in collection ${this.#collectionName}`);
    }
    this.#docs.push(doc);
    return { acknowledged: true, insertedId: doc._id };
  }

  async find(query: any = {}): Promise<FindCursor<T>> {
    const results = this.#docs.filter((doc) => {
      for (const key in query) {
        if (query[key]?.$in) { // Handle $in operator
          if (!query[key].$in.includes((doc as any)[key])) {
            return false;
          }
        } else if ((doc as any)[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });

    return {
      toArray: async () => results,
      project: (fields: any) => ({
        toArray: async () => {
          if (!fields) return results; // No projection, return all
          return results.map((doc) => {
            const projectedDoc: any = {};
            for (const key in fields) {
              if (fields[key] === 1 && doc.hasOwnProperty(key)) {
                projectedDoc[key] = (doc as any)[key];
              }
              // Special handling for _id: 0 to exclude
              if (key === "_id" && fields[key] === 0) {
                // do nothing, _id is not copied
              } else if (key === "_id" && fields[key] === 1 && doc.hasOwnProperty("_id")) {
                projectedDoc["_id"] = doc._id;
              }
            }
            return projectedDoc;
          });
        },
      }),
    } as unknown as FindCursor<T>;
  }

  async findOne(query: any): Promise<T | null> {
    const result = this.#docs.find((doc) => {
      for (const key in query) {
        if ((doc as any)[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });
    return result || null;
  }

  async updateOne(filter: any, update: any, options?: any): Promise<any> {
    let matchedCount = 0;
    let modifiedCount = 0;

    const docIndex = this.#docs.findIndex((doc) => {
      for (const key in filter) {
        if ((doc as any)[key] !== filter[key]) {
          return false;
        }
      }
      return true;
    });

    if (docIndex > -1) {
      matchedCount = 1;
      const existingDoc = this.#docs[docIndex];
      const newDoc = { ...existingDoc };

      if (update.$set) {
        for (const key in update.$set) {
          if ((newDoc as any)[key] !== update.$set[key]) {
            (newDoc as any)[key] = update.$set[key];
            modifiedCount = 1;
          }
        }
      }
      this.#docs[docIndex] = newDoc;
      return { acknowledged: true, matchedCount, modifiedCount };
    } else if (options?.upsert && update.$set) {
      const newDocId = filter._id || crypto.randomUUID();
      const newDoc: T = { ...update.$set, _id: newDocId };
      this.#docs.push(newDoc);
      return { acknowledged: true, upsertedId: newDocId, matchedCount: 0, modifiedCount: 0 };
    }
    return { acknowledged: true, matchedCount, modifiedCount: 0 };
  }

  async findOneAndUpdate(filter: any, update: any, options?: any): Promise<any> {
    const docIndex = this.#docs.findIndex((doc) => {
      for (const key in filter) {
        if ((doc as any)[key] !== filter[key]) {
          return false;
        }
      }
      return true;
    });

    if (docIndex > -1) {
      const existingDoc = this.#docs[docIndex];
      const newDoc = { ...existingDoc };

      if (update.$set) {
        for (const key in update.$set) {
          (newDoc as any)[key] = update.$set[key];
        }
      }
      this.#docs[docIndex] = newDoc;
      if (options?.returnDocument === "after") {
        return newDoc;
      }
      return existingDoc; // Default is 'before'
    }
    return null;
  }

  async deleteMany(filter: any): Promise<any> {
    const initialCount = this.#docs.length;
    this.#docs = this.#docs.filter((doc) => {
      for (const key in filter) {
        if ((doc as any)[key] !== filter[key]) {
          return true; // Keep if it doesn't match filter
        }
      }
      return false; // Remove if it matches filter
    });
    const deletedCount = initialCount - this.#docs.length;
    return { acknowledged: true, deletedCount };
  }

  async countDocuments(query: any = {}): Promise<number> {
    const results = this.#docs.filter((doc) => {
      for (const key in query) {
        if ((doc as any)[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });
    return results.length;
  }

  // Minimal stubs for other Collection properties/methods to satisfy interface
  get collectionName(): string { return this.#collectionName; }
  get db(): Db { return new MockDb(); } // Placeholder, not used in this test
  get namespace(): string { return `mockdb.${this.#collectionName}`; }

  // Other methods not used in these tests are simply unimplemented
  aggregate(..._args: any[]): any { throw new Error("Not implemented."); }
  bulkWrite(..._args: any[]): any { throw new Error("Not implemented."); }
  createIndex(..._args: any[]): any { throw new Error("Not implemented."); }
  createIndexes(..._args: any[]): any { throw new Error("Not implemented."); }
  distinct(..._args: any[]): any { throw new Error("Not implemented."); }
  drop(..._args: any[]): any { throw new Error("Not implemented."); }
  estimatedDocumentCount(..._args: any[]): any { throw new Error("Not implemented."); }
  explain(..._args: any[]): any { throw new Error("Not implemented."); }
  findOneAndDelete(..._args: any[]): any { throw new Error("Not implemented."); }
  findOneAndReplace(..._args: any[]): any { throw new Error("Not implemented."); }
  insertMany(..._args: any[]): any { throw new Error("Not implemented."); }
  isCapped(..._args: any[]): any { throw new Error("Not implemented."); }
  listIndexes(..._args: any[]): any { throw new Error("Not implemented."); }
  mapReduce(..._args: any[]): any { throw new Error("Not implemented."); }
  options(..._args: any[]): any { throw new Error("Not implemented."); }
  rename(..._args: any[]): any { throw new Error("Not implemented."); }
  replaceOne(..._args: any[]): any { throw new Error("Not implemented."); }
  updateMany(..._args: any[]): any { throw new Error("Not implemented."); }
  watch(..._args: any[]): any { throw new Error("Not implemented."); }
  deleteOne(..._args: any[]): Promise<any> { throw new Error("Not implemented."); }
  dropIndexes(..._args: any[]): Promise<any> { throw new Error("Not implemented."); }
  initializeOrderedBulkOp(..._args: any[]): Promise<any> { throw new Error("Not implemented."); }
  initializeUnorderedBulkOp(..._args: any[]): Promise<any> { throw new Error("Not implemented."); }
  stats(..._args: any[]): Promise<any> { throw new Error("Not implemented."); }
}

class MockDb implements Db {
  #collections = new Map<string, MockCollection<any>>();
  databaseName: string = "testDb";

  collection<T extends { _id: string }>(name: string): Collection<T> {
    if (!this.#collections.has(name)) {
      this.#collections.set(name, new MockCollection<T>(name));
    }
    return this.#collections.get(name) as Collection<T>;
  }

  // Minimal stubs for other Db methods
  async createCollection(_name: string, _options?: any): Promise<Collection> {
    return this.collection(_name);
  }
  async dropCollection(_name: string): Promise<boolean> {
    this.#collections.delete(_name);
    return true;
  }
  async dropDatabase(..._args: any[]): Promise<boolean> {
    this.#collections.clear();
    return true;
  }
  admin(): any { throw new Error("Not implemented."); }
  aggregate(..._args: any[]): any { throw new Error("Not implemented."); }
  async command(..._args: any[]): Promise<any> { throw new Error("Not implemented."); }
  async createIndexes(..._args: any[]): Promise<any> { throw new Error("Not implemented."); }
  async executeDbAdminCommand(..._args: any[]): Promise<any> { throw new Error("Not implemented."); }
  async listCollections(..._args: any[]): Promise<any> { throw new Error("Not implemented."); }
  async listIndexes(..._args: any[]): Promise<any> { throw new Error("Not implemented."); }
  async renameCollection(..._args: any[]): Promise<Collection> { throw new Error("Not implemented."); }
  async runCommand(..._args: any[]): Promise<any> { throw new Error("Not implemented."); }
  async stats(..._args: any[]): Promise<any> { throw new Error("Not implemented."); }
  async watch(..._args: any[]): Promise<any> { throw new Error("Not implemented."); }
  get client(): any { throw new Error("Not implemented."); }
  get options(): any { throw new Error("Not implemented."); }
}
// --- End Mock MongoDB Implementation ---

const sampleCsvPath = "./src/concepts/FlashFinance/Transaction/sample/sample-spendings.csv";

Deno.test("end-to-end CSV parsing and transaction import handles outflows and inflows", async () => {
  // 1. Setup
  const ownerId = Id.from("testUser123");
  const mockDb = new MockDb();
  const transactionStore = new TransactionStore(mockDb);

  // Read the CSV from disk
  const csvContent = await Deno.readTextFile(sampleCsvPath);

  // 2. Execute import_transactions
  const importedTransactions = await transactionStore.import_transactions(
    ownerId,
    csvContent,
  );

  // 3. Use list_all to retrieve all stored transactions
  const allStoredTransactions = await transactionStore.list_all();

  // 4. Assertions
  // Expected outflows from sample-spendings.csv:
  // - Starbucks: 4.25 (DR)
  // - Whole Foods Market: 52.3 (DR)
  // - Electric Company Payment: 150 (DR)
  // - ATM Withdrawal: 60 (DR)
  // - Netflix Subscription: 15.99 (DR)
  // Total 5 transactions. Inflows and negative debits are skipped.

  // Count matches
  assertEquals(importedTransactions.length, 5, "Should have imported 5 outflow transactions");
  assertEquals(allStoredTransactions.length, 5, "list_all() should return 5 transactions");

  for (const tx of allStoredTransactions) {
    // Every transaction has a unique ID and owner ID
    assertExists(tx._id);
    assertExists(tx.tx_id);
    assertNotEquals(tx.tx_id, "");
    assertEquals(tx.owner_id, ownerId.toString());

    // Every amount is a positive number (outflow)
    assertGreater(tx.amount, 0, `Transaction amount (${tx.amount}) must be positive`);

    // Merchant text is present and trimmed (not empty after trim)
    assertExists(tx.merchant_text);
    assertNotEquals(tx.merchant_text.trim(), "", "Merchant text should not be empty or just whitespace");
    assertStringNotIncludes(tx.merchant_text, " ", "Merchant text should be trimmed (no leading/trailing spaces)");
    // Additional check for the double quotes from CSV
    assertStringNotIncludes(tx.merchant_text, `"`,"Merchant text should not contain literal double quotes.");


    // Dates parse correctly (they are valid in the sample CSV)
    assertExists(tx.date);
    assertIsDate(tx.date, "Date should be a valid Date object");
    assertNotEquals(tx.date.getFullYear(), 1970, "Date should not be default Epoch year (implies parsing error)"); // 2025 dates

    // Status is UNLABELED initially
    assertEquals(tx.status, TransactionStatus.UNLABELED, "Newly imported transactions should be UNLABELED");

    // Example of a specific date assertion (optional, for verification)
    if (tx.merchant_text.includes("Starbucks")) {
      assertEquals(tx.date.toISOString().split('T')[0], "2025-01-03");
      assertEquals(tx.amount, 4.25);
    }
    if (tx.merchant_text.includes("Whole Foods")) {
      assertEquals(tx.date.toISOString().split('T')[0], "2025-01-05");
      assertEquals(tx.amount, 52.3);
    }
  }

  // Ensure no inflows or negative debits were imported
  const inflowKeywords = ["Deposit", "Refund", "Credit Card Payment"];
  for (const tx of allStoredTransactions) {
    for (const keyword of inflowKeywords) {
      assertStringNotIncludes(tx.merchant_text, keyword, `Should not contain inflow transaction: ${tx.merchant_text}`);
    }
  }

  // Test 'mark_labeled' action (briefly to ensure TransactionStore functionality)
  if (allStoredTransactions.length > 0) {
    const firstTx = allStoredTransactions[0];
    await transactionStore.mark_labeled(Id.from(firstTx.tx_id), ownerId);
    const updatedTx = await transactionStore.getTransaction(Id.from(firstTx.tx_id));
    assertExists(updatedTx);
    assertEquals(updatedTx.status, TransactionStatus.LABELED, "Transaction status should be LABELED after marking");
  }
});
```

***

**To run this test:**

1. Save the modified `transaction.ts` at `src/concepts/FlashFinance/Transaction/transaction.ts`.
2. Save the test file as `transaction_parse.test.ts` in the root of your project or in a `test` directory.
3. Ensure `src/concepts/FlashFinance/Transaction/sample/sample-spendings.csv` exists relative to your test file as shown in the paths.
4. Run from your terminal:
   ```bash
   deno test --allow-read --allow-env --allow-net --allow-sys --allow-hrtime transaction_parse.test.ts
   ```
   (The `--allow-env --allow-net --allow-sys --allow-hrtime` flags are generally required for `npm:mongodb` and `crypto.randomUUID()` usage, even if mocked, due to internal dependencies. `--allow-read` is for reading the CSV file.)

**Explanation of Changes and Logic:**

1. **`src/concepts/FlashFinance/Transaction/transaction.ts` Modification:**
   * A new public asynchronous method `list_all(): Promise<TransactionDoc[]>` was added to `TransactionStore`. This method simply queries the underlying `transactions` collection and returns all documents, fulfilling the prompt's requirement for a minimal getter to facilitate testing.

2. **`transaction_parse.test.ts` File Structure:**
   * **Imports:** Necessary assertion functions from `jsr:@std/assert` and the `Id`, `TransactionDoc`, `TransactionStore`, `TransactionStatus` types/classes from the modified `transaction.ts` file.
   * **Mock MongoDB Implementation:** `MockCollection` and `MockDb` classes are provided directly within the test file. These in-memory mocks simulate the behavior of `npm:mongodb`'s `Collection` and `Db` for the methods actually used by `TransactionStore` and `LabelStore` (like `insertOne`, `find`, `findOne`, `updateOne`, `findOneAndUpdate`, `deleteMany`, `countDocuments`). This makes the test hermetic, running without a real MongoDB instance.
   * **Test Case (`Deno.test`):**
     * **Setup:** An `ownerId` is created, and instances of `MockDb` and `TransactionStore` are initialized. The `sample-spendings.csv` content is read from disk using `Deno.readTextFile`.
     * **Execution:** `transactionStore.import_transactions()` is called with the `ownerId` and CSV content.
     * **Verification:** `transactionStore.list_all()` is called to retrieve all stored transactions.
     * **Assertions:**
       * **Count:** It asserts that exactly 5 transactions were imported. This is based on the `sample-spendings.csv` file, where there are 5 clear outflow (DR, positive amount) transactions, and the rest are either inflows (CR) or negative debits, which are correctly skipped by the `parse_csv_info` logic.
       * **Structural Checks:**
         * Each transaction has a valid `_id`, `tx_id`, and `owner_id`.
         * `amount` is always positive, as required for outflows.
         * `merchant_text` exists, is not empty after trimming, and importantly, the CSV's double quotes are removed by the `trim` option of `csv-parse` and then the `trim()` method of the string.
         * `date` is a valid `Date` object and not the epoch default.
         * `status` is `UNLABELED` upon initial import.
       * **Absence of Inflows:** It explicitly checks that no transactions with common "inflow" keywords (like "Deposit", "Refund", "Credit Card Payment") are present, further validating that inflows were skipped.
       * **`mark_labeled` Test:** A brief sub-test to ensure the `mark_labeled` action, which changes transaction status, also works correctly with the mock database.

This setup ensures an end-to-end validation of the transaction import process, adhering to all constraints in the prompt.
