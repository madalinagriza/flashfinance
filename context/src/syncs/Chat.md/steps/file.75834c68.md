---
timestamp: 'Fri Nov 07 2025 02:42:39 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_024239.66960b1a.md]]'
content_id: 75834c6899916dc5102e0c0f65ed8e5ad90c70ce696e5e715460442fd9985709
---

# file: src\syncs\label.sync.ts

```typescript
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
    tx,
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

    // Keep the original frame to access the `user` binding later, which is a stable single value.
    const initialFrameWithUser = userFrames[0];
    const userId = initialFrameWithUser[user];

    // Get all staged labels for the user; this creates multiple frames.
    const stagedLabelFrames = await userFrames.query(Label.getStagedLabels, {
      user_id: user,
    }, { stagedLabel });
    if (stagedLabelFrames.length === 0) return new Frames(); // Veto for no labels

    // For each staged label, fetch its corresponding transaction details.
    // We iterate through the frames and manually query, as there's no bulk `getTransaction`.
    const enrichedFrames = new Frames();
    for (const frame of stagedLabelFrames) {
      const sl = frame[stagedLabel] as any;
      try {
        // `Transaction.getTransaction` returns `{tx: TransactionDoc}[]`
        const txDocFrame = await new Frames(frame).query(
          Transaction.getTransaction,
          { owner_id: userId, tx_id: sl.tx_id },
          { tx },
        );
        // The resulting frame in `txDocFrame` correctly contains the merged bindings
        // from `frame` (including `stagedLabel`) and the new `tx` binding.
        if (txDocFrame.length > 0) enrichedFrames.push(txDocFrame[0]);
      } catch (e) {
        console.warn(
          `Transaction details not found for staged label tx_id: ${sl.tx_id}. Skipping.`,
        );
      }
    }

    if (enrichedFrames.length === 0) {
      // This case can happen if staged labels exist but none have corresponding transactions.
      // We veto this sync; the `FinalizeWithNoLabels` sync will then run, call `Label.finalize`
      // which cleans up the now-invalid staged labels, and correctly respond to the client.
      return new Frames();
    }

    // With the enriched frames, we can now map over them to create the payloads for the bulk actions.
    // This is where the original error occurred because the `stagedLabel` binding was lost.
    const tx_ids_to_mark = enrichedFrames.map((f) =>
      (f[stagedLabel] as any).tx_id
    );
    const category_payload = enrichedFrames.map((f) => {
      const sl = f[stagedLabel] as any;
      // Note: `f[tx]` is the full TransactionDoc from the query result.
      const txDoc = (f[tx] as any[])[0].tx;
      return {
        category_id: sl.category_id,
        tx_id: sl.tx_id,
        amount: txDoc.amount,
        tx_date: txDoc.date,
      };
    });

    // Finally, return a single frame containing the aggregated data and original user/request bindings.
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
```
