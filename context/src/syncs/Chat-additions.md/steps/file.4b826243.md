---
timestamp: 'Fri Nov 07 2025 02:52:18 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_025218.72c9cd3a.md]]'
content_id: 4b8262430cbdff036b880b1549deb61a20c01487e47bb0e770b4e45dfba51740
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

//-- Finalize Staged Labels (Multi-Sync Implementation) --//

// This sync handles the unauthorized case for the finalize request.
export const FinalizeStagedLabelsUnauthorized: Sync = (
  { request, session, user, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Label/finalize", session }, { request }],
  ),
  where: async (frames) => {
    const userFrames = await frames.query(Sessioning._getUser, { session }, {
      user,
    });
    // This sync only fires if the session is invalid (no user found).
    if (userFrames.length === 0) {
      // Add an error to the frame to be used in the `then` clause.
      return frames.map((f) => ({ ...f, [error]: "Unauthorized" }));
    }
    // Veto this sync by returning empty frames if a user is found.
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// This sync handles the case where there are no staged labels for an authorized user.
export const FinalizeWithNoLabels: Sync = (
  { request, session, user, stagedLabel },
) => ({
  when: actions(
    [Requesting.request, { path: "/Label/finalize", session }, { request }],
  ),
  where: async (frames) => {
    const userFrames = await frames.query(Sessioning._getUser, { session }, {
      user,
    });
    // Veto if unauthorized (handled by another sync).
    if (userFrames.length === 0) return new Frames();

    const stagedLabelFrames = await userFrames.query(Label.getStagedLabels, {
      user_id: user,
    }, { stagedLabel });
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
    [Requesting.respond, { request, ok: true }],
  ),
});

// This sync handles the main success path where staged labels exist and are processed in bulk.
export const FinalizeWithLabels: Sync = (
  {
    request,
    session,
    user,
    stagedLabel,
    txInfo,
    tx_ids_for_marking,
    tx_data_for_category,
  },
) => ({
  when: actions(
    [Requesting.request, { path: "/Label/finalize", session }, { request }],
  ),
  where: async (frames) => {
    const userFrames = await frames.query(Sessioning._getUser, { session }, {
      user,
    });
    if (userFrames.length === 0) return new Frames(); // Veto for unauthorized

    const initialFrameWithUser = userFrames[0];
    const userId = initialFrameWithUser[user];

    const stagedLabelFrames = await userFrames.query(Label.getStagedLabels, {
      user_id: user,
    }, { stagedLabel });
    if (stagedLabelFrames.length === 0) return new Frames(); // Veto for no labels

    const enrichedFrames = new Frames();
    for (const frame of stagedLabelFrames) {
      const sl = frame[stagedLabel] as any;
      try {
        // Use `getTxInfo` which is simpler and returns `ParsedTransactionInfo[]`.
        // The result will be bound as an array to the `txInfo` variable.
        const txInfoFrames = await new Frames(frame).query(
          Transaction.getTxInfo,
          { owner_id: userId, tx_id: sl.tx_id },
          { txInfo },
        );
        if (txInfoFrames.length > 0) {
          enrichedFrames.push(txInfoFrames[0]);
        }
      } catch (e) {
        console.warn(
          `Transaction info not found for staged label tx_id: ${sl.tx_id}. Skipping.`,
        );
      }
    }

    if (enrichedFrames.length === 0) {
      // This case means staged labels existed but none had corresponding transactions.
      // We veto this sync; the `FinalizeWithNoLabels` sync will then run, call `Label.finalize`
      // which cleans up the invalid staged labels, and correctly respond.
      return new Frames();
    }

    const tx_ids_to_mark = enrichedFrames.map((f) =>
      (f[stagedLabel] as any).tx_id
    );
    const category_payload = enrichedFrames.map((f) => {
      const sl = f[stagedLabel] as any;
      // The `txInfo` binding holds an array; we need the first element.
      const info = (f[txInfo] as any[])[0];
      return {
        category_id: sl.category_id,
        tx_id: sl.tx_id,
        amount: info.amount,
        tx_date: info.date,
      };
    });

    return new Frames({
      ...initialFrameWithUser,
      [tx_ids_for_marking]: tx_ids_to_mark,
      [tx_data_for_category]: category_payload,
    });
  },
  then: actions(
    [Transaction.bulk_mark_labeled, {
      tx_ids: tx_ids_for_marking,
      requester_id: user,
    }],
    [Category.bulk_add_transaction, {
      owner_id: user,
      transactions: tx_data_for_category,
    }],
    [Label.finalize, { user_id: user }],
    [Requesting.respond, { request, ok: true }],
  ),
});

//-- Suggest Label --//
export const SuggestLabelRequest: Sync = (
  {
    request,
    session,
    user,
    txInfo,
    allCategories,
    category_id,
    name,
  },
) => ({
  when: actions([Requesting.request, {
    path: "/Label/suggest",
    session,
    txInfo,
  }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames(); // Veto sync if session is invalid.
    }

    const categoryFrames = await frames.query(
      Category.getCategoriesFromOwner,
      { owner_id: user },
      { category_id, name }, // Output bindings for each category
    );

    const categoriesList = categoryFrames.map((f) => [f[name], f[category_id]]);

    const originalFrame = frames[0];

    return new Frames({
      ...originalFrame,
      [allCategories]: categoriesList,
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

    frames = await frames.query(Sessioning._getUser, { session }, { user });

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Unauthorized" });
    }

    const resultFrames = await frames.query(
      Label.getLabel,
      { user_id: user, tx_id },
      { label },
    );

    if (resultFrames.length === 0) {
      return new Frames({ ...frames[0], [label]: null });
    }

    return resultFrames;
  },
  then: actions([Requesting.respond, { request, label, error }]),
});
```
