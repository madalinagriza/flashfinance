---
timestamp: 'Wed Nov 05 2025 14:47:37 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_144737.c92d5440.md]]'
content_id: 3fbf8505b1befac5b96ecf7ad35a41c54aeba3caf9c90c1bf2d98791d9d71630
---

# file: src\syncs\label.sync.ts

```typescript
import { actions, Frames, Sync } from "@engine";
import { Category, Label, Requesting, Sessioning } from "@concepts";

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

//-- Finalize Staged Labels --//
export const FinalizeLabelsRequest: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, {
    path: "/Label/finalize",
    session,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Label.finalize, { user_id: user }]),
});

export const FinalizeLabelsResponseSuccess: Sync = ({ request, ok }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/finalize" }, { request }],
    // Assuming `finalize` is updated to return { ok: true } on success
    [Label.finalize, {}, { ok: true }],
  ),
  then: actions([Requesting.respond, { request, ok: true }]),
});

export const FinalizeLabelsResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/finalize" }, { request }],
    [Label.finalize, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
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
