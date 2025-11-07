---
timestamp: 'Fri Nov 07 2025 12:02:39 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_120239.b1c6a390.md]]'
content_id: 312097301b1e72252d04ce479ba9aa3733b4b617bc187691ab985ecbe53033b1
---

# response:

Based on your request, I've confirmed that a synchronization for updating an existing, committed label by calling `Label.update` does not exist in the provided files. The existing `/Category/updateTransaction` sync only moves the transaction metric and does not update the label itself, which would lead to data inconsistency.

To address this, here is a new set of synchronizations that creates a robust API endpoint at `/Label/update`. This workflow correctly updates both the `Label` and `Category` concepts to ensure your application state remains consistent.

### file: src\syncs\label.sync.ts

```typescript
// Add the following code block to this file. A logical place is after the `RemoveCommittedLabel` syncs.

//-- Update Label --//
// Handles a user request to change the category of an already committed label.
// This is a multi-sync workflow to ensure consistency and handle all cases gracefully.

// Handles unauthorized requests for updating a label.
export const UpdateLabelUnauthorized: Sync = ({ request, session, user, error }) => ({
  when: actions([Requesting.request, { path: "/Label/update", session }, { request }]),
  where: async (frames) => {
    const userFrames = await frames.query(Sessioning._getUser, { session }, { user });
    if (userFrames.length === 0) {
      return frames.map((f) => ({ ...f, [error]: "Unauthorized" }));
    }
    return new Frames(); // Veto for authorized users
  },
  then: actions([Requesting.respond, { request, error }]),
});

// Handles requests where the specified transaction/label to update is not found.
export const UpdateLabelNotFound: Sync = ({ request, session, user, tx_id, label, error }) => ({
  when: actions([Requesting.request, { path: "/Label/update", session, tx_id }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Veto, let unauthorized sync handle it.

    const labelFrames = await frames.query(Label.getLabel, { user_id: user, tx_id }, { label });
    // This sync only fires if the label is NOT found.
    if (labelFrames.length === 0) {
      return frames.map((f) => ({ ...f, [error]: "Label for transaction not found" }));
    }

    // Veto if the label was found, allowing the main request sync to proceed.
    return new Frames();
  },
  then: actions([Requesting.respond, { request, error }]),
});

// Handles the main success path for updating a label.
// It finds the old category and then triggers updates in both Label and Category concepts.
export const UpdateLabelRequest: Sync = ({ request, session, user, tx_id, new_category_id, label, old_category_id }) => ({
  when: actions([Requesting.request, { path: "/Label/update", session, tx_id, new_category_id }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Veto if unauthorized

    frames = await frames.query(Label.getLabel, { user_id: user, tx_id }, { label });
    if (frames.length === 0) return new Frames(); // Veto if not found

    // Extract the old category_id from the found label document to pass to Category.updateTransaction
    return frames.map((f) => {
      const labelDoc = f[label] as { category_id: string };
      return { ...f, [old_category_id]: labelDoc.category_id };
    });
  },
  then: actions([
    Label.update({ user_id: user, tx_id, new_category_id }),
    Category.updateTransaction({ owner_id: user, tx_id, old_category_id, new_category_id }),
  ]),
});

// Responds successfully when the Label.update action succeeds.
export const UpdateLabelResponseSuccess: Sync = ({ request, label_tx_id }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/update" }, { request }],
    [Label.update, {}, { label_tx_id }],
  ),
  then: actions([Requesting.respond, { request, tx_id: label_tx_id }]),
});

// Responds with an error if the Label.update action fails.
export const UpdateLabelResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/update" }, { request }],
    [Label.update, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// Responds with an error if the Category.updateTransaction action fails.
export const UpdateLabelCategoryError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/update" }, { request }],
    [Category.updateTransaction, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
```
