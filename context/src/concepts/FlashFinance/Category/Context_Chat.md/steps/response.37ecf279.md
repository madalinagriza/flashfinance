---
timestamp: 'Sat Oct 18 2025 19:06:54 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_190654.dd85068f.md]]'
content_id: 37ecf279e00cfc1ce1b8376b1aa683489efb59cfbf3d2ee10c12f272010ed06c
---

# response:

```typescript
// src/concepts/FlashFinance/Category/test-actions/test-op-simple.ts
// This file assumes the necessary imports are already present at the top,
// similar to other tests in this file. For clarity, key imports are listed below.

import { Deno } from "@deno/std/testing/mod.ts";
import { assert, assertEquals } from "@std/assert";

import { CategoryStore } from "../CategoryStore.ts";
import { OwnerId } from "../../Owner/Owner.ts";
import { Period } from "../../../Shared/Period.ts";
import { CategoryNotFoundError } from "../CategoryError.ts"; // Assuming this is used in other tests for context

// ... existing Deno.test blocks for CategoryStore ...

Deno.test("CategoryStore: renaming a category does not affect its existing metrics", async (test) => {
  const ownerId = OwnerId.create();
  const categoryStore = new CategoryStore(); // Each test usually gets a fresh store for isolation
  const initialCategoryName = "Entertainment";
  const newCategoryName = "Leisure & Fun";

  // 1. Create a category for an owner
  const createdCategory = await categoryStore.create(ownerId, initialCategoryName);
  const categoryId = createdCategory.id;

  // 2. Set two metrics for different Periods via setMetricTotal
  const period1 = Period.month(2023, 7);
  const total1 = 55.99;
  await categoryStore.setMetricTotal(categoryId, period1, total1);

  const period2 = Period.month(2023, 8);
  const total2 = 120.50;
  await categoryStore.setMetricTotal(categoryId, period2, total2);

  // 3. Rename the category using rename
  const renamedCategory = await categoryStore.rename(categoryId, newCategoryName);
  assertEquals(renamedCategory.name, newCategoryName, "Renamed category object should have the new name.");

  // 4. Confirm both metrics are still retrievable with the same totals via getMetric
  await test.step("Verify metrics via getMetric after rename", async () => {
    const metric1 = await categoryStore.getMetric(categoryId, period1);
    assert(metric1, "Metric for period 1 should be retrievable.");
    assertEquals(metric1.total, total1, "Metric 1 total should remain unchanged after rename.");
    assertEquals(metric1.category_name, newCategoryName, "Metric 1's category name should reflect the new name.");
    assertEquals(metric1.period_start, period1.start, "Metric 1's period start should be correct.");

    const metric2 = await categoryStore.getMetric(categoryId, period2);
    assert(metric2, "Metric for period 2 should be retrievable.");
    assertEquals(metric2.total, total2, "Metric 2 total should remain unchanged after rename.");
    assertEquals(metric2.category_name, newCategoryName, "Metric 2's category name should reflect the new name.");
    assertEquals(metric2.period_start, period2.start, "Metric 2's period start should be correct.");
  });

  // 4. Confirm listMetrics still returns both in ascending order by period_start
  await test.step("Verify metrics via listMetrics after rename", async () => {
    const listedMetrics = await categoryStore.listMetrics(categoryId);
    assertEquals(listedMetrics.length, 2, "listMetrics should return exactly two metrics.");

    // Check the first metric (corresponding to period1)
    assertEquals(listedMetrics[0].period_start, period1.start, "First listed metric's period_start should match period1.");
    assertEquals(listedMetrics[0].total, total1, "First listed metric's total should match total1.");
    assertEquals(listedMetrics[0].category_name, newCategoryName, "First listed metric's category name should reflect the new name.");

    // Check the second metric (corresponding to period2)
    assertEquals(listedMetrics[1].period_start, period2.start, "Second listed metric's period_start should match period2.");
    assertEquals(listedMetrics[1].total, total2, "Second listed metric's total should match total2.");
    assertEquals(listedMetrics[1].category_name, newCategoryName, "Second listed metric's category name should reflect the new name.");

    // Explicitly assert ascending order by period_start
    assert(
      listedMetrics[0].period_start < listedMetrics[1].period_start,
      "Metrics from listMetrics should be in ascending order by period_start.",
    );
  });
});
```
