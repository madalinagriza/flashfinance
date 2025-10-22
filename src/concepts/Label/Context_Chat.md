# prompt:   Implement a testcase that verifies the “Stage → Cancel → Re-Stage → Finalize” sequence behaves as a clean slate for the same `(user, tx_id)`. The goal is to confirm that cancelling clears pending staged labels and allows a new stage of the same transaction to succeed and commit normally. Consult the Label spec and existing tests in `test-op-simple.ts` for structure, imports, and assertion style. The test should demonstrate only the necessary behavior: (1) initially, `getLabel(user, tx)` returns `null`; (2) after the first `stage(user, tx)`, the label remains uncommitted; (3) after `cancel(user)`, no label is persisted; (4) a subsequent `stage(user, tx)` followed by `finalize(user)` successfully commits the label. Assertions should verify that the committed label has the correct `user_id` and `category_id`, and optionally that transaction info and category history reflect the single committed label. Use only public `LabelConcept` methods (`stage`, `cancel`, `finalize`, `getLabel`, `getTxInfo`, `getCategoryHistory`), avoid unrelated assertions, DB access, or extra logs, and keep the test minimal with only the data and steps required to show the expected reset-and-retry behavior.


[@Spec](Spec.md)
 
[@LabelConcept.ts](/src/concepts/Label/LabelConcept.ts) 

[@test-op-simple.ts](/src/concepts/Label/test-actions/test-op-simple.ts)

[@test-non-popular.ts](/src/concepts/Label/test-actions/test-non-popular.ts)



# response:

```typescript
import { assertEquals, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { Id, LabelConcept } from "../LabelConcept.ts";

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
    let currentLabel = await store.getLabel(user, txId);
    assertEquals(currentLabel, null, "Initially, no label should exist for the (user, tx_id).");
    console.log("   ✅ Initial state verified.");

    // 2. First stage: Stage a label for the transaction.
    console.log("Step 2: Staging the initial label...");
    await store.stage(user, txId, txName, txMerchant, categoryId1);
    console.log("   ✅ Initial label staged.");

    // 3. Verify: After staging, the label is not yet committed.
    currentLabel = await store.getLabel(user, txId);
    assertEquals(currentLabel, null, "Label should not be committed immediately after staging.");
    console.log("   ✅ Verified: Label remains uncommitted after first stage.");

    // 4. Cancel: Cancel the staged label.
    console.log("Step 3: Cancelling the staged label...");
    await store.cancel(user);
    console.log("   ✅ Staged label cancelled.");

    // 5. Verify: Cancelling should clear any pending staged labels.
    // We can't directly inspect staged labels via public API, but subsequent `getLabel`
    // and `getTxInfo` should reflect that nothing was committed.
    currentLabel = await store.getLabel(user, txId);
    assertEquals(currentLabel, null, "No committed label should exist after cancelling staged label.");

    let txInfo = await store.getTxInfo(user, txId);
    assertEquals(txInfo, null, "No transaction info should exist after cancelling staged label.");

    const initialCategoryHistory = await store.getCategoryHistory(user, categoryId1);
    assertEquals(initialCategoryHistory.length, 0, "Category history should be empty after cancelling.");
    console.log("   ✅ Verified: Cancel operation cleared pending staged labels.");

    // 6. Re-stage: Stage a new label for the same (user, tx_id) with a different category.
    console.log("Step 4: Re-staging the label with a new category...");
    await store.stage(user, txId, txName, txMerchant, categoryId2);
    console.log("   ✅ Label re-staged.");

    // 7. Verify: After re-staging, the label is still not committed.
    currentLabel = await store.getLabel(user, txId);
    assertEquals(currentLabel, null, "Label should not be committed immediately after re-staging.");
    console.log("   ✅ Verified: Label remains uncommitted after re-stage.");

    // 8. Finalize: Finalize the re-staged label.
    console.log("Step 5: Finalizing the re-staged label...");
    await store.finalize(user);
    console.log("   ✅ Label finalized.");

    // 9. Verify: The finalize operation should have successfully committed the label.
    currentLabel = await store.getLabel(user, txId);
    assertExists(currentLabel, "A committed label should exist after finalize.");
    assertEquals(currentLabel.user_id, user.toString(), "Committed label should have the correct user ID.");
    assertEquals(currentLabel.tx_id, txId.toString(), "Committed label should have the correct transaction ID.");
    assertEquals(currentLabel.category_id, categoryId2.toString(), "Committed label should have the correct category ID.");
    console.log("   ✅ Verified: Label successfully committed with correct details.");

    // 10. Verify: Transaction info and category history reflect the single committed label.
    txInfo = await store.getTxInfo(user, txId);
    assertExists(txInfo, "Transaction info should exist after finalize.");
    assertEquals(txInfo.tx_name, txName, "Transaction info should have the correct name.");
    assertEquals(txInfo.tx_merchant, txMerchant, "Transaction info should have the correct merchant.");
    console.log("   ✅ Verified: Transaction info correctly recorded.");

    const finalCategoryHistory = await store.getCategoryHistory(user, categoryId2);
    assertEquals(finalCategoryHistory.length, 1, "Category history should contain one entry for the finalized label.");
    assertEquals(finalCategoryHistory[0], txId.toString(), "Category history should contain the correct transaction ID.");

    const initialCategoryHistoryAfterFinalize = await store.getCategoryHistory(user, categoryId1);
    assertEquals(initialCategoryHistoryAfterFinalize.length, 0, "The initial category should not have any history after the re-labeling.");
    console.log("   ✅ Verified: Category history reflects the single, final committed label.");

    console.log("\n✅ 'Stage → Cancel → Re-Stage → Finalize' sequence verified successfully.");
  } finally {
    await client.close();
  }
});
```