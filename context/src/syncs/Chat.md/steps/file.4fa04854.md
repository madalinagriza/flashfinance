---
timestamp: 'Fri Nov 07 2025 00:39:08 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_003908.3aaea043.md]]'
content_id: 4fa0485405dec051529f2cd0185360892e6ecb7f65896c70021e6c2e5f164da5
---

# file: src\concepts\Transaction\TransactionConcept.ts

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
   * Retrieves a single transaction document by its ID and owner.
   * Enforces that the requested transaction belongs to the provided owner_id.
   * @param owner_id The ID of the owner who must own the transaction.
   * @param tx_id The ID of the transaction to retrieve.
   * @returns A Promise that resolves to the TransactionDoc.
   * @throws An Error if the transaction is not found for the given owner.
   */
  async getTransaction(owner_id: Id, tx_id: Id): Promise<TransactionDoc[]>;
  async getTransaction(
    payload: { owner_id: string; tx_id: string },
  ): Promise<TransactionDoc[]>;
  async getTransaction(
    a: Id | { owner_id: string; tx_id: string },
    b?: Id,
  ): Promise<TransactionDoc[]> {
    // narrow both styles
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const tx_id = a instanceof Id ? b! : Id.from(a.tx_id);

    const ownerIdStr = owner_id.toString();
    const txMongoId = this.makeTxMongoId(tx_id);

    const tx = await this.transactions.findOne({
      _id: txMongoId,
      owner_id: ownerIdStr,
    });

    if (!tx) {
      throw new Error(
        `Transaction with ID ${tx_id.toString()} not found for owner ${ownerIdStr}.`,
      );
    }

    return [tx];
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
    payload: { tx_id: string; requester_id: string },
  ): Promise<{ tx_id: Id }>;
  async mark_labeled(
    a: Id | { tx_id: string; requester_id: string },
    b?: Id,
  ): Promise<{ tx_id: Id }> {
    // narrow both styles
    const tx_id = a instanceof Id ? a : Id.from(a.tx_id);
    const requester_id = a instanceof Id ? b! : Id.from(a.requester_id);

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
   * Implements a bulk 'mark_labeled' action by calling `mark_labeled` in parallel.
   * Sets multiple transactions' status to LABELED.
   *
   * @param tx_ids The list of transaction IDs to mark as labeled.
   * @param requester_id The ID of the user requesting the action.
   * @returns A Promise resolving to an object with `{ ok: true }` on success.
   * @throws An Error if any of the individual `mark_labeled` calls fail.
   */
  async bulk_mark_labeled(
    { tx_ids, requester_id }: { tx_ids: string[]; requester_id: string },
  ): Promise<void> {
    if (!tx_ids || tx_ids.length === 0) {
      return; // Nothing to do
    }

    const requesterId = Id.from(requester_id);

    const promises = tx_ids.map((tx_id) =>
      this.mark_labeled(Id.from(tx_id), requesterId)
    );

    try {
      await Promise.all(promises);
      return;
    } catch (error) {
      console.error("Error during bulk mark labeled:", error);
      throw new Error(
        `One or more transactions failed to be marked as labeled. First error: ${
          (error as Error).message
        }`,
      );
    }
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
            const normalized = Math.abs(parsedValue);
            if (normalized > 0) {
              amount = normalized;
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
            if (parsedValue < 0) {
              amount = Math.abs(parsedValue);
            } else if (parsedValue > 0) {
              console.log(
                `Skipping positive value (${parsedValue}) from generic amount column (assumed deposit).`,
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
    payload: { owner_id: string; fileContent: string },
  ): Promise<void>;
  async import_transactions(
    a: Id | { owner_id: string; fileContent: unknown },
    b?: string,
  ): Promise<void> {
    // narrow both styles

    if (a == null) {
      throw new Error("Owner ID is required for importing transactions.");
    }

    // narrow both styles
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
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
  /**
   * Returns all transactions which are UNLABELED and belong to a specific owner_id.
   *
   * @param owner_id The ID of the owner.
   * @returns A Promise that resolves to an array of unlabeled TransactionDoc objects.
   */
  async get_unlabeled_transactions(owner_id: Id): Promise<TransactionDoc[]>;
  async get_unlabeled_transactions(
    payload: { owner_id: string },
  ): Promise<TransactionDoc[]>;
  async get_unlabeled_transactions(
    a: Id | { owner_id: string },
  ): Promise<TransactionDoc[]> {
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    try {
      console.trace("[TransactionConcept] get_unlabeled_transactions - entry", {
        owner_id: owner_id.toString(),
      });

      const cursor = this.transactions.find({
        owner_id: owner_id.toString(),
        status: TransactionStatus.UNLABELED,
      });

      const results = await cursor.toArray();

      console.trace(
        "[TransactionConcept] get_unlabeled_transactions - result",
        { owner_id: owner_id.toString(), count: results.length },
      );

      // Log a small sample when the set is non-empty (avoid logging huge payloads)
      if (results.length > 0) {
        const sample = results.slice(0, 5).map((r) => ({
          tx_id: r.tx_id,
          date: r.date,
          merchant_text: r.merchant_text,
          amount: r.amount,
          status: r.status,
        }));
        console.debug(
          "[TransactionConcept] get_unlabeled_transactions - sample",
          { owner_id: owner_id.toString(), sample },
        );
      }

      return results;
    } catch (e) {
      console.error(
        "[TransactionConcept] get_unlabeled_transactions - error",
        { owner_id: owner_id.toString(), error: (e as Error).message },
      );
      throw e;
    }
  }

  /**
   * Returns all transactions which are LABELED and belong to a specific owner_id.
   *
   * @param owner_id The ID of the owner. (Using owner_id for consistency with data model)
   * @returns A Promise that resolves to an array of labeled TransactionDoc objects.
   */
  async get_labeled_transactions(owner_id: Id): Promise<TransactionDoc[]>;
  async get_labeled_transactions(
    payload: { owner_id: string },
  ): Promise<TransactionDoc[]>;
  async get_labeled_transactions(
    a: Id | { owner_id: string },
  ): Promise<TransactionDoc[]> {
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    return await this.transactions.find({
      owner_id: owner_id.toString(),
      status: TransactionStatus.LABELED,
    }).toArray();
  }

  /**
   * Returns parsed transaction info (date, merchant_text, amount) for a given owner and tx_id.
   * This mirrors the information previously exposed by LabelConcept.getTxInfo but lives
   * in TransactionConcept where transaction data is authoritative.
   */
  async getTxInfo(owner_id: Id, tx_id: Id): Promise<ParsedTransactionInfo[]>;
  async getTxInfo(
    payload: { owner_id: string; tx_id: string },
  ): Promise<ParsedTransactionInfo[]>;
  async getTxInfo(
    a: Id | { owner_id: string; tx_id: string },
    b?: Id,
  ): Promise<ParsedTransactionInfo[]> {
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const tx_id = a instanceof Id ? b! : Id.from(a.tx_id);

    const txs = await this.getTransaction(owner_id, tx_id);
    // map TransactionDoc -> ParsedTransactionInfo
    return txs.map((tx) => ({
      date: tx.date,
      merchant_text: tx.merchant_text,
      amount: tx.amount,
    }));
  }
}

```
