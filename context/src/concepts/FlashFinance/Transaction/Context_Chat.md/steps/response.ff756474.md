---
timestamp: 'Sat Oct 18 2025 18:17:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_181758.f90eb5e9.md]]'
content_id: ff75647494748a13bc36f4176ae53397ba4129e17844858c3363ca4ea22721cc
---

# response:

To implement the CSV parsing logic and the `import_transactions` action, we'll modify `src/concepts/FlashFinance/Transaction/transaction.ts`.

Here's a summary of the changes:

1. **Import `parse` function:** Add `import { parse } from "npm:csv-parse/sync";` for CSV processing.
2. **`Id.generate()`:** Ensure the `Id` class has a static `generate()` method to create new transaction IDs. (Already present in the provided `transaction.ts`).
3. **`ParsedTransactionInfo` Interface:** Define an interface that aligns with the required output fields (`amount`, `date`, `merchant_text`). To match the `TransactionDoc`'s non-nullable `date: Date` and `merchant_text: string` fields, the parsing logic will provide default values (`new Date(0)` for invalid dates, `""` for missing merchant text) to ensure these fields are always present and of the correct type.
4. **Header Normalization and Synonyms:**
   * Implement `normalizeHeader` helper function to convert headers to lowercase and strip spaces, underscores, and punctuation.
   * Define constant arrays for synonyms (`DATE_SYNONYMS`, `MERCHANT_SYNONYMS`, `AMOUNT_SYNONYMS`, `DEBIT_SYNONYMS`, `CREDIT_SYNONYMS`, `TYPE_SYNONYMS`) at the module level.
5. **`_parse_csv_info` (private method):** This new method within `TransactionStore` will encapsulate the CSV parsing logic:
   * Uses `Deno.readTextFileSync` (implicitly, as `fileContent` is passed as string) and `parse` from `csv-parse/sync`.
   * Identifies CSV columns by matching normalized headers against synonyms, prioritizing specific debit/credit columns over a generic amount column.
   * Iterates through each CSV record:
     * **Merchant:** Extracts `merchant_text` from the identified merchant column. Defaults to `""` if not found.
     * **Date:** Parses the date. If invalid, it defaults to `new Date(0)` (Epoch) to ensure the `Date` type is maintained, fulfilling "if invalid, set it to null and still import the row" in spirit (by providing a valid but default `Date` object).
     * **Amount:** This is the most complex part:
       * Prioritizes `DEBIT` columns. If a `DEBIT` column has a positive value, it's an outflow. A negative value is considered an inflow (reversal), so it's skipped.
       * If a `CREDIT` column is present (and no `DEBIT`), values from it are generally considered inflows and are skipped to "keep only cost or outflow transactions".
       * If only a generic `AMOUNT` column exists:
         * It checks for a `TYPE` column (e.g., "DR/CR") to infer if it's a debit or credit.
         * If no `TYPE` or ambiguous, a positive `AMOUNT` is assumed to be an outflow, and a negative `AMOUNT` is assumed to be an inflow (and skipped).
       * Only transactions with a valid, positive `amount` (representing an outflow) are included.
6. **`import_transactions` (action):** This new public method in `TransactionStore` orchestrates the import:
   * Takes `owner_id` and `fileContent` (the CSV string).
   * Calls `_parse_csv_info` to get the array of `ParsedTransactionInfo` objects.
   * Iterates through this array, calling the existing `add_transaction` method for each.
   * Returns an array of all newly created `TransactionDoc` objects.

```typescript
// src/concepts/FlashFinance/Transaction/transaction.ts
import { Collection, Db } from "npm:mongodb";
import { parse } from "npm:csv-parse/sync"; // Added for CSV parsing

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
 * extracted from a bank statement. This aligns with the required state fields
 * and the "optionally date and merchant_text" return requirement,
 * while still conforming to `TransactionDoc`'s non-nullable fields by providing defaults
 * (`new Date(0)` for invalid dates, `""` for missing merchant text).
 */
interface ParsedTransactionInfo {
  amount: number;
  date: Date; // Will default to Epoch if invalid or missing in CSV
  merchant_text: string; // Will default to "" if not found or empty in CSV
}

/**
 * Defines the MongoDB document structure for a single transaction record.
 * This directly represents the "state" of each transaction as described
 * in the prompt. The _id field is typically the primary key in MongoDB,
 * here assumed to be the globally unique tx_id for simplicity.
 */
export type TransactionDoc = {
  _id: string; // The primary key for MongoDB, typically mirrors tx_id
  tx_id: string; // Unique identifier for the transaction
  owner_id: string; // Identifier for the user who owns this transaction
  date: Date; // The date of the transaction
  merchant_text: string; // Description of the merchant
  amount: number; // The transaction amount
  status: TransactionStatus; // Current labeling status of the transaction
};

// Define synonyms (normalized) at the module level to avoid re-creation
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
const AMOUNT_SYNONYMS = ["amount", "transactionamount", "amountusd", "amt", "value"];
// Added 'dr' and 'cr' for common type column shorthands
const DEBIT_SYNONYMS = ["debit", "withdrawal", "debitamount", "outflow", "spent", "dr"];
const CREDIT_SYNONYMS = ["credit", "deposit", "creditamount", "inflow", "received", "cr"];
const TYPE_SYNONYMS = ["type", "drcr", "transactiontype"];

// Helper to normalize column headers as specified
function normalizeHeader(header: string): string {
  // Convert to lowercase, strip spaces, underscores, and punctuation
  return header.toLowerCase().replace(/[\s\-_.,?!'"]/g, "");
}

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

  /**
   * Adds a single transaction to the store.
   * Ensures amount is positive and sets initial status to UNLABELED.
   *
   * @param owner_id The ID of the user owning the transaction.
   * @param parsedTxInfo The parsed transaction information.
   * @returns A Promise resolving to the newly created TransactionDoc.
   */
  private async add_transaction(
    owner_id: Id,
    parsedTxInfo: ParsedTransactionInfo,
  ): Promise<TransactionDoc> {
    const newTxId = Id.generate();
    const txMongoId = this.makeTxMongoId(newTxId);

    // Invariant: transaction.amount is positive
    if (parsedTxInfo.amount <= 0) {
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

  /**
   * Parses CSV content to extract transaction information, focusing only on
   * cost or outflow transactions. It normalizes column headers and matches
   * against a list of synonyms.
   *
   * @param csvContent The raw CSV data as a string.
   * @returns An array of ParsedTransactionInfo objects, ready for import.
   */
  private _parse_csv_info(csvContent: string): ParsedTransactionInfo[] {
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
      if (!debitCol && !creditCol && !amountCol && AMOUNT_SYNONYMS.includes(normalizedHeader)) {
         amountCol = header;
      }
       else if (TYPE_SYNONYMS.includes(normalizedHeader)) {
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
            `Invalid date format for row: '${record[dateCol]}'. Using default Epoch date.`,
          );
        }
      } else {
        console.warn(`Date column not found or missing value for a row. Using default Epoch date.`);
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
          console.warn(`Invalid amount value '${rawAmountStr}' for a row. Skipping.`);
          amount = null;
        }
      } else {
        console.warn(`Amount information not found or missing for a row. Skipping.`);
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
    const parsedInfos = this._parse_csv_info(fileContent);

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

    console.log(`Successfully imported ${createdTransactions.length} transactions.`);
    return createdTransactions;
  }
}

```
