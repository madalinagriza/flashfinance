---
timestamp: 'Fri Oct 17 2025 21:02:41 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_210241.fcb704b8.md]]'
content_id: 889dc2b8a7f5de6d079de5bf3e2e48e281f017c04411b7f2decd9c8999632e71
---

# response:

```typescript
// deno-lint-ignore no-unversioned-import
import { assertEquals, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { Id, LabelStore } from "../label.ts";

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
    console.log("Step 2: Attempting to stage the same (user, tx_id) a second time...");
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
