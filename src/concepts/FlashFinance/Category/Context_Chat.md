
# prompt: Implement one new `Deno.test` in `src/concepts/FlashFinance/Category/test-actions/test-non-popular.ts` that verifies the standalone maintenance behavior of `deleteMetricsForCategory`. Follow the existing imports/assertion style and use only public `CategoryStore` methods plus `Period`. The test should: create one owner and one category, call `setMetricTotal` three times for **three distinct Periods** for that category, assert via `listMetrics` that 3 metrics exist, then call `deleteMetricsForCategory(owner, category)` and assert it returns `3` and that `listMetrics(owner, category)` is now empty. Keep it minimal (≤5 assertions), no direct DB access, no extra logging, and do not touch unrelated behaviors (no delete of the category itself, no renames, no cross-owner checks).


[@Spec](Spec.md)

[@category.ts](/src/concepts/FlashFinance/Category/category.ts) 

[@test-op-simple.ts](/src/concepts/FlashFinance/Category/test-actions/test-op-simple.ts)


[@test-non-popular.ts](/src/concepts/FlashFinance/Category/test-actions/test-non-popular.ts)


# response:

```typescript
import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { CategoryStore, Id, Period } from "../category.ts"; // Adjust path if category.ts is not in the parent directory

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

Deno.test("CategoryStore: cross-owner isolation for categories and metrics", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);

  try {
    // 1. Create two owners
    const ownerA = Id.from("owner_isolate_A");
    const ownerB = Id.from("owner_isolate_B");

    // 2. Create a category with the same name for each owner
    const categoryName = "Isolation Test Category";
    const { category_id: categoryA_id } = await store.create(
      ownerA,
      categoryName,
    );
    const { category_id: categoryB_id } = await store.create(
      ownerB,
      categoryName,
    );

    assertExists(categoryA_id, "Category A should be created for owner A.");
    assertExists(categoryB_id, "Category B should be created for owner B.");
    assertEquals(
      categoryA_id.toString() !== categoryB_id.toString(),
      true,
      "Category IDs for different owners with same name should be distinct.",
    );

    // Define a period
    const period = Period.from(new Date("2023-01-01"), new Date("2023-01-31"));
    const totalValue = 123.45;

    // 3. Call setMetricTotal only for owner A’s category for a given Period
    await store.setMetricTotal(ownerA, categoryA_id, period, totalValue);

    // 4. Assertions:
    // (1) getMetric(ownerA, catA, period) returns the expected current_total
    const metricForOwnerA = await store.getMetric(
      ownerA,
      categoryA_id,
      period,
    );
    assertExists(metricForOwnerA, "Metric for owner A should exist.");
    assertEquals(
      metricForOwnerA.current_total,
      totalValue,
      "Metric for owner A should have the expected total.",
    );

    // (2) getMetric(ownerB, catB, period) returns null
    const metricForOwnerB = await store.getMetric(
      ownerB,
      categoryB_id,
      period,
    );
    assertEquals(
      metricForOwnerB,
      null,
      "Metric for owner B should be null, demonstrating isolation.",
    );
  } finally {
    await client.close(true);
  }
});

Deno.test("CategoryStore: deleteMetricsForCategory works independently and returns count", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);

  try {
    // 1. Setup: Create one owner and one category
    const ownerId = Id.from("test_user_delete_metrics_standalone");
    const categoryName = "Standalone Metrics Category";
    const { category_id: categoryId } = await store.create(ownerId, categoryName);
    assertExists(categoryId, "Category should be created.");

    // Define three distinct periods
    const period1 = Period.from(new Date("2023-01-01"), new Date("2023-01-31"));
    const period2 = Period.from(new Date("2023-02-01"), new Date("2023-02-28"));
    const period3 = Period.from(new Date("2023-03-01"), new Date("2023-03-31"));

    // 2. Call setMetricTotal three times for three distinct Periods for that category
    await store.setMetricTotal(ownerId, categoryId, period1, 100);
    await store.setMetricTotal(ownerId, categoryId, period2, 200);
    await store.setMetricTotal(ownerId, categoryId, period3, 300);

    // 3. Assert via listMetrics that 3 metrics exist
    const metricsBeforeDelete = await store.listMetrics(ownerId, categoryId);
    assertEquals(metricsBeforeDelete.length, 3, "Initially, 3 metrics should exist.");

    // 4. Call deleteMetricsForCategory(owner, category)
    const deletedCount = await store.deleteMetricsForCategory(ownerId, categoryId);

    // 5. Assert it returns 3
    assertEquals(deletedCount, 3, "deleteMetricsForCategory should return 3, the number of deleted metrics.");

    // 6. Assert that listMetrics(owner, category) is now empty
    const metricsAfterDelete = await store.listMetrics(ownerId, categoryId);
    assertEquals(metricsAfterDelete.length, 0, "After deletion, no metrics should remain for the category.");

  } finally {
    await client.close(true);
  }
});
```