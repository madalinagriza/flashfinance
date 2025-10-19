---
timestamp: 'Sat Oct 18 2025 18:16:16 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_181616.33ad3542.md]]'
content_id: 1edd2f77856f769ed200f2c5292a992f76195b73656ee4a6b4541f7313a7089a
---

# response:

```typescript
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
 * extracted from a bank statement, aligning with the prompt's requirements
 * for the parse_info function's return type.
 */
interface ParsedTransactionInfo {
  amount: number; // Mandatory, represents outflow/cost, positive
  date?: Date | null; // Optional, null if parsing fails
  merchant_text?: string; // Optional
}

/**
 * Normalizes a column header string by converting it to lowercase,
 * stripping spaces, underscores, and punctuation.
 * @param header The original column header string.
 * @returns The normalized header string.
 */
function normalizeHeader(header: string): string {
  // Convert to lowercase, then replace any sequence of spaces, underscores, or non-word characters (punctuation) with an empty string.
  return header.toLowerCase().replace(/[\s_\W]+/g, "");
}

/**
 * Maps normalized column header synonyms to a canonical field name.
 */
const HEADER_SYNONYMS: Record<string, string[]> = {
  DATE: [
    "date",
    "transactiondate",
    "postingdate",
    "posted",
    "transdate",
    "valuedate",
  ],
  MERCHANT: [
    "description",
    "merchant",
    "merchantname",
    "payee",
    "memo",
    "details",
    "narrative",
    "name",
  ],
  AMOUNT: ["amount", "transactionamount", "amountusd", "amt", "value"], // General amount
  DEBIT: ["debit", "withdrawal", "debitamount", "outflow", "spent"],
  CREDIT: ["credit", "deposit", "creditamount", "inflow", "received"],
  TYPE: ["type", "drcr", "transactiontype"], // For debit/credit type if present (e.g., 'DR', 'CR')
};

/**
 * Parses CSV data to extract essential transaction information.
 * It identifies date, merchant, and amount fields using synonyms and
 * normalizes column headers. It focuses exclusively on extracting
 * cost or outflow transactions, converting them to positive numbers.
 *
 * @param csvContent The CSV data as a string.
 * @returns An array of `ParsedTransactionInfo` objects, containing
 *          amount, and optionally date and merchant_text.
 */
function parse_info(csvContent: string): ParsedTransactionInfo[] {
  const records = parse(csvContent, {
    columns: true, // Treat the first row as headers
    skip_empty_lines: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    return [];
  }

  // Map original headers to their normalized versions and store the reverse for lookup
  const originalHeaders = Object.keys(records[0]);
  const normalizedToOriginalHeaderMap: Record<string, string> = {};
  for (const originalHeader of originalHeaders) {
    normalizedToOriginalHeaderMap[normalizeHeader(originalHeader)] =
      originalHeader;
  }

  // Identify column names based on synonyms, prioritizing explicit debit/credit
  let dateCol: string | undefined;
  let merchantCol: string | undefined;
  let amountCol: string | undefined; // General amount column
  let debitCol: string | undefined;
  let creditCol: string | undefined;
  let typeCol: string | undefined; // For transaction type (e.g., 'DR'/'CR')

  for (const normalizedHeader of Object.keys(normalizedToOriginalHeaderMap)) {
    if (HEADER_SYNONYMS.DATE.includes(normalizedHeader) && !dateCol) {
      dateCol = normalizedToOriginalHeaderMap[normalizedHeader];
    } else if (
      HEADER_SYNONYMS.MERCHANT.includes(normalizedHeader) && !merchantCol
    ) {
      merchantCol = normalizedToOriginalHeaderMap[normalizedHeader];
    } else if (
      HEADER_SYNONYMS.DEBIT.includes(normalizedHeader) && !debitCol
    ) {
      debitCol = normalizedToOriginalHeaderMap[normalizedHeader];
    } else if (
      HEADER_SYNONYMS.CREDIT.includes(normalizedHeader) && !creditCol
    ) {
      creditCol = normalizedToOriginalHeaderMap[normalizedHeader];
    } else if (
      HEADER_SYNONYMS.AMOUNT.includes(normalizedHeader) && !amountCol &&
      !debitCol && !creditCol // Prioritize explicit debit/credit, then general amount
    ) {
      amountCol = normalizedToOriginalHeaderMap[normalizedHeader];
    } else if (
      HEADER_SYNONYMS.TYPE.includes(normalizedHeader) && !typeCol
    ) {
      typeCol = normalizedToOriginalHeaderMap[normalizedHeader];
    }
  }

  const parsedTransactions: ParsedTransactionInfo[] = [];

  for (const record of records) {
    let date: Date | null = null;
    let merchant_text: string | undefined;
    let transactionAmount: number | undefined;

    // Date parsing (best effort—if invalid, set to null)
    if (dateCol && record[dateCol]) {
      const parsedDate = new Date(record[dateCol]);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
      }
    }

    // Merchant text extraction
    if (merchantCol && record[merchantCol]) {
      merchant_text = record[merchantCol].trim();
    }

    // Amount parsing logic: "keep only cost or outflow transactions. Prefer debit columns if present."
    const rawDebit = debitCol && record[debitCol]
      ? parseFloat(record[debitCol].replace(/[^0-9.-]+/g, ""))
      : null;
    const rawCredit = creditCol && record[creditCol]
      ? parseFloat(record[creditCol].replace(/[^0-9.-]+/g, ""))
      : null;
    const rawGeneralAmount = amountCol && record[amountCol]
      ? parseFloat(record[amountCol].replace(/[^0-9.-]+/g, ""))
      : null;
    const rawType = typeCol && record[typeCol] ? record[typeCol].toLowerCase() : null;

    if (rawDebit !== null && !isNaN(rawDebit) && rawDebit > 0) {
      // Prioritize explicit debit column for outflow
      transactionAmount = rawDebit;
    } else if (rawCredit !== null && !isNaN(rawCredit) && rawCredit > 0) {
      // Explicit credit column signifies inflow, which should be ignored per prompt.
      transactionAmount = undefined;
    } else if (rawGeneralAmount !== null && !isNaN(rawGeneralAmount)) {
      // If no clear debit, use general amount column.
      if (rawGeneralAmount < 0) {
        // Negative general amount indicates outflow, convert to positive.
        transactionAmount = -rawGeneralAmount;
      } else if (
        rawGeneralAmount > 0 &&
        (rawType === "dr" || rawType === "debit" || rawType === "outflow")
      ) {
        // Some formats use a positive amount with a 'DR' type for outflow.
        transactionAmount = rawGeneralAmount;
      }
      // If rawGeneralAmount is positive and not marked as debit by 'type', assume it's inflow and ignore.
    }

    // Only add transactions that have a valid positive outflow amount
    if (transactionAmount !== undefined && transactionAmount > 0) {
      parsedTransactions.push({
        date,
        merchant_text,
        amount: transactionAmount,
      });
    }
  }

  return parsedTransactions;
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

  /**
   * Adds a single transaction record to the database.
   * This is a private helper used by `import_transactions`.
   *
   * @param owner_id The ID of the user who owns this transaction.
   * @param parsedTxInfo The parsed transaction information.
   * @returns A Promise resolving to the newly created `TransactionDoc`.
   * @throws An Error if the transaction amount is not positive or insertion fails.
   */
  private async add_transaction(
    owner_id: Id,
    parsedTxInfo: ParsedTransactionInfo,
  ): Promise<TransactionDoc> {
    const newTxId = Id.generate(); // Generate unique tx_id
    const txMongoId = this.makeTxMongoId(newTxId);

    // Invariant: transaction.amount is positive. This is enforced during parsing,
    // but a final check here adds robustness.
    if (parsedTxInfo.amount <= 0) {
      throw new Error(
        `Transaction amount must be positive. Received: ${parsedTxInfo.amount}`,
      );
    }

    // If date parsing results in null, use epoch date as a fallback to satisfy `TransactionDoc: date: Date`.
    const transactionDate = parsedTxInfo.date ?? new Date(0);
    // Ensure merchant_text is always a string, defaulting to empty if undefined.
    const merchantText = parsedTxInfo.merchant_text ?? "";

    const newTransaction: TransactionDoc = {
      _id: txMongoId,
      tx_id: newTxId.toString(),
      owner_id: owner_id.toString(),
      date: transactionDate,
      merchant_text: merchantText,
      amount: parsedTxInfo.amount,
      status: TransactionStatus.UNLABELED, // Transactions are UNLABELED by default upon import
    };

    try {
      await this.transactions.insertOne(newTransaction);
      return newTransaction;
    } catch (error) {
      console.error(
        `Failed to add transaction for owner ${owner_id.toString()} (Tx_ID: ${newTxId.toString()}):`,
        error,
      );
      throw new Error(`Could not add transaction.`);
    }
  }

  /**
   * Implements the 'importTransactions' action.
   * Parses the provided CSV file content and converts rows into Transactions
   * owned by owner_id with status UNLABELED.
   *
   * @param owner_id The ID of the user who owns these transactions.
   * @param file_content The CSV data as a string.
   * @returns A Promise resolving to an array of `TransactionDoc` objects that were created.
   * @throws An Error if the owner_id is invalid or if `parse_info` encounters a critical failure.
   */
  async import_transactions(
    owner_id: Id,
    file_content: string,
  ): Promise<TransactionDoc[]> {
    // Requirement: owner exists. Basic validation for owner_id structure.
    if (!owner_id || typeof owner_id.toString() !== "string") {
      throw new Error("Invalid owner_id provided for import.");
    }

    // Requirement: file content is valid. Handled by parse_info.
    const parsedInfos = parse_info(file_content);
    const createdTransactions: TransactionDoc[] = [];

    for (const info of parsedInfos) {
      try {
        const newTx = await this.add_transaction(owner_id, info);
        createdTransactions.push(newTx);
      } catch (e) {
        // Log errors for individual rows but continue processing other valid rows.
        // This ensures a partially valid CSV can still import some transactions.
        console.warn(
          `Skipping row due to error during add_transaction: ${
            (e as Error).message
          } (Problematic Parsed Info: ${JSON.stringify(info)})`,
        );
      }
    }

    return createdTransactions;
  }
}
```
