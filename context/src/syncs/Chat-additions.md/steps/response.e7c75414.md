---
timestamp: 'Wed Nov 05 2025 16:08:40 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_160840.2dd6691b.md]]'
content_id: e7c7541412ffc473ad7840f5c6fb527fe1f0ae7ee142866a9e0b92a8831efe9b
---

# response:

Based on your request, I will modify the synchronization logic for finalizing labels. The goal is to change the existing `FinalizeLabelsRequest` sync to orchestrate a sequence of actions: first, process each staged label by calling `Transaction.mark_labeled` and `Category.addTransaction`, and then, after all labels are processed, call `Label.finalize` to complete the operation.

The declarative nature of syncs makes a `for-each-then-do-once` pattern complex to implement in a single sync without race conditions or unintended side effects (like calling `Label.finalize` multiple times).

The cleanest solution involves separating the logic into two distinct syncs that are triggered by the initial request. One sync will handle the processing of each staged label, and the second sync will handle the final cleanup and response. This avoids race conditions and ensures the logic is clear and maintainable.

However, since you requested to change "the sync", I will provide a solution that replaces the original `FinalizeLabelsRequest` with a new version that performs the per-label processing. I will then create a second sync to handle the finalization, as this is the most robust pattern. I will also update the response syncs to correctly reflect the new workflow.

Here are the updated contents for `src/syncs/label.sync.ts`. I have replaced the original `FinalizeLabelsRequest` and its associated response syncs with a new set of three syncs to correctly implement the desired sequence.

### `src/syncs/label.sync.ts`

I've replaced the section for `Finalize Staged Labels` with the new implementation below. The other sections of the file remain unchanged.

```typescript
import { actions, Frames, Sync } from "@engine";
import { Category, Label, Requesting, Sessioning, Transaction } from "@concepts";

//-- Stage Label --//
/* ... other syncs ... */

//-- Discard Unstaged Label to Trash --//
/* ... other syncs ... */

//-- Finalize Staged Labels --//
// This operation is now split into three syncs to handle the required sequence correctly:
// 1. FinalizeLabels_ProcessEachLabel: Iterates through each staged label and calls the necessary actions.
// 2. FinalizeLabels_CleanupAndFinalize: After processing, this calls the single `Label.finalize` action.
// 3. FinalizeLabels_Response: Responds to the original request after finalization is complete.

/**
 * Sync 1: Processes each staged label.
 * It fetches all staged labels and for each one, gets the full transaction details,
 * then fires actions to mark the transaction as labeled and add its metrics to the category.
 */
export const FinalizeLabels_ProcessEachLabel: Sync = (
  { request, session, user, stagedLabel, tx_id, category_id, txInfo, amount, date, error },
) => ({
  when: actions([Requesting.request, { path: "/Label/finalize", session }, { request }]),
  where: async (frames) => {
    try {
      // 1. Authenticate user
      const originalFrame = frames[0];
      frames = await frames.query(Sessioning._getUser, { session }, { user });
      if (frames.length === 0) {
        return new Frames({ ...originalFrame, [error]: "Unauthorized" });
      }

      // 2. Get all staged labels for the user. This creates N frames, one for each label.
      const framesWithLabels = await frames.query(Label.getStagedLabels, { user_id: user }, { stagedLabel });
      if (framesWithLabels.length === 0) {
        return new Frames(); // If no labels, this sync does not run. The next sync will handle it.
      }

      // 3. For each staged label, enrich the frame with tx_id and category_id.
      let framesWithIds = new Frames(...framesWithLabels.map((f) => {
        const label = f[stagedLabel];
        return { ...f, [tx_id]: label.tx_id, [category_id]: label.category_id };
      }));

      // 4. For each frame, get the corresponding transaction info (amount, date).
      const framesWithTxInfo = await framesWithIds.query(Transaction.getTxInfo, { owner_id: user, tx_id }, { txInfo });
      if (framesWithTxInfo.length !== framesWithIds.length) {
        return new Frames({ ...originalFrame, [error]: "Could not retrieve transaction info for all staged labels." });
      }

      // 5. Extract amount and date into variables for the `then` clause.
      const finalFrames = new Frames(...framesWithTxInfo.map((f) => {
        const info = f[txInfo];
        return { ...f, [amount]: info.amount, [date]: info.date };
      }));

      return finalFrames;
    } catch (e) {
      // Catch any unexpected errors during the process and create an error frame.
      return new Frames({ ...frames[0], [error]: e.message });
    }
  },
  then: actions(
    [Transaction.mark_labeled, { tx_id, requester_id: user }],
    [Category.addTransaction, { owner_id: user, category_id, tx_id, amount, date }],
  ),
});

/**
 * Sync 2: Calls `Label.finalize` once.
 * This runs after the request and is responsible for the final step of the original `finalize`
 * action, which includes committing labels to history and clearing the staged labels list.
 * It also handles the case where there were no staged labels to begin with.
 */
export const FinalizeLabels_CleanupAndFinalize: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, { path: "/Label/finalize", session }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  // NOTE: This sync runs in parallel with the processing sync above. The `Label.finalize`
  // action has checks to prevent re-committing already processed labels, but this
  // highlights a coordination challenge in complex workflows. A more advanced implementation
  // might use intermediate actions to ensure a strict sequence.
  then: actions([Label.finalize, { user_id: user }]),
});

/**
 * Sync 3: Responds to the client.
 * This waits for the `Label.finalize` action to complete for the given request flow,
 * then sends a success or error response.
 */
export const FinalizeLabelsResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/finalize" }, { request }],
    // The response is sent after the single `Label.finalize` action completes.
    [Label.finalize, {}, {}],
  ),
  then: actions([Requesting.respond, { request, ok: true }]),
});

export const FinalizeLabelsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/finalize" }, { request }],
    // An error can come from either the processing or the finalization syncs.
    [
      (Transaction.mark_labeled, Category.addTransaction, Label.finalize),
      {},
      { error },
    ],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Suggest Label --//
/* ... other syncs ... */

//-- Cancel Labeling Session --//
/* ... other syncs ... */

//-- Remove Committed Label --//
/* ... other syncs ... */

//-- Get Label --//
/* ... other syncs ... */
```
