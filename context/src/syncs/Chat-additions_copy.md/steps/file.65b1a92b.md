---
timestamp: 'Wed Nov 05 2025 18:36:20 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_183620.7a343fda.md]]'
content_id: 65b1a92b39911800e11d0d0e48957f0a5bc7c306692160867f6cfa937f809f52
---

# file: src\syncs\label.sync.ts

```typescript
import { actions, Frames, Sync } from "@engine";
import {
  Category,
  Label,
  Requesting,
  Sessioning,
  Transaction,
} from "@concepts";

//-- Stage Label --//
export const StageLabelRequest: Sync = (
  { request, session, user, tx_id, tx_name, tx_merchant, category_id },
) => ({
  when: actions([Requesting.request, {
    path: "/Label/stage",
    session,
    tx_id,
    tx_name,
    tx_merchant,
    category_id,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Label.stage, {
    user_id: user,
    tx_id,
    tx_name,
    tx_merchant,
    category_id,
  }]),
});

export const StageLabelResponseSuccess: Sync = (
  { request, label_tx_id },
) => ({
  when: actions(
    [Requesting.request, { path: "/Label/stage" }, { request }],
    [Label.stage, {}, { label_tx_id }],
  ),
  then: actions([Requesting.respond, { request, label_tx_id }]),
});

export const StageLabelResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/stage" }, { request }],
    [Label.stage, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Discard Unstaged Label to Trash --//
export const DiscardUnstagedToTrashRequest: Sync = (
  { request, session, user, tx_id, tx_name, tx_merchant },
) => ({
  when: actions([Requesting.request, {
    path: "/Label/discardUnstagedToTrash",
    session,
    tx_id,
    tx_name,
    tx_merchant,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Label.discardUnstagedToTrash, {
    user_id: user,
    tx_id,
    tx_name,
    tx_merchant,
  }]),
});

export const DiscardUnstagedToTrashResponseSuccess: Sync = (
  { request, label_tx_id },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Label/discardUnstagedToTrash" },
      { request },
    ],
    [Label.discardUnstagedToTrash, {}, { label_tx_id }],
  ),
  then: actions([Requesting.respond, { request, label_tx_id }]),
});

export const DiscardUnstagedToTrashResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Label/discardUnstagedToTrash" },
      { request },
    ],
    [Label.discardUnstagedToTrash, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Handles the user request to finalize all currently staged labels.
 * This single, comprehensive sync orchestrates the entire workflow:
 * 1. Fetches all staged labels for the authenticated user.
 * 2. Gathers necessary transaction details for each staged label.
 * 3. Calls bulk actions on `Transaction` and `Category` concepts for efficient processing.
 * 4. Calls `Label.finalize` to commit the labeling history and clean up the staging area.
 * 5. Responds to the initial HTTP request upon completion.
 *
 * This replaces the previous, less efficient, and potentially racy two-sync implementation.
 */
export const FinalizeStagedLabelsInBulkRequest: Sync = (
  {
    request,
    session,
    user,
    stagedLabel,
    tx,
    tx_ids_for_marking,
    tx_data_for_category,
    error,
  },
) => ({
  when: actions(
    [Requesting.request, { path: "/Label/finalize", session }, { request }],
  ),
  where: async (frames) => {
    const originalFrame = frames[0];

    // 1. Authenticate the user. If unauthorized, prepare a frame to respond with an error.
    const userFrames = await frames.query(
      Sessioning._getUser,
      { session },
      { user },
    );
    if (userFrames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Unauthorized" });
    }

    const initialFrameWithUser = userFrames[0];
    const userId = initialFrameWithUser[user];

    // 2. Get all staged labels for this user.
    const stagedLabelFrames = await userFrames.query(
      Label.getStagedLabels,
      { user_id: user },
      { stagedLabel },
    );

    // If no labels, proceed with empty payloads to ensure cleanup and response still occur.
    if (stagedLabelFrames.length === 0) {
      return new Frames({
        ...initialFrameWithUser,
        [tx_ids_for_marking]: [],
        [tx_data_for_category]: [],
      });
    }

    // 3. For each staged label, enrich the frame with transaction details (amount, date).
    const enrichedFrames = new Frames();
    for (const frame of stagedLabelFrames) {
      const sl = frame[stagedLabel] as any; // StagedLabelDoc

      const txDocFrame = await new Frames(frame).query(
        Transaction.getTransaction,
        { owner_id: userId, tx_id: sl.tx_id },
        { tx },
      );

      if (txDocFrame.length > 0) {
        enrichedFrames.push(txDocFrame[0]);
      } else {
        console.warn(
          `Transaction details not found for staged label tx_id: ${sl.tx_id}. Skipping.`,
        );
      }
    }

    // 4. Collect data from enriched frames for the bulk actions.
    const tx_ids_to_mark: string[] = enrichedFrames.map((f) =>
      (f[stagedLabel] as any).tx_id
    );

    const category_payload: any[] = enrichedFrames.map((f) => {
      const sl = f[stagedLabel] as any;
      const txDoc = f[tx] as any;
      return {
        category_id: sl.category_id,
        tx_id: sl.tx_id,
        amount: txDoc.amount,
        tx_date: txDoc.date,
      };
    });

    // 5. Return a single frame containing all necessary data for the `then` clause.
    return new Frames({
      ...initialFrameWithUser,
      [tx_ids_for_marking]: tx_ids_to_mark,
      [tx_data_for_category]: category_payload,
    });
  },
  then: (frame) => {
    // If the 'where' clause attached an error (e.g., unauthorized), just respond with it.
    if (frame[error]) {
      return actions([Requesting.respond, {
        request: frame[request],
        error: frame[error],
      }]);
    }

    const actionsToRun = [];

    // Only add bulk actions if there are transactions to process.
    if (frame[tx_ids_for_marking] && frame[tx_ids_for_marking].length > 0) {
      actionsToRun.push(
        [
          Transaction.bulk_mark_labeled,
          { tx_ids: frame[tx_ids_for_marking], requester_id: frame[user] },
        ],
        [
          Category.bulk_add_transaction,
          { owner_id: frame[user], transactions: frame[tx_data_for_category] },
        ],
      );
    }

    // Always call Label.finalize to commit history and clean up, then respond successfully.
    actionsToRun.push(
      [Label.finalize, { user_id: frame[user] }],
      [Requesting.respond, { request: frame[request], ok: true }],
    );

    return actions(...actionsToRun);
  },
});

//-- Suggest Label --//
export const SuggestLabelRequest: Sync = (
  {
    request,
    session,
    user,
    tx_id,
    tx_name,
    tx_merchant,
    txInfo,
    category_id,
    name,
    allCategories,
  },
) => ({
  when: actions([Requesting.request, {
    path: "/Label/suggest",
    session,
    tx_id,
    tx_name,
    tx_merchant,
  }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames(); // Invalid session, stops the sync
    }

    const categoryFrames = await frames.query(
      Category.getCategoriesFromOwner,
      { owner_id: user },
      { category_id, name },
    );

    const categories = categoryFrames.map((f) => [f[name], f[category_id]]);
    const originalFrame = frames[0];
    const txInfoValue = {
      tx_id: originalFrame[tx_id],
      tx_name: originalFrame[tx_name],
      tx_merchant: originalFrame[tx_merchant],
    };

    return new Frames({
      ...originalFrame,
      [allCategories]: categories,
      [txInfo]: txInfoValue,
    });
  },
  then: actions([Label.suggest, {
    user_id: user,
    allCategories,
    txInfo,
  }]),
});

export const SuggestLabelResponseSuccess: Sync = (
  { request, id, name },
) => ({
  when: actions(
    [Requesting.request, { path: "/Label/suggest" }, { request }],
    [Label.suggest, {}, { id, name }],
  ),
  then: actions([Requesting.respond, { request, id, name }]),
});

export const SuggestLabelResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/suggest" }, { request }],
    [Label.suggest, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Cancel Labeling Session --//
export const CancelSessionRequest: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, {
    path: "/Label/cancelSession",
    session,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Label.cancelSession, { user_id: user }]),
});

export const CancelSessionResponseSuccess: Sync = ({ request, ok }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/cancelSession" }, { request }],
    // Assuming `cancelSession` is updated to return { ok: true } on success
    [Label.cancelSession, {}, { ok: true }],
  ),
  then: actions([Requesting.respond, { request, ok: true }]),
});

export const CancelSessionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/cancelSession" }, { request }],
    [Label.cancelSession, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Remove Committed Label --//
export const RemoveCommittedLabelRequest: Sync = (
  { request, session, user, tx_id },
) => ({
  when: actions([Requesting.request, {
    path: "/Label/removeCommittedLabel",
    session,
    tx_id,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Label.removeCommittedLabel, { user_id: user, tx_id }]),
});

export const RemoveCommittedLabelResponseSuccess: Sync = (
  { request, label_tx_id },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Label/removeCommittedLabel" },
      { request },
    ],
    [Label.removeCommittedLabel, {}, { label_tx_id }],
  ),
  then: actions([Requesting.respond, { request, label_tx_id }]),
});

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

export const GetLabelRequest: Sync = (
  { request, session, user, tx_id, label, error },
) => ({
  when: actions([Requesting.request, {
    path: "/Label/getLabel",
    session,
    tx_id,
  }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // Authenticate the session to get the user
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // Handle unauthorized case where session is invalid
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Unauthorized" });
    }

    // Assuming the user is authenticated, query for the label.
    // The `Label.getLabel` query returns a single document or null.
    // The engine translates a null/empty result into zero frames.
    const resultFrames = await frames.query(
      Label.getLabel,
      { user_id: user, tx_id },
      { label }, // The result from the query will be bound to the `label` variable.
    );

    // Handle the case where no label is found for the given transaction ID
    if (resultFrames.length === 0) {
      // Respond successfully but with a null value for the label.
      // We use `frames[0]` which contains the bindings from before the Label query.
      return new Frames({ ...frames[0], [label]: null });
    }

    // Return the successful frame containing the found label
    return resultFrames;
  },
  then: actions([Requesting.respond, { request, label, error }]),
});
```
