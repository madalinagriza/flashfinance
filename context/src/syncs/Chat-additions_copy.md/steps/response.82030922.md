---
timestamp: 'Wed Nov 05 2025 18:37:58 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_183758.b094ef8a.md]]'
content_id: 820309223453739c87b8fdc76925ae7c5f78687f4a7809289eea9f82f0009e32
---

# response:

The errors you're encountering stem from two main issues in the previously generated synchronization:

1. **Structural Error:** The `then` clause was implemented as a function (`then: (frame) => ...`) to handle conditional logic. However, the sync engine's type definition expects `then` to be a static array of action patterns (`ActionPattern[]`), not a function. This causes the error: `Type '(frame: any) => ActionPattern[]' is not assignable to type 'ActionPattern[]'`.
2. **Type Inference Error:** The second error (`Argument of type '...' is not assignable to parameter of type 'ActionList'`) is a subtle TypeScript issue. It arises because the compiler fails to correctly infer that `[Action, {input}]` is a tuple that matches the `ActionPattern` type, especially when the actions involved (like `bulk_mark_labeled`) are typed to return `Promise<void>`, which is not a valid return type for a concept action (they must return a dictionary, even an empty one).

The correct way to model conditional logic in synchronizations is to split the logic into multiple, more specific syncs, each with its own `where` clause that selects for a particular case.

Here is the corrected implementation, which replaces the single, faulty `FinalizeStagedLabelsInBulkRequest` with three distinct syncs that cover all logical paths: unauthorized, no labels to process, and the main success case with labels. This restructuring solves both errors.

```typescript
/**
 * Handles the user request to finalize all currently staged labels.
 * This has been split into multiple syncs to handle different outcomes:
 * 1. FinalizeStagedLabelsUnauthorized: Responds with an error if the session is invalid.
 * 2. FinalizeWithNoLabels: Handles the case where a user has no staged labels to finalize.
 * 3. FinalizeWithLabels: The main success path, processing all staged labels in bulk.
 *
 * This multi-sync approach correctly models the conditional logic without using a function
 * in the `then` clause, which resolves the errors from the previous implementation.
 */

// This sync handles the unauthorized case for the finalize request.
export const FinalizeStagedLabelsUnauthorized: Sync = ({ request, session, user, error }) => ({
    when: actions(
        [Requesting.request, { path: "/Label/finalize", session }, { request }]
    ),
    where: async (frames) => {
        const userFrames = await frames.query(Sessioning._getUser, { session }, { user });
        // This sync only fires if the session is invalid (no user found).
        if (userFrames.length === 0) {
            // Add an error to the frame to be used in the `then` clause.
            return frames.map(f => ({ ...f, [error]: "Unauthorized" }));
        }
        // Veto this sync by returning empty frames if a user is found.
        return new Frames();
    },
    then: actions(
        [Requesting.respond, { request, error }]
    )
});

// This sync handles the case where there are no staged labels for an authorized user.
export const FinalizeWithNoLabels: Sync = ({ request, session, user, stagedLabel }) => ({
    when: actions(
        [Requesting.request, { path: "/Label/finalize", session }, { request }]
    ),
    where: async (frames) => {
        const userFrames = await frames.query(Sessioning._getUser, { session }, { user });
        // Veto if unauthorized (handled by another sync).
        if (userFrames.length === 0) return new Frames();

        const stagedLabelFrames = await userFrames.query(Label.getStagedLabels, { user_id: user }, { stagedLabel });
        // This sync only fires if there are NO staged labels.
        if (stagedLabelFrames.length === 0) {
            return userFrames; // Pass the frame with user binding through.
        }
        // Veto if there are labels (handled by another sync).
        return new Frames();
    },
    then: actions(
        // We still call finalize, which is idempotent and will clean up any (empty) state.
        [Label.finalize, { user_id: user }],
        [Requesting.respond, { request, ok: true }]
    )
});

// This sync handles the main success path where staged labels exist and are processed in bulk.
export const FinalizeWithLabels: Sync = (
  { request, session, user, stagedLabel, tx, tx_ids_for_marking, tx_data_for_category },
) => ({
    when: actions(
        [Requesting.request, { path: "/Label/finalize", session }, { request }]
    ),
    where: async (frames) => {
        const userFrames = await frames.query(Sessioning._getUser, { session }, { user });
        if (userFrames.length === 0) return new Frames(); // Veto for unauthorized

        const initialFrameWithUser = userFrames[0];
        const userId = initialFrameWithUser[user];

        const stagedLabelFrames = await userFrames.query(Label.getStagedLabels, { user_id: user }, { stagedLabel });
        if (stagedLabelFrames.length === 0) return new Frames(); // Veto for no labels

        const enrichedFrames = new Frames();
        for (const frame of stagedLabelFrames) {
            const sl = frame[stagedLabel] as any;
            try {
                const txDocFrame = await new Frames(frame).query(
                    Transaction.getTransaction,
                    { owner_id: userId, tx_id: sl.tx_id },
                    { tx },
                );
                if (txDocFrame.length > 0) enrichedFrames.push(txDocFrame[0]);
            } catch (e) {
                 console.warn(`Transaction details not found for staged label tx_id: ${sl.tx_id}. Skipping.`);
            }
        }

        if (enrichedFrames.length === 0) {
            // This case means staged labels existed but none had corresponding transactions.
            // The `FinalizeWithNoLabels` sync will run `Label.finalize` which cleans up the invalid
            // staged labels, and then it will correctly respond. So, we veto this sync.
            return new Frames();
        }

        const tx_ids_to_mark = enrichedFrames.map(f => (f[stagedLabel] as any).tx_id);
        const category_payload = enrichedFrames.map(f => {
            const sl = f[stagedLabel] as any;
            const txDoc = f[tx] as any;
            return {
                category_id: sl.category_id,
                tx_id: sl.tx_id,
                amount: txDoc.amount,
                tx_date: txDoc.date,
            };
        });

        return new Frames({
            ...initialFrameWithUser,
            [tx_ids_for_marking]: tx_ids_to_mark,
            [tx_data_for_category]: category_payload,
        });
    },
    then: actions(
        [Transaction.bulk_mark_labeled, { tx_ids: tx_ids_for_marking, requester_id: user }],
        [Category.bulk_add_transaction, { owner_id: user, transactions: tx_data_for_category }],
        [Label.finalize, { user_id: user }],
        [Requesting.respond, { request, ok: true }]
    )
});
```
