---
timestamp: 'Wed Nov 05 2025 16:46:52 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_164652.4b40f244.md]]'
content_id: f097e5ce3c7e8d490f43bed2d3c89050f2f0393d3683df33be6501ca8b0619cf
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

export const ProcessEachStagedLabelOnFinalizeRequest: Sync = ({
  request,
  session,
  user,
  stagedLabel,
  tx_id,
  category_id,
  tx,
  amount,
  date,
}) => ({
  when: actions(
    [Requesting.request, { path: "/Label/finalize", session }, { request }],
  ),
  where: async (frames) => {
    // 1. Authenticate the user from the session.
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Unauthorized, stop.

    const userId = frames[0][user];

    // 2. Get all staged labels for this user. This creates one frame per staged label.
    frames = await frames.query(
      Label.getStagedLabels,
      { user_id: user },
      { stagedLabel },
    );

    // 3. For each staged label (each frame), enrich it with transaction details (amount, date).
    const framesWithDetails = new Frames();
    for (const frame of frames) {
      try {
        const sl = frame[stagedLabel] as any; // StagedLabelDoc

        // Query for the full transaction to get its amount and date.
        const txDocFrame = await new Frames(frame).query(
          Transaction.getTransaction,
          { owner_id: userId, tx_id: sl.tx_id },
          { tx },
        );

        if (txDocFrame.length > 0) {
          const txDoc = txDocFrame[0][tx] as any; // TransactionDoc
          // Create a new frame with all necessary bindings for the 'then' clause.
          framesWithDetails.push({
            ...frame,
            [tx_id]: sl.tx_id,
            [category_id]: sl.category_id,
            [amount]: txDoc.amount,
            [date]: txDoc.date,
          });
        } else {
          console.warn(
            `Transaction details not found for staged label tx_id: ${sl.tx_id}. Skipping.`,
          );
        }
      } catch (e) {
        // Log the error and skip this label to allow others to succeed.
        console.error(
          `Error processing staged label: ${(e as Error).message}. Skipping.`,
        );
      }
    }
    return framesWithDetails;
  },
  then: actions(
    [Transaction.mark_labeled, { tx_id, requester_id: user }],
    [Category.addTransaction, {
      owner_id: user,
      category_id,
      tx_id,
      amount,
      tx_date: date,
    }],
  ),
});

/**
 * SYNC 2 of 2 for Finalization: Clean Up and Respond.
 *
 * This sync handles the "do-once" part of the logic. It also triggers on the
 * initial request. Its sole purpose is to perform the final cleanup by deleting
 * all of the user's staged labels and then responding to the original HTTP request
 * to signal completion.
 */
export const FinalizeAndRespondRequest: Sync = (
  { request, session, user, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Label/finalize", session }, { request }],
  ),
  where: async (frames) => {
    // Authenticate the user. If the session is invalid, we respond with an error.
    const userFrames = await frames.query(
      Sessioning._getUser,
      { session },
      { user },
    );
    if (userFrames.length === 0) {
      return new Frames({ ...frames[0], [error]: "Unauthorized" });
    }
    return userFrames;
  },
  then: (frame) => {
    // If the 'where' clause attached an error, respond with it.
    if (frame[error]) {
      return actions([Requesting.respond, { request, error: frame[error] }]);
    }
    // Otherwise, proceed with cleanup and successful response.
    return actions(
      // The 'cancelSession' action deletes all staged labels for the user, which
      // is the correct cleanup step after they have been processed by the other sync.
      [Label.cancelSession, { user_id: frame[user] }],
      // Finally, respond to the original HTTP request.
      [Requesting.respond, { request, ok: true }],
    );
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
