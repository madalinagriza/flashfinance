---
timestamp: 'Fri Oct 17 2025 21:16:26 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_211626.9f506885.md]]'
content_id: 8a6a0be565c8d9d581754a57adf077b84204d20079df8340e74a6f36cc49a469
---

# file: src/concepts/FlashFinance/Label/test-actions/test-non-popular.ts

```typescript
import { assertEquals, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { Id, LabelStore } from "../label.ts";

Deno.test("LabelStore: finalize on empty staged labels is a no-op", async () => {
  const [db, client] = await testDb();
  const store = new LabelStore(db);
  const user = Id.from("test-user-no-staging");

  try {
    // 1. Pre-condition: Ensure there are no staged labels for the user.
    // This is implicitly handled by starting with a clean DB in testDb(),
    // but we can also explicitly cancel any lingering staged labels from previous tests.
    await store.cancel(user);

    // Verify that there are no committed labels for this user and a sample transaction
    // before calling finalize. This is to ensure that finalize doesn't create any new
    // committed labels when there are no staged ones.
    const sampleTxId = Id.from("sample-tx-id");
    const initialCommittedLabel = await store.getLabel(user, sampleTxId);
    assertEquals(
      initialCommittedLabel,
      null,
      "Pre-condition: No committed label should exist for the sample transaction.",
    );

    // 2. ACTION: Call finalize with no staged labels for the user.
    // This call is expected to be a no-op.
    await store.finalize(user);

    // 3. VERIFY:
    // (1) The finalize operation did not throw an error.
    // (This is implicitly checked if the test reaches this point without throwing).

    // (2) Previously committed labels remain unchanged.
    // We verify this by checking that the sample transaction's label (which we
    // asserted to be null earlier) is still null. This confirms that `finalize`
    // did not erroneously create a label.
    const postFinalizeCommittedLabel = await store.getLabel(user, sampleTxId);
    assertEquals(
      postFinalizeCommittedLabel,
      null,
      "No new committed label should be created by finalize when no staged labels exist.",
    );

    // Additionally, check that no transaction info was created.
    const txInfo = await store.getTxInfo(user, sampleTxId);
    assertEquals(
      txInfo,
      null,
      "No transaction info should be created by finalize when no staged labels exist.",
    );

    // And no category history entry was created.
    const categoryHistory = await store.getCategoryHistory(
      user,
      Id.from("any-category"),
    );
    assertEquals(
      categoryHistory.length,
      0,
      "No category history entry should be created by finalize when no staged labels exist.",
    );
  } finally {
    await client.close();
  }
});
Deno.test("LabelStore: Attempting to stage the same (user, tx_id) twice rejects with the expected error", async () => {
  const [db, client] = await testDb();
  const store = new LabelStore(db);

  const user = Id.from("user_duplicate_stage");
  const txId = Id.from("tx_duplicate_stage");
  const categoryId1 = Id.from("category_1");
  const categoryId2 = Id.from("category_2");
  const txName = "Test Transaction";
  const txMerchant = "Test Merchant";

  try {
    // 1. First 'stage' call succeeds.
    console.log("Step 1: Performing the first 'stage' call...");
    await store.stage(user, txId, txName, txMerchant, categoryId1);
    console.log("   First 'stage' call succeeded.");

    // 2. Verify that no committed label exists before the second stage call.
    let committedLabel = await store.getLabel(user, txId);
    assertEquals(
      committedLabel,
      null,
      "No committed label should exist immediately after the first 'stage' call.",
    );

    // 3. Second 'stage' call for the same (user, tx_id) rejects with the correct error.
    console.log(
      "Step 2: Attempting to stage the same (user, tx_id) a second time...",
    );
    await assertRejects(
      async () => {
        await store.stage(user, txId, txName, txMerchant, categoryId2);
      },
      Error,
      `A staged label already exists for transaction ${txId.toString()} for this user.`,
      "The second 'stage' call for the same (user, tx_id) should reject with the expected error.",
    );
    console.log("   Second 'stage' call rejected as expected.");

    // 4. Verify that no committed label exists after the failed second stage call.
    // This ensures that the failed attempt did not inadvertently create a committed label.
    committedLabel = await store.getLabel(user, txId);
    assertEquals(
      committedLabel,
      null,
      "No committed label should exist after the second, rejected 'stage' call.",
    );

    // 5. Verify that no transaction info or category history was created by the failed staging attempt.
    let txInfo = await store.getTxInfo(user, txId);
    assertEquals(
      txInfo,
      null,
      "No transaction info should be created after a failed 'stage' call.",
    );
    let categoryHistory = await store.getCategoryHistory(user, categoryId1);
    assertEquals(
      categoryHistory.length,
      0,
      "Category history should remain empty after a failed 'stage' call.",
    );
    categoryHistory = await store.getCategoryHistory(user, categoryId2);
    assertEquals(
      categoryHistory.length,
      0,
      "Category history should remain empty (for the second category) after a failed 'stage' call.",
    );

    console.log("Test completed: Duplicate staging rejected as expected.");
  } finally {
    await client.close();
  }
});

```
