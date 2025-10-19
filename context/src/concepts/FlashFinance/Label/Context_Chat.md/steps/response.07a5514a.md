---
timestamp: 'Thu Oct 16 2025 08:32:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_083250.db9a93a9.md]]'
content_id: 07a5514a8943bf0b63eab186a75301b2778b1a503c1f6de84c75fc990734e065
---

# response:

To implement a test case that showcases the normal operational principle of the `Label` concept in FlashFinance, we'll follow these steps:

1. **Understand Label Actions:** Consult `Spec.md` and `label.ts` to identify all non-AI actions: `CREATE_LABEL`, `RENAME_LABEL`, `DELETE_LABEL`, `APPLY_LABEL`, `REMOVE_LABEL`.
2. **Identify State Structure:** From `label.ts`, the state is `LabelState = { labels: Record<string, Label>, transactionLabels: Record<string, string[]> }`.
3. **Mock Context:** Since `CREATE_LABEL` uses `context.random.uuid()` and `context.time.now()`, we'll need to provide mock `ActionContext` objects for each action in the sequence.
4. **Design Scenario:** Create a sequence of actions that demonstrate the typical lifecycle of labels and their application to transactions.
   * Create two labels.
   * Apply the first label to `transaction-1`.
   * Apply the second label to `transaction-2`.
   * Remove the first label from `transaction-1`.
   * Re-apply the first label to `transaction-1` (to show it works after removal).
   * Rename the first label.
   * Delete the second label (and verify its removal from `transaction-2`).
5. **Format Test:** Use `createTestSuite` as seen in `label-clear.ts` and provide `input` (array of actions) and `expected` (the final state).

***

```typescript
import { createTestSuite } from '@system/tests/test-suite';
import { FlashFinanceLabelConcept } from '../label'; // Path to the Label concept implementation
import { LabelAction, LabelState, Label } from '../label'; // Types from the Label concept
import { ActionContext } from '@system/utils/types'; // For mocking context

// --- Mock Data for consistency and readability ---

// Mocked Label and Transaction IDs
const LABEL_ID_GROCERIES = 'label-uuid-groceries';
const LABEL_ID_UTILITIES = 'label-uuid-utilities';
const TRANSACTION_ID_1 = 'transaction-uuid-001';
const TRANSACTION_ID_2 = 'transaction-uuid-002';

// Mocked Timestamps (milliseconds since epoch)
// Only CREATE_LABEL uses time.now() for createdAt. Other actions typically don't store new timestamps.
const MOCK_TIME_BASE = 1700000000000; // Nov 15, 2023 00:00:00 GMT
const MOCK_TIME_LABEL_GROCERIES = MOCK_TIME_BASE + 1000;
const MOCK_TIME_LABEL_UTILITIES = MOCK_TIME_BASE + 2000;

// --- Test Case Implementation ---

// Array of mock contexts, one for each action in the input sequence.
// This allows controlling uuid() and now() calls for actions that need them.
const mockContexts: ActionContext[] = [
    // 1. CREATE_LABEL "Groceries"
    { random: { uuid: () => LABEL_ID_GROCERIES }, time: { now: () => MOCK_TIME_LABEL_GROCERIES } },
    // 2. CREATE_LABEL "Utilities"
    { random: { uuid: () => LABEL_ID_UTILITIES }, time: { now: () => MOCK_TIME_LABEL_UTILITIES } },
    // 3. APPLY_LABEL (no uuid/time needed for this specific action in label.ts)
    { random: { uuid: () => 'ignored' }, time: { now: () => MOCK_TIME_BASE } },
    // 4. APPLY_LABEL (no uuid/time needed)
    { random: { uuid: () => 'ignored' }, time: { now: () => MOCK_TIME_BASE } },
    // 5. REMOVE_LABEL (no uuid/time needed)
    { random: { uuid: () => 'ignored' }, time: { now: () => MOCK_TIME_BASE } },
    // 6. RE-APPLY_LABEL (no uuid/time needed)
    { random: { uuid: () => 'ignored' }, time: { now: () => MOCK_TIME_BASE } },
    // 7. RENAME_LABEL (no uuid/time needed)
    { random: { uuid: () => 'ignored' }, time: { now: () => MOCK_TIME_BASE } },
    // 8. DELETE_LABEL (no uuid/time needed)
    { random: { uuid: () => 'ignored' }, time: { now: () => MOCK_TIME_BASE } },
];

createTestSuite(FlashFinanceLabelConcept, 'FlashFinance Label Normal Operations', [
    {
        name: 'Showcases creating, applying, removing, renaming, and deleting labels',
        input: [
            // Action 1: Create the "Groceries" label
            { actionType: 'CREATE_LABEL', payload: { name: 'Groceries' } },
            // Action 2: Create the "Utilities" label
            { actionType: 'CREATE_LABEL', payload: { name: 'Utilities' } },
            // Action 3: Apply "Groceries" to TRANSACTION_ID_1
            { actionType: 'APPLY_LABEL', payload: { labelId: LABEL_ID_GROCERIES, transactionId: TRANSACTION_ID_1 } },
            // Action 4: Apply "Utilities" to TRANSACTION_ID_2
            { actionType: 'APPLY_LABEL', payload: { labelId: LABEL_ID_UTILITIES, transactionId: TRANSACTION_ID_2 } },
            // Action 5: Remove "Groceries" from TRANSACTION_ID_1
            { actionType: 'REMOVE_LABEL', payload: { labelId: LABEL_ID_GROCERIES, transactionId: TRANSACTION_ID_1 } },
            // Action 6: Re-apply "Groceries" to TRANSACTION_ID_1 (demonstrates re-application)
            { actionType: 'APPLY_LABEL', payload: { labelId: LABEL_ID_GROCERIES, transactionId: TRANSACTION_ID_1 } },
            // Action 7: Rename "Groceries" to "Food"
            { actionType: 'RENAME_LABEL', payload: { id: LABEL_ID_GROCERIES, newName: 'Food' } },
            // Action 8: Delete the "Utilities" label
            { actionType: 'DELETE_LABEL', payload: { id: LABEL_ID_UTILITIES } },
        ],
        contexts: mockContexts, // Pass the array of mock contexts to the test runner
        expected: {
            entities: {
                FlashFinance: {
                    Label: {
                        label_state: {
                            labels: {
                                [LABEL_ID_GROCERIES]: {
                                    id: LABEL_ID_GROCERIES,
                                    name: 'Food', // Verified: Label was renamed
                                    createdAt: MOCK_TIME_LABEL_GROCERIES,
                                },
                                // LABEL_ID_UTILITIES should be absent, as it was deleted.
                            },
                            transactionLabels: {
                                [TRANSACTION_ID_1]: [LABEL_ID_GROCERIES], // Verified: Re-applied label is present
                                // TRANSACTION_ID_2 should be absent, as its only label (LABEL_ID_UTILITIES) was deleted,
                                // and the implementation removes transaction entries if their label array becomes empty.
                            },
                        },
                    },
                },
            },
        },
    },
]);
```
