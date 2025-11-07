---
timestamp: 'Fri Nov 07 2025 12:10:27 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_121027.28ff5884.md]]'
content_id: 775669191a54b5eb52d656a4cb18741d557a90a43f1e203002e0feb5f214071e
---

# file: src\concepts\Category\CategoryConcept.ts

```typescript
  async addTransaction(
    owner_id: Id,
    category_id: Id,
    tx_id: Id,
    amount: number,
    tx_date: Date,
  ): Promise<{ ok: boolean }>;
  async addTransaction(payload: {
    owner_id: string;
    category_id: string;
    tx_id: string;
    amount: number;
    tx_date: string | Date;
  }): Promise<{ ok: boolean }>;
  async addTransaction(
    a:
      | Id
      | {
        owner_id: string;
        category_id: string;
        tx_id: string;
        amount: number;
        tx_date: string | Date;
      },
    b?: Id,
    c?: Id,
    d?: number,
    e?: Date,
  ): Promise<{ ok: boolean }> {
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_id);
    const tx_id = a instanceof Id ? c! : Id.from(a.tx_id);
    const amount = a instanceof Id ? Number(d) : Number(a.amount);
    const rawDate = a instanceof Id ? e : a.tx_date;

    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(
        "Transaction amount must be a nonnegative finite number.",
      );
    }

    if (!rawDate) {
      throw new Error("Transaction date is required.");
    }

    const txDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (Number.isNaN(txDate.getTime())) {
      throw new Error("Invalid transaction date provided.");
    }

    let existingCategory = await this.getCategoryById(owner_id, category_id);
    if (!existingCategory) {
      // If the category doesn't exist, check if it's the special Trash category.
      if (category_id.toString() === TRASH_CATEGORY_ID.toString()) {
        // Lazily create the Trash category for this user.
        const trashKey = this.makeCategoryKey(owner_id, TRASH_CATEGORY_ID);
        const trashDoc: CategoryDoc = {
          _id: trashKey,
          owner_id: owner_id.toString(),
          category_id: TRASH_CATEGORY_ID.toString(),
          name: "Trash",
        };
        await this.categories.updateOne(
          { _id: trashKey },
          { $setOnInsert: trashDoc },
          { upsert: true },
        );
        // After creating it, we can proceed as if it existed.
      } else {
        // If it's not the Trash category, then it's an error.
        throw new Error(
          `Cannot record metric: category with ID ${category_id.toString()} not found.`,
        );
      }
    }

    const metricDoc = await this.ensureMetricDocument(owner_id, category_id);
    const txIdStr = tx_id.toString();

    if (metricDoc.transactions.some((entry) => entry.tx_id === txIdStr)) {
      throw new Error(
        `Transaction ${txIdStr} is already recorded for category ${category_id.toString()}.`,
      );
    }

    const entry: CategoryMetricEntry = {
      tx_id: txIdStr,
      amount,
      tx_date: txDate,
    };

    await this.categoryMetrics.updateOne(
      { _id: metricDoc._id },
      {
        $push: { transactions: entry },
        $set: { updated_at: new Date() },
      },
    );

    return { ok: true };
  }
```
