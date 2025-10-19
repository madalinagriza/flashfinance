---
timestamp: 'Fri Oct 17 2025 18:19:02 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_181902.7498d0eb.md]]'
content_id: 2b5a315e66d07c80ebced1a4ac2a0e2979c3fb471cdf0957c799e0e06bd3ed9a
---

# response:

```typescript
import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { Id, LabelStore } from "../label.ts";

// Note on current Label.apply implementation:
// The current `LabelStore.apply` method uses `updateOne` with `{ upsert: true }`
// for both the `labels` and `catTx` collections.
// This means it will silently overwrite/update an existing label for a given `tx_id`
// instead of throwing an error when a label already exists, which contradicts
// the "requires: no existing label for tx_id" precondition in the Label spec's `apply` action.
//
// This test is designed to FAIL if the `apply` method continues to silently
// overwrite/update. If the `apply` method were to be updated to correctly throw an
// error on duplicate application as per the spec, this test would then pass.

Deno.test("Variant: Duplicate apply should throw an error.", async () => {
  const [db, client] = await testDb();
  const store = new LabelStore(db);

  try {
    // 1. SETUP: Define user, categories, and a transaction
    const user = Id.from("user_dup_apply");
    const catA = Id.from("cat_finance");
    const tx1_id = Id.from("tx_bank_fee");
    const tx1_name = "Monthly Service Fee";
    const tx1_merchant = "BANK OF DENO";

    console.log("--- Starting 'Duplicate apply should throw an error' test ---");

    // 2. ACTION: Apply a label for the first time.
    // This should succeed normally as no label exists for tx1_id.
    console.log("Step 1: Applying a label for the first time (expecting success).");
    await store.apply(user, tx1_id, tx1_name, tx1_merchant, catA);
    console.log("   --> First apply call completed successfully.");

    // 3. VERIFY initial state after the first apply.
    console.log("Step 1.1: Verifying state after first apply...");

    // 3. VERIFY a) The label was created correctly.
    const initialLabel = await store.getLabel(tx1_id);
    assertExists(initialLabel, "Label should be created after the first 'apply'.");
    assertEquals(initialLabel.category_id, catA.toString(), "Initial label category should be catA.");
    assertEquals(initialLabel.user_id, user.toString(), "Initial label user ID should be correct.");
    console.log(`   --> Verified initial label exists for tx_id: ${tx1_id.toString()} with category: ${initialLabel.category_id}.`);

    // 3. VERIFY b) The transaction info was saved.
    const txInfo = await store.getTxInfo(tx1_id);
    assertExists(txInfo, "Transaction info should be saved after the first 'apply'.");
    assertEquals(txInfo.tx_name, tx1_name, "Transaction info name should match.");
    assertEquals(txInfo.tx_merchant, tx1_merchant, "Transaction info merchant should match.");
    console.log(`   --> Verified transaction info saved: ${txInfo.tx_name} | ${txInfo.tx_merchant}.`);

    // 3. VERIFY c) The category history for catA was updated with one entry.
    let categoryAHistory = await store.getCategoryHistory(catA);
    assertEquals(categoryAHistory.length, 1, "Category history for catA should contain exactly one transaction after first apply.");
    assertEquals(categoryAHistory[0], tx1_id.toString(), "Category history entry should match tx_id.");
    console.log(`   --> Verified category history for ${catA.toString()} contains one entry: ${categoryAHistory[0]}.`);

    // 4. ACTION: Attempt to apply the *same* label again for the *same* tx_id.
    // According to the spec's precondition "no existing label for tx_id", this should throw an error.
    let caughtError: Error | null = null;
    console.log("\nStep 2: Attempting to apply the SAME label again for the SAME tx_id (EXPECTING AN ERROR).");
    try {
      await store.apply(user, tx1_id, tx1_name, tx1_merchant, catA);
      // If execution reaches here, the `apply` method did not throw an error.
      // This indicates it silently overwrote or updated, which is not compliant with the spec.
      assert(false, "ERROR: `apply` method silently overwrote an existing label instead of throwing an error as required by the spec.");
    } catch (e) {
      caughtError = e instanceof Error ? e : new Error(String(e));
      console.log(`   --> Successfully caught expected error: ${caughtError.message}`);
      // Assert that an error was indeed caught.
      assertExists(caughtError, "An error should have been caught on duplicate apply attempt as per spec.");
      // In a fully compliant system, we would also assert on the specific error type/message,
      // e.g., assertEquals(caughtError.message, "Label already exists for this transaction.");
    }

    // 5. VERIFY final state after the duplicate apply attempt.
    // The database state should reflect that no *new* label was created and the history wasn't duplicated.
    console.log("\nStep 3: Verifying database state after duplicate apply attempt...");

    // 5. VERIFY a) The label still exists and there's no duplicate label document.
    const labelAfterSecondApply = await store.getLabel(tx1_id);
    assertExists(labelAfterSecondApply, "Label should still exist in the database (not removed).");
    // Query all labels and filter for the specific tx_id to confirm uniqueness at a collection level.
    const allLabels = await store.all();
    const labelsForTx1 = allLabels.filter(l => l._id === tx1_id.toString());
    assertEquals(labelsForTx1.length, 1, "There should still be exactly one label document for tx_id in the database.");
    // The category_id should still be catA. If `apply` silently overwrites with the same data, this holds.
    assertEquals(labelAfterSecondApply.category_id, catA.toString(), "Label's category should remain catA (no change from duplicate attempt).");
    console.log(`   --> Verified label for tx_id: ${tx1_id.toString()} still exists once and is not duplicated in the 'labels' collection.`);

    // 5. VERIFY b) The category history for catA still contains exactly one entry.
    // If `apply` uses upsert for `catTx` with a compound ID of (category_id, tx_id), it will ensure uniqueness.
    categoryAHistory = await store.getCategoryHistory(catA);
    assertEquals(categoryAHistory.length, 1, "Category history for catA should still contain exactly one transaction (no duplicate entries).");
    assertEquals(categoryAHistory[0], tx1_id.toString(), "Category history entry should still match tx_id.");
    console.log(`   --> Verified category history for ${catA.toString()} still contains exactly one entry for ${tx1_id.toString()}.`);

    console.log("\n--- 'Duplicate apply should throw an error' test completed. ---");
    console.log("Note: This test will fail if the `apply` method does not throw an error when a label already exists, as per spec.");

  } finally {
    // Ensure the database client is closed
    await client.close();
  }
});
```
