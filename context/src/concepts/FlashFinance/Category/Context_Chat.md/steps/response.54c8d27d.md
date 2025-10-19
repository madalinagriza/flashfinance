---
timestamp: 'Sat Oct 18 2025 16:21:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_162159.fa81d043.md]]'
content_id: 54c8d27dfa1c3eea775e1878a1de153fb1a3b958ae5b5726b5d9679cfe5f0509
---

# response:

```typescript
// deno-lint-ignore no-unversioned-import
import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { CategoryStore, Id } from "../category.ts"; // Adjust path if category.ts is not in the parent directory

Deno.test("CategoryStore: delete action works and blocks when referenced by labels", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);

  try {
    const ownerId = Id.from("test_user_delete_1");
    const categoryNameToDelete = "To Be Deleted";
    const categoryNameWithLabels = "Referenced Category";
    const nonExistentCategoryId = Id.from("non_existent_category_id");

    // --- Setup: Create categories for testing ---
    console.log(`\n--- Test Delete Action ---`);

    // 1. Create a category that will be successfully deleted
    console.log(
      `1. Creating category "${categoryNameToDelete}" for owner "${ownerId.toString()}"...`,
    );
    const { category_id: categoryIdToDelete } = await store.create(
      ownerId,
      categoryNameToDelete,
    );
    assertExists(categoryIdToDelete, "Category to delete should be created.");
    console.log(`   ✅ Created category ID: ${categoryIdToDelete.toString()}`);

    // 2. Create another category that will simulate being referenced by labels
    console.log(
      `2. Creating category "${categoryNameWithLabels}" for owner "${ownerId.toString()}"...`,
    );
    const { category_id: categoryIdWithLabels } = await store.create(
      ownerId,
      categoryNameWithLabels,
    );
    assertExists(
      categoryIdWithLabels,
      "Category simulating labels should be created.",
    );
    console.log(
      `   ✅ Created category ID: ${categoryIdWithLabels.toString()}`,
    );

    // Verify initial state: both categories exist
    let categories = await store.getCategoryNamesAndOwners();
    assertEquals(
      categories.some((c) =>
        c.name === categoryNameToDelete &&
        c.owner_id.toString() === ownerId.toString()
      ),
      true,
      "Category 'To Be Deleted' should exist initially.",
    );
    assertEquals(
      categories.some((c) =>
        c.name === categoryNameWithLabels &&
        c.owner_id.toString() === ownerId.toString()
      ),
      true,
      "Category 'Referenced Category' should exist initially.",
    );
    console.log("   ✅ Initial state verified: both categories exist.");

    // --- Action 1: Successfully delete a category with no labels ---
    console.log(
      `\n3. Attempting to delete category "${categoryNameToDelete}" (ID: ${categoryIdToDelete.toString()}) with has_labels_in_category = false...`,
    );
    // As per prompt, set has_labels_in_category to false for normal deletion
    const { ok: deleteOk } = await store.delete(
      ownerId,
      categoryIdToDelete,
      false,
    );
    assertEquals(deleteOk, true, "Deletion should return true.");
    console.log("   ✅ Delete action completed successfully.");

    // --- Verification 1: Confirm the category is gone ---
    console.log(
      `4. Verifying category "${categoryNameToDelete}" is no longer present...`,
    );
    categories = await store.getCategoryNamesAndOwners();
    assertEquals(
      categories.some((c) =>
        c.name === categoryNameToDelete &&
        c.owner_id.toString() === ownerId.toString()
      ),
      false,
      "The deleted category should no longer exist.",
    );
    assertEquals(
      categories.some((c) =>
        c.name === categoryNameWithLabels &&
        c.owner_id.toString() === ownerId.toString()
      ),
      true,
      "The other category should still exist.",
    );
    console.log("   ✅ Verified: Category 'To Be Deleted' is successfully removed.");

    // --- Action 2 (Negative): Attempt to delete a category that has labels ---
    console.log(
      `\n5. Attempting to delete category "${categoryNameWithLabels}" (ID: ${categoryIdWithLabels.toString()}) with has_labels_in_category = true...`,
    );
    // As per prompt, set has_labels_in_category to true to simulate a category referenced by labels
    await assertRejects(
      async () => {
        await store.delete(ownerId, categoryIdWithLabels, true);
      },
      Error,
      `Cannot delete category "${categoryIdWithLabels.toString()}" because it is referenced by existing labels.`,
      "Should reject deletion if has_labels_in_category is true.",
    );
    console.log(
      "   ✅ Verified: Deletion rejected as expected due to existing labels.",
    );

    // --- Verification 2: Confirm the category still exists after blocked deletion ---
    console.log(
      `6. Verifying category "${categoryNameWithLabels}" is still present after failed deletion...`,
    );
    categories = await store.getCategoryNamesAndOwners();
    assertEquals(
      categories.some((c) =>
        c.name === categoryNameWithLabels &&
        c.owner_id.toString() === ownerId.toString()
      ),
      true,
      "Category 'Referenced Category' should still exist after a blocked deletion.",
    );
    console.log("   ✅ Verified: Category 'Referenced Category' still exists.");

    // --- Action 3 (Negative): Attempt to delete a non-existent category ---
    console.log(
      `\n7. Attempting to delete a non-existent category (ID: ${nonExistentCategoryId.toString()})...`,
    );
    await assertRejects(
      async () => {
        // has_labels_in_category value doesn't matter here as the category won't be found first
        await store.delete(ownerId, nonExistentCategoryId, false);
      },
      Error,
      `Category with ID "${nonExistentCategoryId.toString()}" not found for owner ${ownerId.toString()}.`,
      "Should reject deletion of a non-existent category.",
    );
    console.log(
      "   ✅ Verified: Deletion rejected as expected for a non-existent category.",
    );
  } finally {
    await client.close();
    console.log("Database client closed.");
  }
});

```
