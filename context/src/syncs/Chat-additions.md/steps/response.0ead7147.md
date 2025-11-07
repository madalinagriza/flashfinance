---
timestamp: 'Fri Nov 07 2025 12:09:49 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_120949.0e22a58b.md]]'
content_id: 0ead714738a25f2d9290f0bb3c4747ccdde1ba5f2969fb94e00242fa47e0a33a
---

# response:

The error `Label not found for transaction...` indicates that the `Label.removeCommittedLabel` action was called for a transaction that does not have a corresponding label record in the database. This happens because the underlying `Label.update` action requires a label to exist before it can modify it.

This situation can arise from a data inconsistency (e.g., a transaction exists in a category's metrics but its corresponding label document is missing) or from the client sending a request for a transaction that was never labeled.

The fix involves two parts:

1. **Make `removeCommittedLabel` idempotent**: The action should not fail if the label doesn't exist. If the goal is to move a transaction's label to the "Trash" category, and the label doesn't exist, the system is already in a state consistent with that goal. The action should succeed without performing any change. To support proper synchronization, the action's return signature will be updated to indicate whether a change was made by returning the transaction's previous category.
2. **Synchronize with the `Category` concept**: The original implementation was also missing a critical piece of logic. When a label is "removed" (i.e., its category is changed to Trash), the transaction must also be moved from its old category's metrics to the Trash category's metrics in the `Category` concept. A new synchronization will be added to handle this.

Here are the code changes to resolve the issue:

***
