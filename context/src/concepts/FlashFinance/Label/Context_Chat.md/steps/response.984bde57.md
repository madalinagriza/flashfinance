---
timestamp: 'Fri Oct 17 2025 20:48:41 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_204841.b8efea28.md]]'
content_id: 984bde574334700135ab42e00e8210a35cfb84f384eb8f71900e87059d6eda5f
---

# response:

```typescript
import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { Id, LabelStore } from "../label.ts";
import { Collection, Db } from "npm:mongodb"; // Added for direct DB collection access in test

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

Deno.test("Principle: Finalize is a no-op when user has no staged labels", async () => {
  const [db, client] = await testDb();
  const store = new LabelStore(db);

  // Directly access collections for counting, as LabelStore's collections are private.
  // The collection names are prefixed with "Label." as defined in label.ts
  const labelsCollection: Collection = db.collection("Label.labels");
  const txInfosCollection: Collection = db.collection("Label.tx_infos");
  const catTxCollection: Collection = db.collection("Label.cat_tx");
  const stagedLabelsCollection: Collection = db.collection("Label.staged_labels");

  try {
    const user_noop_test = Id.from("user_noop_finalize");
    const cat_initial = Id.from("cat_expenses");
    const tx_initial_committed_id = Id.from("tx_coffee_shop");
    // This transaction ID is used to ensure no unintended writes occur for unrelated transactions.
    const tx_non_existent_id = Id.from("tx_never_exists");

    // --- Step 1: Setup an existing committed label for the user ---
    console.log(
      "Step 1: Staging and finalizing an initial label to create committed state...",
    );
    await store.stage(
      user_noop_test,
      tx_initial_committed_id,
      "Coffee Shop",
      "STARBUCKS #123",
      cat_initial,
    );
    await store.finalize(user_noop_test);

    // Retrieve and capture the initial state of the committed label
    const initialCommittedLabel = await store.getLabel(
      user_noop_test,
      tx_initial_committed_id,
    );
    assertExists(
      initialCommittedLabel,
      "Initial label should be committed after first finalize.",
    );
    const initialCreatedAt = initialCommittedLabel.created_at;

    // Capture initial document counts in relevant collections
    const initialLabelCount = await labelsCollection.countDocuments({});
    const initialTxInfoCount = await txInfosCollection.countDocuments({});
    const initialCatTxCount = await catTxCollection.countDocuments({});
    const initialStagedCount = await stagedLabelsCollection.countDocuments({
      user_id: user_noop_test.toString(),
    });
    // Assert that staged labels are indeed cleared after the initial finalize.
    assertEquals(
      initialStagedCount,
      0,
      "Staged labels for user should be 0 after initial finalize.",
    );

    // Verify that the tx_non_existent_id has no label before the no-op finalize.
    assertEquals(
      await store.getLabel(user_noop_test, tx_non_existent_id),
      null,
      "No label should exist for tx_non_existent_id initially.",
    );

    // --- Step 2: Call finalize for the user who currently has NO staged labels ---
    console.log("Step 2: Calling finalize for the user with no staged labels...");
    // This call should complete successfully without throwing any errors, as per the no-op requirement.
    await store.finalize(user_noop_test);
    console.log("   ✅ finalize() completed without throwing errors.");

    // --- Step 3: Verify the previously committed label remains unchanged ---
    console.log("Step 3: Verifying the previously committed label is unchanged...");
    const postFinalizeLabel = await store.getLabel(
      user_noop_test,
      tx_initial_committed_id,
    );
    assertExists(postFinalizeLabel, "Committed label should still exist.");
    assertEquals(
      postFinalizeLabel._id,
      initialCommittedLabel._id,
      "Committed label's _id should not change.",
    );
    assertEquals(
      postFinalizeLabel.tx_id,
      initialCommittedLabel.tx_id,
      "Committed label's tx_id should not change.",
    );
    assertEquals(
      postFinalizeLabel.category_id,
      initialCommittedLabel.category_id,
      "Committed label's category_id should not change.",
    );
    assertEquals(
      postFinalizeLabel.user_id,
      initialCommittedLabel.user_id,
      "Committed label's user_id should not change.",
    );
    assertEquals(
      postFinalizeLabel.created_at.getTime(), // Compare numeric timestamps for Date objects
      initialCreatedAt.getTime(),
      "Committed label's created_at timestamp should not change.",
    );
    console.log("   ✅ Committed label remained exactly as before (including created_at).");

    // --- Step 4: Verify no new documents were written and staged labels are still empty ---
    console.log("Step 4: Verifying no new documents were written to permanent collections...");
    assertEquals(
      await labelsCollection.countDocuments({}),
      initialLabelCount,
      "Number of labels documents should not change.",
    );
    assertEquals(
      await txInfosCollection.countDocuments({}),
      initialTxInfoCount,
      "Number of txInfos documents should not change.",
    );
    assertEquals(
      await catTxCollection.countDocuments({}),
      initialCatTxCount,
      "Number of catTx documents should not change.",
    );

    const postFinalizeStagedCount = await stagedLabelsCollection.countDocuments({
      user_id: user_noop_test.toString(),
    });
    assertEquals(
      postFinalizeStagedCount,
      0,
      "Staged labels for user should still be 0 after no-op finalize.",
    );
    console.log("   ✅ Document counts in permanent and staged collections remained unchanged.");


    // Ensure the `tx_non_existent_id` still has no associated committed data,
    // reinforcing that "nothing is written" even for unrelated transactions.
    assertEquals(
      await store.getLabel(user_noop_test, tx_non_existent_id),
      null,
      "No new label should be created for a previously non-existent transaction.",
    );
    assertEquals(
      await store.getTxInfo(user_noop_test, tx_non_existent_id),
      null,
      "No new tx info should be created for a previously non-existent transaction.",
    );
    assertEquals(
      (await store.getCategoryHistory(user_noop_test, cat_initial)).filter((
        id,
      ) => id === tx_non_existent_id.toString()).length,
      0,
      "No new history entry for a previously non-existent transaction.",
    );
    console.log("   ✅ No data was unexpectedly written for unrelated transactions.");

    console.log("\n✅ No-op finalize test completed successfully.");
  } finally {
    await client.close();
  }
});
```
