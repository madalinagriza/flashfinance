---
timestamp: 'Wed Nov 05 2025 21:34:37 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_213437.2f1de163.md]]'
content_id: cbf935544e0f82e512cf7af1a35cd0d7b0b55d0d87fb0c86e60eaea4d0c826db
---

# response:

Based on the addition of the `updateTransaction` function to your `CategoryConcept` and your goal to expose it via synchronizations while removing the direct `removeTransaction` endpoint, here are the required changes for `src/syncs/category.sync.ts`.

### Removed Syncs

You should remove the following synchronizations from `src/syncs/category.sync.ts` as they expose the `removeTransaction` action directly, which you no longer want.

```typescript
//-- Remove Transaction from Category --//
export const RemoveTransactionRequest: Sync = (
  { request, session, category_id, tx_id, user },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/removeTransaction",
    session,
    category_id,
    tx_id,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Category.removeTransaction, {
    owner_id: user,
    category_id,
    tx_id,
  }]),
});

export const RemoveTransactionResponseSuccess: Sync = ({ request, ok }) => ({
  when: actions(
    [Requesting.request, { path: "/Category/removeTransaction" }, { request }],
    [Category.removeTransaction, {}, { ok }],
  ),
  then: actions([Requesting.respond, { request, ok }]),
});

export const RemoveTransactionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Category/removeTransaction" }, { request }],
    [Category.removeTransaction, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
```

### Added Syncs

Add the following new synchronizations to `src/syncs/category.sync.ts`. This creates a new API endpoint at `/Category/updateTransaction` that allows moving a transaction between categories for an authenticated user.

```typescript
//-- Update Transaction Category --//
export const UpdateTransactionRequest: Sync = (
  { request, session, user, tx_id, old_category_id, new_category_id },
) => ({
  when: actions([Requesting.request, {
    path: "/Category/updateTransaction",
    session,
    tx_id,
    old_category_id,
    new_category_id,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Category.updateTransaction, {
    owner_id: user,
    tx_id,
    old_category_id,
    new_category_id,
  }]),
});

export const UpdateTransactionResponseSuccess: Sync = ({ request, ok }) => ({
  when: actions(
    [Requesting.request, { path: "/Category/updateTransaction" }, { request }],
    [Category.updateTransaction, {}, { ok }],
  ),
  then: actions([Requesting.respond, { request, ok }]),
});

export const UpdateTransactionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Category/updateTransaction" }, { request }],
    [Category.updateTransaction, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
```
