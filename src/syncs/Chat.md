
[@sync-background](../../design/tools/sync-background.md)
 

[@category.sync.ts](category.sync.ts)

[@CategoryConcept.ts](../concepts/Category/CategoryConcept.ts)

[@label.sync.ts](label.sync.ts)

[@LabelConcept.ts](../concepts/Label/LabelConcept.ts)

[@transaction.sync.ts](transaction.sync.ts)

[@TransactionConcept.ts](../concepts/Transaction/TransactionConcept.ts)

#prompt:  investigate. if fixing, paste only the portions you are fixing.


[Requesting] Received request for path: /Label/removeCommittedLabel

Requesting.request {
  session: '019a5f46-42fe-7ada-bcfe-a9b8bcbb4d3f',
  tx_id: 'e3ebd36c-c72c-4b74-8c3c-50bc23d62f23',
  path: '/Label/removeCommittedLabel'
} => { request: '019a5f48-8fd7-797f-9d26-ee635c26438b' }

[Requesting] Error processing request: Label not found for transaction e3ebd36c-c72c-4b74-8c3c-50bc23d62f23
# response:


# response:

The error `Label not found for transaction...` indicates that the `Label.removeCommittedLabel` action was called for a transaction that does not have a corresponding label record in the database. This happens because the underlying `Label.update` action requires a label to exist before it can modify it.

This situation can arise from a data inconsistency (e.g., a transaction exists in a category's metrics but its corresponding label document is missing) or from the client sending a request for a transaction that was never labeled.

The fix involves two parts:

1.  **Make `removeCommittedLabel` idempotent**: The action should not fail if the label doesn't exist. If the goal is to move a transaction's label to the "Trash" category, and the label doesn't exist, the system is already in a state consistent with that goal. The action should succeed without performing any change. To support proper synchronization, the action's return signature will be updated to indicate whether a change was made by returning the transaction's previous category.
2.  **Synchronize with the `Category` concept**: The original implementation was also missing a critical piece of logic. When a label is "removed" (i.e., its category is changed to Trash), the transaction must also be moved from its old category's metrics to the Trash category's metrics in the `Category` concept. A new synchronization will be added to handle this.

Here are the code changes to resolve the issue:

***

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

# file: src\syncs\label.sync.ts

```typescript
// ... (keep existing RemoveCommittedLabelResponseError sync) ...

export const RemoveCommittedLabelResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Label/removeCommittedLabel" },
      { request },
    ],
    [Label.removeCommittedLabel, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * When a committed label is "removed" (moved to trash), this sync ensures the
 * corresponding transaction is also moved from its old category to the trash
 * category within the Category concept's metrics. This keeps the two concepts in sync.
 */
export const MoveTransactionToTrashOnLabelRemove: Sync = (
  { user_id, tx_id, old_category_id },
) => ({
  when: actions(
    // This action now returns old_category_id, which can be null.
    [Label.removeCommittedLabel, { user_id, tx_id }, {
      label_tx_id: tx_id,
      old_category_id,
    }],
  ),
  where: async (frames) => {
    // Only proceed if an actual category change happened (old_category_id is not null).
    return frames.filter((frame) => frame[old_category_id] !== null);
  },
  then: actions(
    [Category.moveTransactionToTrash, {
      owner_id: user_id,
      from_category_id: old_category_id,
      tx_id,
    }],
  ),
});

export const GetLabelRequest: Sync = (
// ... (rest of the file remains the same) ...
```