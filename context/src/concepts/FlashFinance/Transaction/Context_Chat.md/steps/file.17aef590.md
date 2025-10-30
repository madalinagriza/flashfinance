---
timestamp: 'Sat Oct 18 2025 17:38:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_173828.07ba3777.md]]'
content_id: 17aef590e0aadb4103c6547bb52da9e10dde530b1b805ac92e44374516a22588
---

# file: src/concepts/FlashFinance/Transaction/transaction.ts

```typescript
import { Collection, Db } from "npm:mongodb";

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
}

// Prefix for MongoDB collection names, following the pattern in label.ts
const PREFIX = "Transaction" + ".";

// Defines the possible statuses for a transaction as specified
export enum TransactionStatus {
  UNLABELED = "UNLABELED",
  LABELED = "LABELED",
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
}

```
