---
timestamp: 'Fri Nov 07 2025 12:10:27 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_121027.28ff5884.md]]'
content_id: cb7806c7d68fe29f72e239399351efa920790eafc2e8647d1e361de1c70b6d33
---

# response:

The "internal error" during finalization occurs because the `Category` concept fails when trying to add a transaction to the "Trash" category if that special category doesn't already exist for the user.

When you "move to trash" during a labeling session, the `Label` concept stages a label pointing to a special `TRASH_CATEGORY_ID`. Upon finalization, the `FinalizeWithLabels` sync calls `Category.bulk_add_transaction`. This action, in turn, calls `Category.addTransaction`, which strictly requires the destination category to exist. Since the "Trash" category is not automatically created, this requirement fails, causing the error.

The solution is to make the `Category.addTransaction` action more robust by modifying it to automatically (or "lazily") create the "Trash" category for a user if it's the destination for a transaction and doesn't yet exist. This makes the concept's behavior more intuitive and resolves the finalization failure.

Here is the updated method for `CategoryConcept.ts`:
