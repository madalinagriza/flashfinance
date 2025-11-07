import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import LabelConcept, { Id } from "../LabelConcept.ts";

Deno.test("LabelConcept: finalize on empty staged labels is a no-op", async () => {
  const [db, client] = await testDb();
  const store = new LabelConcept(db);
  const user = Id.from("test-user-no-staging");

  try {
    // 1. Pre-condition: Ensure there are no staged labels for the user.
    // This is implicitly handled by starting with a clean DB in testDb(),
    // but we can also explicitly cancel any lingering staged labels from previous tests.
    await store.cancelSession(user);

    // Verify that there are no committed labels for this user and a sample transaction
    // before calling finalize. This is to ensure that finalize doesn't create any new
    // committed labels when there are no staged ones.
    const sampleTxId = Id.from("sample-tx-id");
    const initialCommittedLabels = await store.getLabel(user, sampleTxId);
    assertEquals(
      initialCommittedLabels.length,
      0,
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
    const postFinalizeCommittedLabels = await store.getLabel(user, sampleTxId);
    assertEquals(
      postFinalizeCommittedLabels.length,
      0,
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
Deno.test("LabelConcept: Attempting to stage the same (user, tx_id) twice rejects with the expected error", async () => {
  const [db, client] = await testDb();
  const store = new LabelConcept(db);

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
    let committedLabels = await store.getLabel(user, txId);
    assertEquals(
      committedLabels.length,
      0,
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
    committedLabels = await store.getLabel(user, txId);
    assertEquals(
      committedLabels.length,
      0,
      "No committed label should exist after the second, rejected 'stage' call.",
    );

    // 5. Verify that no transaction info or category history was created by the failed staging attempt.
    const txInfo = await store.getTxInfo(user, txId);
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
Deno.test("LabelConcept: Stage → Cancel → Re-Stage → Finalize sequence clears state", async () => {
  const [db, client] = await testDb();
  const store = new LabelConcept(db);

  const user = Id.from("user_reset_test");
  const txId = Id.from("tx_reset_sequence");
  const txName = "Reset Test Tx";
  const txMerchant = "Reset Merchant";
  const categoryId1 = Id.from("category_initial");
  const categoryId2 = Id.from("category_final");

  try {
    // 1. Initial state: No label exists for the (user, tx_id)
    console.log("Step 1: Verifying initial state (no label)...");
    let currentLabels = await store.getLabel(user, txId);
    assertEquals(
      currentLabels.length,
      0,
      "Initially, no label should exist for the (user, tx_id).",
    );
    console.log("   ✅ Initial state verified.");

    // 2. First stage: Stage a label for the transaction.
    console.log("Step 2: Staging the initial label...");
    await store.stage(user, txId, txName, txMerchant, categoryId1);
    console.log("   ✅ Initial label staged.");

    // 3. Verify: After staging, the label is not yet committed.
    currentLabels = await store.getLabel(user, txId);
    assertEquals(
      currentLabels.length,
      0,
      "Label should not be committed immediately after staging.",
    );
    console.log("   ✅ Verified: Label remains uncommitted after first stage.");

    // 4. Cancel: Cancel the staged label.
    console.log("Step 3: Cancelling the staged label...");
    await store.cancelSession(user);
    console.log("   ✅ Staged label cancelled.");

    // 5. Verify: Cancelling should clear any pending staged labels.
    // We can't directly inspect staged labels via public API, but subsequent `getLabel`
    // and `getTxInfo` should reflect that nothing was committed.
    currentLabels = await store.getLabel(user, txId);
    assertEquals(
      currentLabels.length,
      0,
      "No committed label should exist after cancelling staged label.",
    );

    let txInfo = await store.getTxInfo(user, txId);
    assertEquals(
      txInfo,
      null,
      "No transaction info should exist after cancelling staged label.",
    );

    const initialCategoryHistory = await store.getCategoryHistory(
      user,
      categoryId1,
    );
    assertEquals(
      initialCategoryHistory.length,
      0,
      "Category history should be empty after cancelling.",
    );
    console.log(
      "   ✅ Verified: Cancel operation cleared pending staged labels.",
    );

    // 6. Re-stage: Stage a new label for the same (user, tx_id) with a different category.
    console.log("Step 4: Re-staging the label with a new category...");
    await store.stage(user, txId, txName, txMerchant, categoryId2);
    console.log("   ✅ Label re-staged.");

    // 7. Verify: After re-staging, the label is still not committed.
    currentLabels = await store.getLabel(user, txId);
    assertEquals(
      currentLabels.length,
      0,
      "Label should not be committed immediately after re-staging.",
    );
    console.log("   ✅ Verified: Label remains uncommitted after re-stage.");

    // 8. Finalize: Finalize the re-staged label.
    console.log("Step 5: Finalizing the re-staged label...");
    await store.finalize(user);
    console.log("   ✅ Label finalized.");

    // 9. Verify: The finalize operation should have successfully committed the label.
    currentLabels = await store.getLabel(user, txId);
    assertEquals(
      currentLabels.length,
      1,
      "A committed label should exist after finalize.",
    );
    const [currentLabel] = currentLabels;
    assertEquals(
      currentLabel.user_id,
      user.toString(),
      "Committed label should have the correct user ID.",
    );
    assertEquals(
      currentLabel.tx_id,
      txId.toString(),
      "Committed label should have the correct transaction ID.",
    );
    assertEquals(
      currentLabel.category_id,
      categoryId2.toString(),
      "Committed label should have the correct category ID.",
    );
    console.log(
      "   ✅ Verified: Label successfully committed with correct details.",
    );

    // 10. Verify: Transaction info and category history reflect the single committed label.
    txInfo = await store.getTxInfo(user, txId);
    assertExists(txInfo, "Transaction info should exist after finalize.");
    assertEquals(
      txInfo.tx_name,
      txName,
      "Transaction info should have the correct name.",
    );
    assertEquals(
      txInfo.tx_merchant,
      txMerchant,
      "Transaction info should have the correct merchant.",
    );
    console.log("   ✅ Verified: Transaction info correctly recorded.");

    const finalCategoryHistory = await store.getCategoryHistory(
      user,
      categoryId2,
    );
    assertEquals(
      finalCategoryHistory.length,
      1,
      "Category history should contain one entry for the finalized label.",
    );
    assertEquals(
      finalCategoryHistory[0],
      txId.toString(),
      "Category history should contain the correct transaction ID.",
    );

    const initialCategoryHistoryAfterFinalize = await store.getCategoryHistory(
      user,
      categoryId1,
    );
    assertEquals(
      initialCategoryHistoryAfterFinalize.length,
      0,
      "The initial category should not have any history after the re-labeling.",
    );
    console.log(
      "   ✅ Verified: Category history reflects the single, final committed label.",
    );

    console.log(
      "\n✅ 'Stage → Cancel → Re-Stage → Finalize' sequence verified successfully.",
    );
  } finally {
    await client.close();
  }
});
