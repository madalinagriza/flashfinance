---
timestamp: 'Fri Nov 07 2025 01:51:33 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_015133.0fb83356.md]]'
content_id: dead8c853ef30c300256d9050b304c223c742f4942ea018516f9097dbda087c7
---

# file: src/concepts/Transaction/TransactionConcept.ts

```typescript
  /**
   * Retrieves a single transaction document by its ID and owner.
   * Enforces that the requested transaction belongs to the provided owner_id.
   * @param owner_id The ID of the owner who must own the transaction.
   * @param tx_id The ID of the transaction to retrieve.
   * @returns A Promise that resolves to the TransactionDoc.
   * @throws An Error if the transaction is not found for the given owner.
   */
  async getTransaction(
    owner_id: Id,
    tx_id: Id,
  ): Promise<{ tx: TransactionDoc }[]>;
  async getTransaction(
    payload: { owner_id: string; tx_id: string },
  ): Promise<{ tx: TransactionDoc }[]>;
  async getTransaction(
    a: Id | { owner_id: string; tx_id: string },
    b?: Id,
  ): Promise<{ tx: TransactionDoc }[]> {
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

    return [{ tx: tx }];
  }
```

```typescript
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

    const txsWrapper = await this.getTransaction(owner_id, tx_id);
    const txs = txsWrapper.map((wrapper) => wrapper.tx);
    // map TransactionDoc -> ParsedTransactionInfo
    return txs.map((tx) => ({
      date: tx.date,
      merchant_text: tx.merchant_text,
      amount: tx.amount,
    }));
  }
```
