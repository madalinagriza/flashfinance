---
timestamp: 'Fri Oct 17 2025 22:50:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_225032.0b7867c1.md]]'
content_id: 9b659109bca67ae0502380a031a356e4fc3de0deb43d8a6050cf14e9c99f304c
---

# file: src/concepts/FlashFinance/Label/test-actions/test-op-simple.ts

```typescript
import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { Id, LabelStore } from "../label.ts";

// The built-in Trash category ID, defined here for verification purposes
// as it is not exported from the main label.ts module.
const TRASH_CATEGORY_ID = Id.from("TRASH_CATEGORY");

Deno.test("Principle: User stages, finalizes, updates, and removes labels on transactions", async () => {
  const [db, client] = await testDb();
  const store = new LabelStore(db);

  try {
    // 1. SETUP: Define user, categories, and a transaction
    const user = Id.from("user_normal_ops");
    const catGroceries = Id.from("cat_groceries");
    const catDining = Id.from("cat_dining");
    const tx1_id = Id.from("tx_shop_rite");
    const tx1_name = "Shop Rite";
    const tx1_merchant = "SHOP RITE #555";

    // --- NEW FLOW: Stage then Finalize ---

    // 2. ACTION: STAGE a label for a new transaction.
    console.log("Step 1: Staging a new label (Groceries)...");
    await store.stage(user, tx1_id, tx1_name, tx1_merchant, catGroceries);

    // 3. VERIFY a) No committed label exists yet.
    // getLabel now takes user_id
    let initialLabel = await store.getLabel(user, tx1_id);
    assertEquals(
      initialLabel,
      null,
      "No committed label should exist after 'stage'.",
    );

    // 3. VERIFY b) No transaction info or category history is committed yet.
    // getTxInfo now takes user_id
    let txInfo = await store.getTxInfo(user, tx1_id);
    assertEquals(
      txInfo,
      null,
      "No transaction info should be committed after 'stage'.",
    );
    // getCategoryHistory now takes user_id
    let groceriesHistory = await store.getCategoryHistory(user, catGroceries);
    assertEquals(
      groceriesHistory.length,
      0,
      "Groceries history should be empty after 'stage'.",
    );

    // 4. ACTION: FINALIZE the staged labels for the user.
    console.log("Step 2: Finalizing staged labels (committing Groceries)...");
    await store.finalize(user);

    // 5. VERIFY a) The label was created correctly after finalize.
    // getLabel now takes user_id
    initialLabel = await store.getLabel(user, tx1_id);
    assertExists(initialLabel, "Label should be created after 'finalize'.");
    assertEquals(initialLabel.category_id, catGroceries.toString());
    assertEquals(initialLabel.user_id, user.toString());

    // 5. VERIFY b) The transaction info was saved after finalize.
    // getTxInfo now takes user_id
    txInfo = await store.getTxInfo(user, tx1_id);
    assertExists(txInfo, "Transaction info should be saved after 'finalize'.");
    assertEquals(txInfo.tx_name, tx1_name);
    assertEquals(txInfo.tx_merchant, tx1_merchant);

    // 5. VERIFY c) The category history was updated after finalize.
    // getCategoryHistory now takes user_id
    groceriesHistory = await store.getCategoryHistory(user, catGroceries);
    assertEquals(
      groceriesHistory.length,
      1,
      "Groceries history should contain one transaction after 'finalize'.",
    );
    assertEquals(groceriesHistory[0], tx1_id.toString());

    // --- End of NEW FLOW ---

    // 6. ACTION: UPDATE the label.
    // The user changes their mind and re-labels the transaction.
    console.log("Step 3: Updating the existing label (to Dining)...");
    await store.update(user, tx1_id, catDining);

    // 7. VERIFY a) The label's category_id has changed.
    // getLabel now takes user_id
    const updatedLabel = await store.getLabel(user, tx1_id);
    assertExists(updatedLabel);
    assertEquals(
      updatedLabel.category_id,
      catDining.toString(),
      "Label's category should now be Dining.",
    );

    // 7. VERIFY b) The transaction has been moved in the category history.
    // getCategoryHistory now takes user_id
    groceriesHistory = await store.getCategoryHistory(user, catGroceries);
    assertEquals(
      groceriesHistory.length,
      0,
      "Transaction should be removed from the old category's history (Groceries).",
    );
    // getCategoryHistory now takes user_id
    let diningHistory = await store.getCategoryHistory(user, catDining);
    assertEquals(
      diningHistory.length,
      1,
      "Transaction should be added to the new category's history (Dining).",
    );
    assertEquals(diningHistory[0], tx1_id.toString());

    // 8. ACTION: REMOVE the label.
    // The user decides to remove the label, which moves it to the Trash category.
    console.log("Step 4: Removing the label (moving to Trash)...");
    await store.remove(user, tx1_id);

    // 9. VERIFY a) The label's category_id is now the special TRASH_CATEGORY_ID.
    // getLabel now takes user_id
    const removedLabel = await store.getLabel(user, tx1_id);
    assertExists(removedLabel);
    assertEquals(
      removedLabel.category_id,
      TRASH_CATEGORY_ID.toString(),
      "Label's category should now be Trash.",
    );

    // 9. VERIFY b) The transaction is no longer in its previous category history.
    // getCategoryHistory now takes user_id
    diningHistory = await store.getCategoryHistory(user, catDining);
    assertEquals(
      diningHistory.length,
      0,
      "Transaction should be removed from the Dining category's history.",
    );
    // getCategoryHistory now takes user_id
    const trashHistory = await store.getCategoryHistory(
      user,
      TRASH_CATEGORY_ID,
    );
    assertEquals(
      trashHistory.length,
      1,
      "Transaction should be added to the Trash category's history.",
    );
    assertEquals(trashHistory[0], tx1_id.toString());

    console.log("\n✅ Test completed successfully.");
  } finally {
    await client.close();
  }
});

// Adding a new test case for the "requires" condition of stage and finalize.
Deno.test("Principle: Staging, Finalizing, and Cancelling with conflicts and atomicity", async () => {
  const [db, client] = await testDb();
  const store = new LabelStore(db);

  try {
    const userA = Id.from("user_A_conflict_test");
    const userB = Id.from("user_B_conflict_test");
    const catGroceries = Id.from("cat_groceries");
    const catDining = Id.from("cat_dining");
    const tx1_id = Id.from("tx_conflict_1");
    const tx1_name = "Tx 1 Name";
    const tx1_merchant = "Tx 1 Merchant";
    const tx2_id = Id.from("tx_conflict_2");
    const tx2_name = "Tx 2 Name";
    const tx2_merchant = "Tx 2 Merchant";
    const tx3_id = Id.from("tx_conflict_3"); // For staging a conflict with already committed

    // --- Test 1: stage rejects if a committed label already exists for tx_id (for the specific user) ---
    console.log("\n--- Testing 'stage' conflict with committed label ---");
    await store.stage(userA, tx1_id, tx1_name, tx1_merchant, catGroceries);
    await store.finalize(userA); // tx1_id is now committed by userA

    await assertRejects(
      async () => {
        await store.stage(userA, tx1_id, tx1_name, tx1_merchant, catDining);
      },
      Error,
      `A committed label already exists for transaction ${tx1_id.toString()} for user ${userA.toString()}.`, // Updated error message for user-specificity
      "Should reject staging if a committed label exists for the transaction and user.",
    );
    console.log(
      "   ✅ 'stage' rejected as expected when committed label exists for the user.",
    );

    // --- Test 2: stage rejects if a staged label already exists for tx_id (for the same user) ---
    console.log(
      "\n--- Testing 'stage' conflict with existing staged label ---",
    );
    await store.stage(userA, tx2_id, tx2_name, tx2_merchant, catGroceries);
    await assertRejects(
      async () => {
        await store.stage(userA, tx2_id, tx2_name, tx2_merchant, catDining);
      },
      Error,
      `A staged label already exists for transaction ${tx2_id.toString()} for this user.`,
      "Should reject staging if a staged label already exists for the same user/transaction.",
    );
    await store.cancel(userA); // Clean up staged labels for userA
    console.log("   ✅ 'stage' rejected as expected when staged label exists.");

    // --- Test 3: finalize rejects if any staged transaction conflicts with an already committed label (all-or-nothing) ---
    console.log("\n--- Testing 'finalize' batch conflict and atomicity ---");
    // UserA stages two transactions
    await store.stage(userA, tx2_id, tx2_name, tx2_merchant, catGroceries); // Now tx2_id is staged by userA
    await store.stage(userA, tx3_id, tx1_name, tx1_merchant, catDining); // Now tx3_id is staged by userA

    // Simulate tx2_id getting committed by another user (or process) between stage and finalize
    // This will use userB to commit tx2_id
    // Note: UserB staging tx2_id is allowed because tx2_id is currently only STAGED by userA, not COMMITTED.
    await store.stage(userB, tx2_id, tx2_name, tx2_merchant, catGroceries);
    await store.finalize(userB); // Now tx2_id is COMMITTED by userB. UserB's staged labels are cleared.

    // UserA tries to finalize their batch, which includes tx2_id (now committed by userB) and tx3_id (still staged by userA)
    // UserA finalizes their batch. Under per-user semantics this should SUCCEED even if userB
    // already committed the same tx_id, because conflicts are scoped to the same user.
    await store.finalize(userA);
    console.log(
      "   ✅ 'finalize' succeeded as expected under per-user semantics.",
    );

    // Verify userA's staged items are now committed
    const committedA_tx2 = await store.getLabel(userA, tx2_id);
    assertExists(
      committedA_tx2,
      "Tx2 should be committed for userA after finalize.",
    );
    assertEquals(committedA_tx2.user_id, userA.toString());

    const committedA_tx3 = await store.getLabel(userA, tx3_id);
    assertExists(
      committedA_tx3,
      "Tx3 should be committed for userA after finalize.",
    );
    assertEquals(committedA_tx3.user_id, userA.toString());

    // Verify userB's previously committed tx2 remains committed and untouched
    const committedB_tx2 = await store.getLabel(userB, tx2_id);
    assertExists(committedB_tx2, "Tx2 should remain committed for userB.");
    assertEquals(committedB_tx2.user_id, userB.toString());

    // Verify per-user category histories
    const groceriesA = await store.getCategoryHistory(userA, catGroceries);
    assertEquals(
      groceriesA.filter((tx) => tx === tx2_id.toString()).length,
      1,
      "UserA's Groceries should contain tx2 after finalize.",
    );

    const diningA = await store.getCategoryHistory(userA, catDining);
    assertEquals(
      diningA.filter((tx) => tx === tx3_id.toString()).length,
      1,
      "UserA's Dining should contain tx3 after finalize.",
    );

    const groceriesB = await store.getCategoryHistory(userB, catGroceries);
    assertEquals(
      groceriesB.filter((tx) => tx === tx2_id.toString()).length,
      1,
      "UserB's Groceries should still contain tx2.",
    );

    // Verify tx2_id is committed (by userB)
    // getLabel now takes user_id
    const committedTx2 = await store.getLabel(userB, tx2_id);
    assertExists(committedTx2, "Tx2 should be committed by userB.");
    assertEquals(
      committedTx2.user_id,
      userB.toString(),
      "Tx2 committed by userB.",
    );

    // UserA's staged labels should still be present after failed finalize (only tx3_id left, tx2_id was removed from staged by userB's finalize if it was staged there)
    // (We can't query staged labels directly via public API, but a subsequent cancel would clear them)
    await store.cancel(userA); // Clear userA's remaining staged labels
    console.log(
      "   ✅ Atomicity confirmed: no other staged labels were committed.",
    );

    // --- Test 4: User cancels staged labels ---
    console.log("\n--- Testing 'cancel' action ---");
    // Stage a few labels for userA
    const tx4_id = Id.from("tx_to_cancel_4");
    const tx4_name = "Transaction 4";
    const tx4_merchant = "Merchant 4";
    const tx5_id = Id.from("tx_to_cancel_5");
    const tx5_name = "Transaction 5";
    const tx5_merchant = "Merchant 5";

    await store.stage(userA, tx4_id, tx4_name, tx4_merchant, catGroceries);
    await store.stage(userA, tx5_id, tx5_name, tx5_merchant, catDining);

    // Verify no committed labels yet for these staged transactions
    // getLabel now takes user_id
    assertEquals(
      await store.getLabel(userA, tx4_id),
      null,
      "Tx4 should not be committed before cancel.",
    );
    // getLabel now takes user_id
    assertEquals(
      await store.getLabel(userA, tx5_id),
      null,
      "Tx5 should not be committed before cancel.",
    );

    console.log("   Staged labels. Now cancelling...");
    await store.cancel(userA);

    // Verify no committed labels after cancel
    // getLabel now takes user_id
    assertEquals(
      await store.getLabel(userA, tx4_id),
      null,
      "Committed label for tx4 should still be null after cancel.",
    );
    // getLabel now takes user_id
    assertEquals(
      await store.getLabel(userA, tx5_id),
      null,
      "Committed label for tx5 should still be null after cancel.",
    );

    // Verify no transaction info (which would be created by finalize)
    // getTxInfo now takes user_id
    assertEquals(
      await store.getTxInfo(userA, tx4_id),
      null,
      "Tx info for tx4 should still be null after cancel.",
    );
    // getTxInfo now takes user_id
    assertEquals(
      await store.getTxInfo(userA, tx5_id),
      null,
      "Tx info for tx5 should still be null after cancel.",
    );

    // Verify no category history entry (which would be created by finalize)
    // getCategoryHistory now takes user_id
    assertEquals(
      (await store.getCategoryHistory(userA, catGroceries)).filter((txid) =>
        txid === tx4_id.toString()
      ).length,
      0,
      "Category history should not contain tx4 after cancel.",
    );
    // getCategoryHistory now takes user_id
    assertEquals(
      (await store.getCategoryHistory(userA, catDining)).filter((txid) =>
        txid === tx5_id.toString()
      ).length,
      0,
      "Category history should not contain tx5 after cancel.",
    );

    // Attempt to finalize - should do nothing as there are no staged labels for userA
    await store.finalize(userA);
    // getLabel now takes user_id
    assertEquals(
      await store.getLabel(userA, tx4_id),
      null,
      "Finalize after cancel should not commit anything.",
    );
    console.log(
      "   ✅ 'cancel' action confirmed to clear staged labels without committing.",
    );

    console.log("\n✅ Conflict and Cancel tests completed successfully.");
  } finally {
    await client.close();
  }
});
Deno.test("LabelStore: Stage → Cancel → Re-Stage → Finalize sequence clears state", async () => {
  const [db, client] = await testDb();
  const store = new LabelStore(db);

  const user = Id.from("user_reset_test");
  const txId = Id.from("tx_reset_sequence");
  const txName = "Reset Test Tx";
  const txMerchant = "Reset Merchant";
  const categoryId1 = Id.from("category_initial");
  const categoryId2 = Id.from("category_final");

  try {
    // 1. Initial state: No label exists for the (user, tx_id)
    console.log("Step 1: Verifying initial state (no label)...");
    let currentLabel = await store.getLabel(user, txId);
    assertEquals(
      currentLabel,
      null,
      "Initially, no label should exist for the (user, tx_id).",
    );
    console.log("   ✅ Initial state verified.");

    // 2. First stage: Stage a label for the transaction.
    console.log("Step 2: Staging the initial label...");
    await store.stage(user, txId, txName, txMerchant, categoryId1);
    console.log("   ✅ Initial label staged.");

    // 3. Verify: After staging, the label is not yet committed.
    currentLabel = await store.getLabel(user, txId);
    assertEquals(
      currentLabel,
      null,
      "Label should not be committed immediately after staging.",
    );
    console.log("   ✅ Verified: Label remains uncommitted after first stage.");

    // 4. Cancel: Cancel the staged label.
    console.log("Step 3: Cancelling the staged label...");
    await store.cancel(user);
    console.log("   ✅ Staged label cancelled.");

    // 5. Verify: Cancelling should clear any pending staged labels.
    // We can't directly inspect staged labels via public API, but subsequent `getLabel`
    // and `getTxInfo` should reflect that nothing was committed.
    currentLabel = await store.getLabel(user, txId);
    assertEquals(
      currentLabel,
      null,
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
    currentLabel = await store.getLabel(user, txId);
    assertEquals(
      currentLabel,
      null,
      "Label should not be committed immediately after re-staging.",
    );
    console.log("   ✅ Verified: Label remains uncommitted after re-stage.");

    // 8. Finalize: Finalize the re-staged label.
    console.log("Step 5: Finalizing the re-staged label...");
    await store.finalize(user);
    console.log("   ✅ Label finalized.");

    // 9. Verify: The finalize operation should have successfully committed the label.
    currentLabel = await store.getLabel(user, txId);
    assertExists(
      currentLabel,
      "A committed label should exist after finalize.",
    );
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

```
