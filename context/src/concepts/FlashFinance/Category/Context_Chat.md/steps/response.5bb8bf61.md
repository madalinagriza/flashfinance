---
timestamp: 'Sat Oct 18 2025 19:23:26 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_192326.e2aeb10d.md]]'
content_id: 5bb8bf614ba10272bbac7c7ff68b76ea43d8501978c6d5b7258c2cd6ddbe54d9
---

# response:

```typescript
import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { CategoryStore, Id, Period } from "../category.ts"; // Adjust path if category.ts is not in the parent directory

Deno.test("CategoryStore: create action works and enforces name uniqueness per owner", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);

  try {
    const ownerId = Id.from("test_user_create_1");
    const categoryName = "Groceries";
    const anotherOwnerId = Id.from("test_user_create_2");

    // 1. Proof: Create category succeeds and returns an ID.
    const { category_id: createdCategoryId } = await store.create(
      ownerId,
      categoryName,
    );
    assertExists(
      createdCategoryId,
      "A category ID should be returned upon successful creation.",
    );

    // 2. Proof: The created category can be retrieved and has the correct name and owner.
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

    // 3. Proof: Creating a category with the same name for the same owner is rejected.
    await assertRejects(
      async () => {
        await store.create(ownerId, categoryName);
      },
      Error,
      `Category with name "${categoryName}" already exists for owner ${ownerId.toString()}.`,
      "Should reject creating a category with a duplicate name for the same owner.",
    );

    // 4. Proof: Creating a category with the same name for a different owner is allowed.
    const { category_id: categoryIdForAnotherOwner } = await store.create(
      anotherOwnerId,
      categoryName,
    );
    assertExists(categoryIdForAnotherOwner, "Same category name for different owner should be allowed.");
  } finally {
    await client.close(true);
  }
});

Deno.test("CategoryStore: rename action works and enforces new name uniqueness", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);

  try {
    const ownerId = Id.from("test_user_rename_1");
    const initialName = "My Old Category";
    const newName = "My Renamed Category";
    const anotherCategoryName = "Another Category";

    // 1. Setup: Create a category to be renamed.
    const { category_id: categoryToRenameId } = await store.create(
      ownerId,
      initialName,
    );
    assertExists(categoryToRenameId, "Initial category should be created.");

    // 2. Proof: Rename succeeds and returns the original category ID.
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

    // 3. Proof: The category now has the new name, and the old name is no longer present.
    const categoriesAfterRename = await store.getCategoryNamesAndOwners();
    assertEquals(
      categoriesAfterRename.some((c) =>
        c.name === initialName && c.owner_id.toString() === ownerId.toString()
      ),
      false,
      "Old category name should no longer exist after rename.",
    );
    assertEquals(
      categoriesAfterRename.some((c) =>
        c.name === newName && c.owner_id.toString() === ownerId.toString()
      ),
      true,
      "New category name should exist after rename.",
    );

    // Setup for negative test: Create another category.
    const { category_id: anotherCategoryId } = await store.create(
      ownerId,
      anotherCategoryName,
    );
    assertExists(anotherCategoryId, "Another category for negative test should be created.");


    // 4. Proof: Attempting to rename to an already existing category name (for a different category) is rejected.
    await assertRejects(
      async () => {
        await store.rename(ownerId, categoryToRenameId, anotherCategoryName);
      },
      Error,
      `Category with name "${anotherCategoryName}" already exists for owner ${ownerId.toString()}.`,
      "Should reject renaming to a name already used by another category for the same owner.",
    );

    // 5. Proof: Attempting to rename a non-existent category is rejected.
    const nonExistentId = Id.from("non_existent_id");
    await assertRejects(
      async () => {
        await store.rename(ownerId, nonExistentId, "Some truly new name");
      },
      Error,
      `Category with ID "${nonExistentId.toString()}" not found for owner ${ownerId.toString()}.`,
      "Should reject renaming a non-existent category.",
    );
  } finally {
    await client.close(true);
  }
});

Deno.test("CategoryStore: delete action works and blocks when referenced by labels", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);

  try {
    const ownerId = Id.from("test_user_delete_1");
    const categoryNameToDelete = "To Be Deleted";
    const categoryNameWithLabels = "Referenced Category";

    // 1. Setup: Create a category that will be successfully deleted.
    const { category_id: categoryIdToDelete } = await store.create(
      ownerId,
      categoryNameToDelete,
    );
    assertExists(categoryIdToDelete, "Category to delete should be created.");

    // 2. Proof: Deleting a category with `can_delete=true` succeeds.
    const { ok: deleteOk } = await store.delete(
      ownerId,
      categoryIdToDelete,
      true,
    );
    assertEquals(deleteOk, true, "Deletion should return true.");

    // 3. Proof: The successfully deleted category is no longer present.
    const categoriesAfterDelete = await store.getCategoryNamesAndOwners();
    assertEquals(
      categoriesAfterDelete.some((c) =>
        c.name === categoryNameToDelete &&
        c.owner_id.toString() === ownerId.toString()
      ),
      false,
      "The deleted category should no longer exist.",
    );

    // 4. Setup for negative test: Create a category that will simulate being referenced by labels.
    const { category_id: categoryIdWithLabels } = await store.create(
      ownerId,
      categoryNameWithLabels,
    );
    assertExists(
      categoryIdWithLabels,
      "Category simulating labels should be created.",
    );

    // 5. Proof: Attempting to delete a category with `can_delete=false` is rejected.
    await assertRejects(
      async () => {
        await store.delete(ownerId, categoryIdWithLabels, false);
      },
      Error,
      `Cannot delete category "${categoryIdWithLabels.toString()}" because it is referenced by existing labels.`,
      "Should reject deletion if can_delete is false.",
    );
  } finally {
    await client.close(true);
  }
});

Deno.test("CategoryStore: CategoryMetrics actions (set, get, list, delete with category) work as expected", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);

  try {
    const ownerId = Id.from("test_user_metrics_1");
    const categoryName1 = "Groceries Metrics";
    const periodJan = Period.from(
      new Date("2023-01-01"),
      new Date("2023-01-31"),
    );
    const periodFeb = Period.from(
      new Date("2023-02-01"),
      new Date("2023-02-28"),
    );

    // 1. Setup & Proof: Create category and set an initial metric.
    const { category_id: categoryId1 } = await store.create(
      ownerId,
      categoryName1,
    );
    assertExists(categoryId1, "Category should be created.");
    await store.setMetricTotal(ownerId, categoryId1, periodJan, 100.00);
    const retrievedMetric1 = await store.getMetric(
      ownerId,
      categoryId1,
      periodJan,
    );
    assertEquals(
      retrievedMetric1?.current_total,
      100.00,
      "Retrieved metric total should be 100.00 after initial set.",
    );

    // 2. Proof: Updating an existing metric for the same period updates its total.
    await store.setMetricTotal(ownerId, categoryId1, periodJan, 150.75);
    const retrievedMetric2 = await store.getMetric(
      ownerId,
      categoryId1,
      periodJan,
    );
    assertEquals(
      retrievedMetric2?.current_total,
      150.75,
      "Retrieved metric total should be 150.75 after update.",
    );

    // 3. Proof: Setting a negative total is rejected.
    await assertRejects(
      async () => {
        await store.setMetricTotal(ownerId, categoryId1, periodJan, -50);
      },
      Error,
      "Metric update failed: total must be nonnegative.",
      "Should reject setting a negative total.",
    );

    // 4. Proof: Deleting the category removes all its associated metrics.
    await store.setMetricTotal(ownerId, categoryId1, periodFeb, 200.00); // Add another metric
    const metricsBeforeDelete = await store.listMetrics(ownerId, categoryId1);
    assertEquals(metricsBeforeDelete.length, 2, "Two metrics should exist before deletion.");

    await store.delete(ownerId, categoryId1, true); // Delete the category
    const metricsAfterDelete = await store.listMetrics(ownerId, categoryId1);
    assertEquals(
      metricsAfterDelete.length,
      0,
      "All metrics associated with the deleted category should be removed.",
    );
  } finally {
    await client.close(true);
  }
});

Deno.test("CategoryStore: renaming a category does not affect its existing metrics", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);

  try {
    const ownerId = Id.from("test_user_rename_metrics");
    const initialName = "Rent";
    const newName = "Housing Expenses";

    const periodJan = Period.from(
      new Date("2023-01-01T00:00:00.000Z"),
      new Date("2023-01-31T23:59:59.999Z"),
    );
    const totalJan = 1200.50;

    const periodFeb = Period.from(
      new Date("2023-02-01T00:00:00.000Z"),
      new Date("2023-02-28T23:59:59.999Z"),
    );
    const totalFeb = 1250.75;

    // 1. Setup: Create category and set two metrics.
    const { category_id: categoryId } = await store.create(
      ownerId,
      initialName,
    );
    assertExists(categoryId, "Category should be created successfully.");
    await store.setMetricTotal(ownerId, categoryId, periodJan, totalJan);
    await store.setMetricTotal(ownerId, categoryId, periodFeb, totalFeb);

    // Pre-verification: Confirm metrics are retrievable before rename.
    const metricJanBeforeRename = await store.getMetric(
      ownerId,
      categoryId,
      periodJan,
    );
    assertEquals(
      metricJanBeforeRename?.current_total,
      totalJan,
      "January metric total should be correct before rename.",
    );

    // 2. Proof: Rename the category succeeds.
    const { category_id: renamedCategoryId } = await store.rename(
      ownerId,
      categoryId,
      newName,
    );
    assertEquals(
      renamedCategoryId.toString(),
      categoryId.toString(),
      "Renamed category ID should match original ID.",
    );

    // 3. Proof: Metrics are still retrievable with the original category_id and their totals are unchanged.
    const metricJanAfterRename = await store.getMetric(
      ownerId,
      categoryId,
      periodJan,
    );
    assertEquals(
      metricJanAfterRename?.current_total,
      totalJan,
      "January metric total should remain unchanged after rename.",
    );
    const metricFebAfterRename = await store.getMetric(
      ownerId,
      categoryId,
      periodFeb,
    );
    assertEquals(
      metricFebAfterRename?.current_total,
      totalFeb,
      "February metric total should remain unchanged after rename.",
    );

    // 4. Proof: `listMetrics` still returns all associated metrics correctly, maintaining sort order.
    const listedMetricsAfterRename = await store.listMetrics(
      ownerId,
      categoryId,
    );
    assertEquals(
      listedMetricsAfterRename.length,
      2,
      "listMetrics should still return two metrics.",
    );
    assertEquals(
      listedMetricsAfterRename[0].period_start.toISOString(),
      periodJan.startDate.toISOString(),
      "First listed metric should be January (sorted).",
    );
  } finally {
    await client.close(true);
  }
});
```
