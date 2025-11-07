---
timestamp: 'Fri Nov 07 2025 12:09:49 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_120949.0e22a58b.md]]'
content_id: 75dff7e760928ba15e005a390570df0ab3a9756ef70eaf89232fbdfecb44a9a0
---

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
