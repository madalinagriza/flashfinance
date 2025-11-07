---
timestamp: 'Fri Nov 07 2025 03:09:02 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_030902.94489002.md]]'
content_id: 58862a0900c80b8d084186c020f885d59fd5244fe64ef3af45cf9a6a9521d933
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

// /**
//  * Handles the user request to finalize all currently staged labels.
//  * This has been split into multiple syncs to handle different outcomes:
//  * 1. FinalizeStagedLabelsUnauthorized: Responds with an error if the session is invalid.
//  * 2. FinalizeWithNoLabels: Handles the case where a user has no staged labels to finalize.
//  * 3. FinalizeWithLabels: The main success path, processing all staged labels in bulk.
//  *
//  * This multi-sync approach correctly models the conditional logic without using a function
//  * in the `then` clause, which resolves the errors from the previous implementation.
//  */

// // This sync handles the unauthorized case for the finalize request.
// export const FinalizeStagedLabelsUnauthorized: Sync = (
//   { request, session, user, error },
// ) => ({
//   when: actions(
//     [Requesting.request, { path: "/Label/finalize", session }, { request }],
//   ),
//   where: async (frames) => {
//     const userFrames = await frames.query(Sessioning._getUser, { session }, {
//       user,
//     });
//     // This sync only fires if the session is invalid (no user found).
//     if (userFrames.length === 0) {
//       // Add an error to the frame to be used in the `then` clause.
//       return frames.map((f) => ({ ...f, [error]: "Unauthorized" }));
//     }
//     // Veto this sync by returning empty frames if a user is found.
//     return new Frames();
//   },
//   then: actions(
//     [Requesting.respond, { request, error }],
//   ),
// });

// // This sync handles the case where there are no staged labels for an authorized user.
// export const FinalizeWithNoLabels: Sync = (
//   { request, session, user, stagedLabel },
// ) => ({
//   when: actions(
//     [Requesting.request, { path: "/Label/finalize", session }, { request }],
//   ),
//   where: async (frames) => {
//     const userFrames = await frames.query(Sessioning._getUser, { session }, {
//       user,
//     });
//     // Veto if unauthorized (handled by another sync).
//     if (userFrames.length === 0) return new Frames();

//     const stagedLabelFrames = await userFrames.query(Label.getStagedLabels, {
//       user_id: user,
//     }, { stagedLabel });
//     // This sync only fires if there are NO staged labels.
//     if (stagedLabelFrames.length === 0) {
//       return userFrames; // Pass the frame with user binding through.
//     }
//     // Veto if there are labels (handled by another sync).
//     return new Frames();
//   },
//   then: actions(
//     // We still call finalize, which is idempotent and will clean up any (empty) state.
//     [Label.finalize, { user_id: user }],
//     [Requesting.respond, { request, ok: true }],
//   ),
// });

// // This sync handles the main success path where staged labels exist and are processed in bulk.
// export const FinalizeWithLabels: Sync = (
//   {
//     request,
//     session,
//     user,
//     stagedLabel,
//     tx,
//     tx_ids_for_marking,
//     tx_data_for_category,
//   },
// ) => ({
//   when: actions(
//     [Requesting.request, { path: "/Label/finalize", session }, { request }],
//   ),
//   where: async (frames) => {
//     const userFrames = await frames.query(Sessioning._getUser, { session }, {
//       user,
//     });
//     if (userFrames.length === 0) return new Frames(); // Veto for unauthorized

//     const initialFrameWithUser = userFrames[0];
//     const userId = initialFrameWithUser[user];

//     const stagedLabelFrames = await userFrames.query(Label.getStagedLabels, {
//       user_id: user,
//     }, { stagedLabel });
//     if (stagedLabelFrames.length === 0) return new Frames(); // Veto for no labels

//     const enrichedFrames = new Frames();
//     for (const frame of stagedLabelFrames) {
//       const sl = frame[stagedLabel] as any;
//       try {
//         const txDocFrame = await new Frames(frame).query(
//           Transaction.getTransaction,
//           { owner_id: userId, tx_id: sl.tx_id },
//           { tx },
//         );
//         if (txDocFrame.length > 0) enrichedFrames.push(txDocFrame[0]);
//       } catch (e) {
//         console.warn(
//           `Transaction details not found for staged label tx_id: ${sl.tx_id}. Skipping.`,
//         );
//       }
//     }

//     if (enrichedFrames.length === 0) {
//       // This case means staged labels existed but none had corresponding transactions.
//       // The `FinalizeWithNoLabels` sync will run `Label.finalize` which cleans up the invalid
//       // staged labels, and then it will correctly respond. So, we veto this sync.
//       return new Frames();
//     }

//     const tx_ids_to_mark = enrichedFrames.map((f) =>
//       (f[stagedLabel] as any).tx_id
//     );
//     const category_payload = enrichedFrames.map((f) => {
//       const sl = f[stagedLabel] as any;
//       const txDoc = f[tx] as any;
//       return {
//         category_id: sl.category_id,
//         tx_id: sl.tx_id,
//         amount: txDoc.amount,
//         tx_date: txDoc.date,
//       };
//     });

//     return new Frames({
//       ...initialFrameWithUser,
//       [tx_ids_for_marking]: tx_ids_to_mark,
//       [tx_data_for_category]: category_payload,
//     });
//   },
//   then: actions(
//     [Transaction.bulk_mark_labeled, {
//       tx_ids: tx_ids_for_marking,
//       requester_id: user,
//     }],
//     [Category.bulk_add_transaction, {
//       owner_id: user,
//       transactions: tx_data_for_category,
//     }],
//     [Label.finalize, { user_id: user }],
//     [Requesting.respond, { request, ok: true }],
//   ),
// });

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
    console.trace(
      "[Label.sync] FinalizeWithLabels: fetched staged labels",
      { count: stagedLabelFrames.length, request },
    );
    if (stagedLabelFrames.length === 0) return new Frames(); // Veto for no labels

    const enrichedFrames = new Frames();
    type StagedLabelBinding = {
      tx_id: string;
      category_id: string;
    };
    type ParsedTxInfo = {
      amount: number;
      date: Date;
    };

    for (const frame of stagedLabelFrames) {
      const sl = frame[stagedLabel] as StagedLabelBinding | undefined;
      if (!sl) {
        console.error(
          "[Label.sync] FinalizeWithLabels: missing staged label binding",
          { request, frame },
        );
        continue;
      }
      try {
        // Use `getTxInfo` which is simpler and returns `ParsedTransactionInfo[]`.
        // The result will be bound as an array to the `txInfo` variable.
        const txInfoFrames = await new Frames(frame).query(
          Transaction.getTxInfo,
          { owner_id: userId, tx_id: sl.tx_id },
          { txInfo },
        );
        console.trace(
          "[Label.sync] FinalizeWithLabels: transaction info lookup",
          { tx_id: sl.tx_id, frames: txInfoFrames.length, request },
        );
        if (txInfoFrames.length > 0) {
          enrichedFrames.push(txInfoFrames[0]);
        }
      } catch (e) {
        console.warn(
          `Transaction info not found for staged label tx_id: ${sl.tx_id}. Skipping.`,
          { request, error: (e as Error).message },
        );
      }
    }

    if (enrichedFrames.length === 0) {
      // This case means staged labels existed but none had corresponding transactions.
      // We veto this sync; the `FinalizeWithNoLabels` sync will then run, call `Label.finalize`
      // which cleans up the invalid staged labels, and correctly respond.
      console.warn(
        "[Label.sync] FinalizeWithLabels: no enriched frames after transaction lookup",
        { request },
      );
      return new Frames();
    }

    const tx_ids_to_mark = enrichedFrames.map((f) => {
      const sl = f[stagedLabel] as StagedLabelBinding | undefined;
      return sl?.tx_id;
    }).filter((txId): txId is string => Boolean(txId));
    type CategoryPayload = {
      category_id: string;
      tx_id: string;
      amount: number;
      tx_date: Date;
    };

    const category_payload = enrichedFrames.map<CategoryPayload | null>((f) => {
      const sl = f[stagedLabel] as StagedLabelBinding | undefined;
      const infoList = f[txInfo] as ParsedTxInfo[] | undefined;
      const info = infoList?.[0];
      if (!sl || !info) {
        console.error(
          "[Label.sync] FinalizeWithLabels: missing transaction info entry",
          { request, stagedLabel: sl },
        );
        return null;
      }
      return {
        category_id: sl.category_id,
        tx_id: sl.tx_id,
        amount: info.amount,
        tx_date: info.date,
      };
    }).filter((entry): entry is CategoryPayload => entry !== null);

    console.debug(
      "[Label.sync] FinalizeWithLabels: prepared payload",
      {
        request,
        tx_ids_to_mark,
        category_payload_count: category_payload.length,
      },
    );

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
  // 1. Corrected `when` clause to match the actual request payload from the log.
  // It now expects a `txInfo` object.
  // We also match the client-sent `allCategories` so the sync fires, but we will ignore its value.
  when: actions([Requesting.request, {
    path: "/Label/suggest",
    session,
    txInfo,
  }, { request }]),

  // 2. Corrected `where` clause with robust logic for fetching and aggregating data.
  where: async (frames) => {
    // Authenticate the user.
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames(); // Veto sync if session is invalid.
    }

    // Securely fetch the user's categories from the backend. This produces multiple frames.
    const categoryFrames = await frames.query(
      Category.getCategoriesFromOwner,
      { owner_id: user },
      { category_id, name }, // Output bindings for each category
    );

    // Collect the results from the multiple category frames into a single list.
    const categoriesList = categoryFrames.map((f) => [f[name], f[category_id]]);

    // Get the bindings from the original frame (before the multi-frame category query).
    const originalFrame = frames[0];

    // Return a single, new frame containing all original bindings,
    // but with `allCategories` now overwritten with our secure, backend-fetched list.
    return new Frames({
      ...originalFrame,
      [allCategories]: categoriesList,
    });
  },

  // 3. The `then` clause remains the same, as the `where` clause now provides
  // all the necessary bindings correctly.
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

export const CancelSessionResponseSuccess: Sync = ({ request, ok: _ok }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/cancelSession" }, { request }],
    // This will now correctly match due to the change in LabelConcept.ts
    [Label.cancelSession, {}, { ok: true }],
  ),
  then: actions([Requesting.respond, { request, ok: true }]),
});

export const CancelSessionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/cancelSession" }, { request }],
    // This will match if Label.cancelSession results in an error object
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
