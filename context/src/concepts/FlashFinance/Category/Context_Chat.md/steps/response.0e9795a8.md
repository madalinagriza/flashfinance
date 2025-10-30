---
timestamp: 'Sat Oct 18 2025 01:19:56 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_011956.eb053d1e.md]]'
content_id: 0e9795a82cb58e1ddacdcd5703b0c7fe7d4b4e84f2831d92dd1273ccb1d01766
---

# response:

```typescript
// src/concepts/FlashFinance/Category/test-actions/test-op-simple.ts
// deno-lint-ignore no-unversioned-import
import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { CategoryStore, Id } from "../category.ts"; // Adjust path if category.ts is not in the parent directory

// (Existing test for create action goes here, as provided in the prompt)
Deno.test("CategoryStore: create action works and enforces name uniqueness per owner", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);

  try {
    // 1. Setup: Define a test user ID and a category name.
    const ownerId = Id.from("test_user_create_1");
    const categoryName = "Groceries";

    // 2. Action: Create the first category.
    console.log(
      `Attempting to create category "${categoryName}" for owner "${ownerId.toString()}"...`,
    );
    const { category_id: createdCategoryId } = await store.create(
      ownerId,
      categoryName,
    );
    assertExists(
      createdCategoryId,
      "A category ID should be returned upon successful creation.",
    );
    console.log("   ✅ Category created successfully.");

    // 3. Verification: Use getCategoryNamesAndOwners to confirm the category exists.
    const categories = await store.getCategoryNamesAndOwners();
    const foundCategory = categories.find(
      (c) =>
        c.name === categoryName && c.owner_id.toString() === ownerId.toString(),
    );

    assertExists(
      foundCategory,
      "The newly created category should be found in the list.",
    );
    assertEquals(
      foundCategory.name,
      categoryName,
      "The retrieved category name should match.",
    );
    assertEquals(
      foundCategory.owner_id.toString(),
      ownerId.toString(),
      "The retrieved owner ID should match.",
    );
    console.log("   ✅ Verified: Category found with correct name and owner.");

    // 4. Action (Negative Test): Attempt to create a category with the same name for the same owner.
    console.log(
      `Attempting to create duplicate category "${categoryName}" for owner "${ownerId.toString()}"...`,
    );
    await assertRejects(
      async () => {
        await store.create(ownerId, categoryName);
      },
      Error,
      `Category with name "${categoryName}" already exists for owner ${ownerId.toString()}.`,
      "Should reject creating a category with a duplicate name for the same owner.",
    );
    console.log(
      "   ✅ Verified: Duplicate category creation for the same owner was correctly rejected.",
    );
  } finally {
    // Clean up: Close the database client.
    await client.close();
    console.log("Database client closed.");
  }
});


// New test for the rename action
Deno.test("CategoryStore: rename action works and enforces new name uniqueness", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);

  try {
    const ownerId = Id.from("test_user_rename_1");
    const initialName = "My Old Category";
    const newName = "My Renamed Category";
    const anotherCategoryName = "Another Category";

    // --- Step 1: Setup - Create a category to be renamed ---
    console.log(`\n--- Test Rename Action ---`);
    console.log(
      `1. Creating initial category "${initialName}" for owner "${ownerId.toString()}"...`,
    );
    const { category_id: categoryToRenameId } = await store.create(
      ownerId,
      initialName,
    );
    assertExists(categoryToRenameId, "Initial category should be created.");
    console.log(`   ✅ Created category with ID: ${categoryToRenameId.toString()}`);

    // Verify initial state
    let categories = await store.getCategoryNamesAndOwners();
    assertEquals(
      categories.some((c) =>
        c.name === initialName && c.owner_id.toString() === ownerId.toString()
      ),
      true,
      "Initial category 'My Old Category' should exist.",
    );
    assertEquals(
      categories.some((c) =>
        c.name === newName && c.owner_id.toString() === ownerId.toString()
      ),
      false,
      "New category name 'My Renamed Category' should not exist initially.",
    );
    console.log("   ✅ Initial state verified: 'My Old Category' exists.");

    // --- Step 2: Action - Rename the category ---
    console.log(
      `2. Renaming category "${initialName}" (ID: ${categoryToRenameId.toString()}) to "${newName}"...`,
    );
    const { category_id: renamedCategoryId } = await store.rename(
      ownerId,
      categoryToRenameId,
      newName,
    );
    assertEquals(
      renamedCategoryId.toString(),
      categoryToRenameId.toString(),
      "Renamed category ID should match original ID.",
    );
    console.log("   ✅ Category rename action completed.");

    // --- Step 3: Verification - Check the new state using getCategoryNamesAndOwners ---
    console.log(`3. Verifying the renamed category using getCategoryNamesAndOwners...`);
    categories = await store.getCategoryNamesAndOwners();
    assertEquals(
      categories.some((c) =>
        c.name === initialName && c.owner_id.toString() === ownerId.toString()
      ),
      false,
      "Old category name 'My Old Category' should no longer exist.",
    );
    const foundRenamedCategory = categories.find(
      (c) => c.name === newName && c.owner_id.toString() === ownerId.toString(),
    );
    assertExists(
      foundRenamedCategory,
      "The renamed category 'My Renamed Category' should exist.",
    );
    assertEquals(
      foundRenamedCategory.name,
      newName,
      "The retrieved category name should be the new name.",
    );
    assertEquals(
      foundRenamedCategory.owner_id.toString(),
      ownerId.toString(),
      "The retrieved owner ID should match.",
    );
    console.log("   ✅ Verified: Category successfully renamed and old name is gone.");

    // --- Negative Test 1: Attempt to rename to an already existing category name (belonging to a *different* category) ---
    console.log(
      `\n4. Negative Test: Attempting to rename to an existing category name ("${anotherCategoryName}")...`,
    );
    // First, create another category
    const { category_id: anotherCategoryId } = await store.create(
      ownerId,
      anotherCategoryName,
    );
    console.log(
      `   Created another category "${anotherCategoryName}" with ID: ${anotherCategoryId.toString()}`,
    );

    await assertRejects(
      async () => {
        await store.rename(ownerId, categoryToRenameId, anotherCategoryName);
      },
      Error,
      `Category with name "${anotherCategoryName}" already exists for owner ${ownerId.toString()}.`,
      "Should reject renaming to a name already used by another category for the same owner.",
    );
    console.log(
      "   ✅ Verified: Renaming to an already existing category name was correctly rejected.",
    );

    // --- Negative Test 2: Attempt to rename a non-existent category ---
    console.log(
      "\n5. Negative Test: Attempting to rename a non-existent category...",
    );
    const nonExistentId = Id.from("non_existent_id");
    await assertRejects(
      async () => {
        await store.rename(ownerId, nonExistentId, "Some truly new name");
      },
      Error,
      `Category with ID "${nonExistentId.toString()}" not found for owner ${ownerId.toString()}.`,
      "Should reject renaming a non-existent category.",
    );
    console.log(
      "   ✅ Verified: Renaming a non-existent category was correctly rejected.",
    );

    // --- Test: Rename to its own current name (should succeed and do nothing) ---
    console.log("\n6. Test: Renaming category to its own current name...");
    const { category_id: renamedToSameId } = await store.rename(
      ownerId,
      categoryToRenameId,
      newName,
    );
    assertEquals(
      renamedToSameId.toString(),
      categoryToRenameId.toString(),
      "Renaming to the same name should return the original ID.",
    );

    categories = await store.getCategoryNamesAndOwners();
    const foundCategoryAfterSameNameRename = categories.find(
      (c) => c.name === newName && c.owner_id.toString() === ownerId.toString(),
    );
    assertExists(
      foundCategoryAfterSameNameRename,
      "The category should still exist with its current name after attempting to rename to itself.",
    );
    console.log(
      "   ✅ Verified: Renaming to its own current name succeeds and state remains unchanged.",
    );
  } finally {
    await client.close();
    console.log("Database client closed.");
  }
});

```
