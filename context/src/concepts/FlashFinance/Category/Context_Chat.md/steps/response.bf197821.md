---
timestamp: 'Sat Oct 18 2025 19:20:13 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_192013.74bfb805.md]]'
content_id: bf1978211f4dd153aed8b2d372730aaac19a733044cf3aea56bb32ffeee77988
---

# response:

To trim the `Deno.test` functions in `src/concepts/FlashFinance/Category/test-actions/test-non-popular.ts` according to the requirements, I will refactor the existing tests into more focused scenarios, each with minimal assertions (4-5 max) and no verbose logging. I will ensure only public `CategoryStore` methods and `Period` are used.

Here's the trimmed and refactored `test-non-popular.ts` file:

```typescript
import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { CategoryStore, Id, Period } from "../category.ts";

// --- Category: Create Actions ---

Deno.test("CategoryStore: create action successfully creates a category", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);
  try {
    const ownerId = Id.from("test_user_create_success");
    const categoryName = "New Category";

    const { category_id } = await store.create(ownerId, categoryName);
    assertExists(category_id, "A category ID should be returned.");

    const categories = await store.getCategoryNamesAndOwners();
    const foundCategory = categories.find(
      (c) => c.name === categoryName && c.owner_id.toString() === ownerId.toString(),
    );
    assertExists(foundCategory, "The new category should be found.");
    assertEquals(foundCategory.name, categoryName, "Category name should match.");
    assertEquals(foundCategory.owner_id.toString(), ownerId.toString(), "Owner ID should match.");
  } finally {
    await client.close(true);
  }
});

Deno.test("CategoryStore: create action enforces name uniqueness per owner", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);
  try {
    const ownerId = Id.from("test_user_create_duplicate");
    const categoryName = "Unique Name";

    await store.create(ownerId, categoryName); // First successful creation

    await assertRejects(
      async () => {
        await store.create(ownerId, categoryName); // Attempt duplicate creation
      },
      Error,
      `Category with name "${categoryName}" already exists for owner ${ownerId.toString()}.`,
      "Should reject creating a category with a duplicate name for the same owner.",
    );
  } finally {
    await client.close(true);
  }
});

// --- Category: Rename Actions ---

Deno.test("CategoryStore: rename action successfully updates category name", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);
  try {
    const ownerId = Id.from("test_user_rename_success");
    const initialName = "Old Name";
    const newName = "Updated Name";

    const { category_id } = await store.create(ownerId, initialName);
    await store.rename(ownerId, category_id, newName);

    const categories = await store.getCategoryNamesAndOwners();
    assertEquals(
      categories.some((c) => c.name === initialName),
      false,
      "Old category name should no longer exist.",
    );
    const foundRenamedCategory = categories.find(
      (c) => c.name === newName && c.owner_id.toString() === ownerId.toString(),
    );
    assertExists(foundRenamedCategory, "Renamed category should exist with new name.");
    assertEquals(foundRenamedCategory.name, newName, "Category name should be updated.");
    assertEquals(foundRenamedCategory.owner_id.toString(), ownerId.toString(), "Owner ID should remain the same.");
  } finally {
    await client.close(true);
  }
});

Deno.test("CategoryStore: rename action rejects renaming to an existing name for the same owner", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);
  try {
    const ownerId = Id.from("test_user_rename_conflict");
    const categoryA_name = "Category A";
    const categoryB_name = "Category B";

    const { category_id: categoryA_id } = await store.create(ownerId, categoryA_name);
    await store.create(ownerId, categoryB_name);

    await assertRejects(
      async () => {
        await store.rename(ownerId, categoryA_id, categoryB_name);
      },
      Error,
      `Category with name "${categoryB_name}" already exists for owner ${ownerId.toString()}.`,
      "Should reject renaming to a name already used by another category for the same owner.",
    );
  } finally {
    await client.close(true);
  }
});

Deno.test("CategoryStore: rename action rejects renaming a non-existent category", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);
  try {
    const ownerId = Id.from("test_user_rename_nonexistent");
    const nonExistentId = Id.from("non_existent_id");
    const newName = "Some Name";

    await assertRejects(
      async () => {
        await store.rename(ownerId, nonExistentId, newName);
      },
      Error,
      `Category with ID "${nonExistentId.toString()}" not found for owner ${ownerId.toString()}.`,
      "Should reject renaming a non-existent category.",
    );
  } finally {
    await client.close(true);
  }
});

Deno.test("CategoryStore: rename action to same name is idempotent", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);
  try {
    const ownerId = Id.from("test_user_rename_self");
    const categoryName = "Initial Name";

    const { category_id } = await store.create(ownerId, categoryName);
    const { category_id: renamedId } = await store.rename(ownerId, category_id, categoryName);

    assertEquals(renamedId.toString(), category_id.toString(), "Renaming to the same name should return the original ID.");
    const categories = await store.getCategoryNamesAndOwners();
    const foundCategory = categories.find((c) => c.name === categoryName && c.owner_id.toString() === ownerId.toString());
    assertExists(foundCategory, "Category should still exist with its current name.");
  } finally {
    await client.close(true);
  }
});

// --- Category: Delete Actions ---

Deno.test("CategoryStore: delete action successfully removes a category", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);
  try {
    const ownerId = Id.from("test_user_delete_success");
    const categoryName = "To Be Deleted";

    const { category_id } = await store.create(ownerId, categoryName);
    const { ok: deleteOk } = await store.delete(ownerId, category_id, true);

    assertEquals(deleteOk, true, "Deletion should return true.");
    const categories = await store.getCategoryNamesAndOwners();
    assertEquals(
      categories.some((c) => c.name === categoryName),
      false,
      "The deleted category should no longer exist.",
    );
  } finally {
    await client.close(true);
  }
});

Deno.test("CategoryStore: delete action blocks when category is referenced by labels", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);
  try {
    const ownerId = Id.from("test_user_delete_blocked");
    const categoryName = "Referenced Category";

    const { category_id } = await store.create(ownerId, categoryName);

    await assertRejects(
      async () => {
        await store.delete(ownerId, category_id, false); // can_delete = false to simulate being referenced
      },
      Error,
      `Cannot delete category "${category_id.toString()}" because it is referenced by existing labels.`,
      "Should reject deletion if can_delete is false.",
    );
    const categories = await store.getCategoryNamesAndOwners();
    assertEquals(
      categories.some((c) => c.name === categoryName),
      true,
      "Category should still exist after blocked deletion.",
    );
  } finally {
    await client.close(true);
  }
});

Deno.test("CategoryStore: delete action rejects deletion of a non-existent category", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);
  try {
    const ownerId = Id.from("test_user_delete_nonexistent");
    const nonExistentId = Id.from("non_existent_category_id");

    await assertRejects(
      async () => {
        await store.delete(ownerId, nonExistentId, true); // can_delete value doesn't matter
      },
      Error,
      `Category with ID "${nonExistentId.toString()}" not found for owner ${ownerId.toString()}.`,
      "Should reject deletion of a non-existent category.",
    );
  } finally {
    await client.close(true);
  }
});

// --- CategoryMetrics Actions ---

Deno.test("CategoryStore: setMetricTotal creates and updates a metric", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);
  try {
    const ownerId = Id.from("test_user_metric_create_update");
    const categoryName = "Test Category";
    const period = Period.from(new Date("2023-01-01"), new Date("2023-01-31"));

    const { category_id } = await store.create(ownerId, categoryName);

    await store.setMetricTotal(ownerId, category_id, period, 100);
    let metric = await store.getMetric(ownerId, category_id, period);
    assertExists(metric, "Metric should be created.");
    assertEquals(metric.current_total, 100, "Initial total should be 100.");

    await store.setMetricTotal(ownerId, category_id, period, 250.50);
    metric = await store.getMetric(ownerId, category_id, period);
    assertEquals(metric.current_total, 250.50, "Total should be updated to 250.50.");
    const metricsList = await store.listMetrics(ownerId, category_id);
    assertEquals(metricsList.length, 1, "There should only be one metric for the period.");
  } finally {
    await client.close(true);
  }
});

Deno.test("CategoryStore: listMetrics returns all metrics sorted by period_start", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);
  try {
    const ownerId = Id.from("test_user_metric_list_sort");
    const categoryName = "Sorted Metrics";
    const { category_id } = await store.create(ownerId, categoryName);

    const periodJan = Period.from(new Date("2023-01-01"), new Date("2023-01-31"));
    const periodFeb = Period.from(new Date("2023-02-01"), new Date("2023-02-28"));
    const periodMar = Period.from(new Date("2023-03-01"), new Date("2023-03-31"));

    await store.setMetricTotal(ownerId, category_id, periodMar, 300); // Add out of order
    await store.setMetricTotal(ownerId, category_id, periodJan, 100);
    await store.setMetricTotal(ownerId, category_id, periodFeb, 200);

    const allMetrics = await store.listMetrics(ownerId, category_id);
    assertEquals(allMetrics.length, 3, "Should have 3 metrics.");
    assertEquals(allMetrics[0].period_start.toISOString(), periodJan.startDate.toISOString(), "First metric should be January.");
    assertEquals(allMetrics[1].period_start.toISOString(), periodFeb.startDate.toISOString(), "Second metric should be February.");
    assertEquals(allMetrics[2].period_start.toISOString(), periodMar.startDate.toISOString(), "Third metric should be March.");
  } finally {
    await client.close(true);
  }
});

Deno.test("CategoryStore: setMetricTotal rejects invalid total or non-existent category", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);
  try {
    const ownerId = Id.from("test_user_metric_errors");
    const categoryName = "Error Test Category";
    const period = Period.from(new Date("2023-01-01"), new Date("2023-01-31"));

    const { category_id } = await store.create(ownerId, categoryName);
    const nonExistentCategoryId = Id.from("non_existent_category_for_metrics");

    await assertRejects(
      async () => {
        await store.setMetricTotal(ownerId, category_id, period, -50);
      },
      Error,
      "Metric update failed: total must be nonnegative.",
      "Should reject setting a negative total.",
    );

    await assertRejects(
      async () => {
        await store.setMetricTotal(ownerId, nonExistentCategoryId, period, 100);
      },
      Error,
      "Metric update failed: Category not found.",
      "Should reject setting metric for a non-existent category.",
    );
  } finally {
    await client.close(true);
  }
});

Deno.test("CategoryStore: delete category cascades to associated metrics", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);
  try {
    const ownerId = Id.from("test_user_metric_cascade_delete");
    const categoryA_name = "Category A";
    const categoryB_name = "Category B";
    const period = Period.from(new Date("2023-01-01"), new Date("2023-01-31"));

    const { category_id: categoryA_id } = await store.create(ownerId, categoryA_name);
    await store.setMetricTotal(ownerId, categoryA_id, period, 100);
    const { category_id: categoryB_id } = await store.create(ownerId, categoryB_name);
    await store.setMetricTotal(ownerId, categoryB_id, period, 200);

    await store.delete(ownerId, categoryA_id, true);

    const categoriesAfterDelete = await store.getCategoryNamesAndOwners();
    assertEquals(categoriesAfterDelete.some((c) => c.name === categoryA_name), false, "Category A should be gone.");
    const metricsForA = await store.listMetrics(ownerId, categoryA_id);
    assertEquals(metricsForA.length, 0, "All metrics for Category A should be removed.");

    assertEquals(categoriesAfterDelete.some((c) => c.name === categoryB_name), true, "Category B should still exist.");
    const metricForB = await store.getMetric(ownerId, categoryB_id, period);
    assertExists(metricForB, "Metric for Category B should still exist.");
    assertEquals(metricForB.current_total, 200, "Metric for Category B should be unchanged.");
  } finally {
    await client.close(true);
  }
});

// --- New Test Case: Renaming a category does not affect its existing metrics ---

Deno.test("CategoryStore: renaming a category does not affect its existing metrics", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);
  try {
    const ownerId = Id.from("test_user_rename_metrics_intact");
    const initialName = "Rent";
    const newName = "Housing Expenses";

    const periodJan = Period.from(new Date("2023-01-01T00:00:00.000Z"), new Date("2023-01-31T23:59:59.999Z"));
    const totalJan = 1200.50;
    const periodFeb = Period.from(new Date("2023-02-01T00:00:00.000Z"), new Date("2023-02-28T23:59:59.999Z"));
    const totalFeb = 1250.75;

    const { category_id } = await store.create(ownerId, initialName);
    await store.setMetricTotal(ownerId, category_id, periodJan, totalJan);
    await store.setMetricTotal(ownerId, category_id, periodFeb, totalFeb);

    await store.rename(ownerId, category_id, newName);

    // Verify category name changed
    const categories = await store.getCategoryNamesAndOwners();
    assertEquals(categories.some((c) => c.name === initialName), false, "Old category name should no longer exist.");
    assertEquals(categories.some((c) => c.name === newName), true, "New category name should exist.");

    // Verify metrics are still associated with the original category_id and their totals are unchanged
    const metricJanAfterRename = await store.getMetric(ownerId, category_id, periodJan);
    assertExists(metricJanAfterRename, "January metric should still be retrievable by original category ID.");
    assertEquals(metricJanAfterRename.current_total, totalJan, "January metric total should remain unchanged.");

    const metricFebAfterRename = await store.getMetric(ownerId, category_id, periodFeb);
    assertExists(metricFebAfterRename, "February metric should still be retrievable by original category ID.");
    assertEquals(metricFebAfterRename.current_total, totalFeb, "February metric total should remain unchanged.");

    // Verify listMetrics for original category_id still returns both
    const listedMetricsAfterRename = await store.listMetrics(ownerId, category_id);
    assertEquals(listedMetricsAfterRename.length, 2, "listMetrics should still return two metrics for the original category ID.");
  } finally {
    await client.close(true);
  }
});
```
