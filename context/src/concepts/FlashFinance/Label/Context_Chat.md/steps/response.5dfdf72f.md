---
timestamp: 'Thu Oct 16 2025 23:12:35 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_231235.590d0daf.md]]'
content_id: 5dfdf72f16a99d074ab0fbc881ce3c13a0116c4f1b54a7d2935a4e349c3baaf3
---

# response:

This test case demonstrates the core operational principle of the Label concept: a transaction can be labeled, re-labeled (which replaces the previous label), and removed (which is a special case of re-labeling to a 'Trash' category). Each step verifies that the state changes as expected according to the spec's actions.

The implementation in `label.ts` appears sound for supporting this operational principle. The `update` action correctly removes the transaction from its old category history and adds it to the new one, which directly enforces the "relabeling replaces the previous one" rule. No crucial flaws were identified that would prevent this test.

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { Id, LabelStore } from "../label.ts";

// The built-in Trash category ID, defined here for verification purposes
// as it is not exported from the main label.ts module.
const TRASH_CATEGORY_ID = Id.from("TRASH_CATEGORY");

Deno.test("Principle: User applies, updates, and removes labels on transactions", async () => {
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

    // 2. ACTION: APPLY a label to a new transaction.
    // This is the first time the user is categorizing this transaction.
    console.log("Step 1: Applying a new label (Groceries)...");
    await store.apply(user, tx1_id, tx1_name, tx1_merchant, catGroceries);

    // 3. VERIFY a) The label was created correctly.
    const initialLabel = await store.getLabel(tx1_id);
    assertExists(initialLabel, "Label should be created after 'apply'.");
    assertEquals(initialLabel.category_id, catGroceries.toString());
    assertEquals(initialLabel.user_id, user.toString());

    // 3. VERIFY b) The transaction info was saved.
    const txInfo = await store.getTxInfo(tx1_id);
    assertExists(txInfo, "Transaction info should be saved after 'apply'.");
    assertEquals(txInfo.tx_name, tx1_name);
    assertEquals(txInfo.tx_merchant, tx1_merchant);

    // 3. VERIFY c) The category history was updated.
    let groceriesHistory = await store.getCategoryHistory(catGroceries);
    assertEquals(
      groceriesHistory.length,
      1,
      "Groceries history should contain one transaction.",
    );
    assertEquals(groceriesHistory[0], tx1_id.toString());

    // 4. ACTION: UPDATE the label.
    // The user changes their mind and re-labels the transaction.
    console.log("Step 2: Updating the existing label (to Dining)...");
    await store.update(user, tx1_id, catDining);

    // 5. VERIFY a) The label's category_id has changed.
    const updatedLabel = await store.getLabel(tx1_id);
    assertExists(updatedLabel);
    assertEquals(
      updatedLabel.category_id,
      catDining.toString(),
      "Label's category should now be Dining.",
    );

    // 5. VERIFY b) The transaction has been moved in the category history.
    groceriesHistory = await store.getCategoryHistory(catGroceries);
    assertEquals(
      groceriesHistory.length,
      0,
      "Transaction should be removed from the old category's history (Groceries).",
    );
    let diningHistory = await store.getCategoryHistory(catDining);
    assertEquals(
      diningHistory.length,
      1,
      "Transaction should be added to the new category's history (Dining).",
    );
    assertEquals(diningHistory[0], tx1_id.toString());

    // 6. ACTION: REMOVE the label.
    // The user decides to remove the label, which moves it to the Trash category.
    console.log("Step 3: Removing the label (moving to Trash)...");
    await store.remove(user, tx1_id);

    // 7. VERIFY a) The label's category_id is now the special TRASH_CATEGORY_ID.
    const removedLabel = await store.getLabel(tx1_id);
    assertExists(removedLabel);
    assertEquals(
      removedLabel.category_id,
      TRASH_CATEGORY_ID.toString(),
      "Label's category should now be Trash.",
    );

    // 7. VERIFY b) The transaction is no longer in its previous category history.
    diningHistory = await store.getCategoryHistory(catDining);
    assertEquals(
      diningHistory.length,
      0,
      "Transaction should be removed from the Dining category's history.",
    );
    const trashHistory = await store.getCategoryHistory(TRASH_CATEGORY_ID);
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
```
