---
timestamp: 'Fri Nov 07 2025 12:09:49 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_120949.0e22a58b.md]]'
content_id: 6df35c440094e02efe9fde47813739b9289809d68538c6345b86d829d231c1d8
---

# file: src\concepts\Label\LabelConcept.ts

```typescript
  /** Reassign the label for a transaction to the built-in Trash category. */
  async removeCommittedLabel(
    user_id: Id,
    tx_id: Id,
  ): Promise<{ label_tx_id: Id; old_category_id: Id | null }>;
  async removeCommittedLabel(
    payload: { user_id: string; tx_id: string },
  ): Promise<{ label_tx_id: Id; old_category_id: Id | null }>;
  async removeCommittedLabel(
    a: Id | { user_id: string; tx_id: string },
    b?: Id,
  ): Promise<{ label_tx_id: Id; old_category_id: Id | null }> {
    // narrow both styles
    const user_id = a instanceof Id ? a : Id.from(a.user_id);
    const tx_id = a instanceof Id ? b! : Id.from(a.tx_id);
    const keycombined = this.makeTxUserId(user_id, tx_id);

    const existingLabel = await this.labels.findOne({ _id: keycombined });

    if (!existingLabel) {
      // Idempotency: If label doesn't exist, there's nothing to remove.
      // Return null for old_category_id to prevent downstream syncs from running.
      return { label_tx_id: tx_id, old_category_id: null };
    }

    const old_category_id = Id.from(existingLabel.category_id);

    // If it's already in the trash, the operation is complete.
    if (old_category_id.toString() === TRASH_CATEGORY_ID.toString()) {
      return { label_tx_id: tx_id, old_category_id };
    }

    // Otherwise, update the label to point to the trash category.
    const now = new Date();
    await this.labels.updateOne(
      { _id: keycombined },
      {
        $set: {
          category_id: TRASH_CATEGORY_ID.toString(),
          created_at: now,
        },
      },
    );

    await this.catTx.updateOne(
      { _id: keycombined },
      {
        $set: {
          category_id: TRASH_CATEGORY_ID.toString(),
        },
      },
    );

    return { label_tx_id: tx_id, old_category_id: old_category_id };
  }
```
