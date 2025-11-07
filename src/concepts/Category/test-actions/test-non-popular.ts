import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import CategoryConcept, { Id, Period } from "../CategoryConcept.ts"; // Adjust path if CategoryConcept.ts is not in the parent directory

Deno.test("CategoryConcept: renaming a category preserves recorded metric transactions", async () => {
  const [db, client] = await testDb();
  const store = new CategoryConcept(db);

  try {
    const ownerId = Id.from("test_user_rename_metrics");
    const initialName = "Rent";
    const newName = "Housing Expenses";

    const txIdJan = Id.from("rename_metric_tx_jan");
    const txIdFeb = Id.from("rename_metric_tx_feb");

    const periodJan = Period.from(
      new Date("2023-01-01T00:00:00.000Z"),
      new Date("2023-01-31T23:59:59.999Z"),
    );
    const periodFeb = Period.from(
      new Date("2023-02-01T00:00:00.000Z"),
      new Date("2023-02-28T23:59:59.999Z"),
    );

    // 1. Setup: Create category and record two metric transactions.
    const { category_id: categoryId } = await store.create(
      ownerId,
      initialName,
    );
    assertExists(categoryId, "Category should be created successfully.");
    await store.addTransaction({
      owner_id: ownerId.toString(),
      category_id: categoryId.toString(),
      tx_id: txIdJan.toString(),
      amount: 1200.5,
      tx_date: new Date("2023-01-15T12:00:00.000Z"),
    });
    await store.addTransaction({
      owner_id: ownerId.toString(),
      category_id: categoryId.toString(),
      tx_id: txIdFeb.toString(),
      amount: 1250.75,
      tx_date: new Date("2023-02-10T12:00:00.000Z"),
    });

    const transactionsBeforeRename = await store.listTransactions(
      ownerId,
      categoryId,
    );
    assertEquals(
      transactionsBeforeRename.map((t) => t.tx_id).sort(),
      [txIdJan.toString(), txIdFeb.toString()].sort(),
      "Transactions should be recorded before rename.",
    );

    // 2. Rename the category succeeds.
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

    // 3. Transactions and stats remain unchanged post-rename.
    const transactionsAfterRename = await store.listTransactions(
      ownerId,
      categoryId,
    );
    assertEquals(
      transactionsAfterRename.map((t) => t.tx_id).sort(),
      [txIdJan.toString(), txIdFeb.toString()].sort(),
      "Transactions should remain after rename.",
    );

    const [statsJanFrame] = await store.getMetricStats(
      ownerId,
      categoryId,
      periodJan,
    );
    assertExists(statsJanFrame, "January stats should be available.");
    const statsJan = statsJanFrame?.stats;
    assertExists(statsJan, "January stats payload should be available.");
    assertEquals(
      statsJan.total_amount,
      1200.5,
      "January totals should remain after rename.",
    );
    const [statsFebFrame] = await store.getMetricStats(
      ownerId,
      categoryId,
      periodFeb,
    );
    assertExists(statsFebFrame, "February stats should be available.");
    const statsFeb = statsFebFrame?.stats;
    assertExists(statsFeb, "February stats payload should be available.");
    assertEquals(
      statsFeb.total_amount,
      1250.75,
      "February totals should remain after rename.",
    );
  } finally {
    await client.close(true);
  }
});
Deno.test("CategoryConcept: cross-owner isolation for categories and metrics", async () => {
  const [db, client] = await testDb();
  const store = new CategoryConcept(db);

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

    const period = Period.from(new Date("2023-01-01"), new Date("2023-01-31"));
    const txA = Id.from("isolation_tx_A1");
    const totalValue = 123.45;

    await store.addTransaction({
      owner_id: ownerA.toString(),
      category_id: categoryA_id.toString(),
      tx_id: txA.toString(),
      amount: totalValue,
      tx_date: new Date("2023-01-10"),
    });

    const [statsAFrame] = await store.getMetricStats(
      ownerA,
      categoryA_id,
      period,
    );
    assertExists(statsAFrame, "Owner A stats should be available.");
    const statsA = statsAFrame?.stats;
    assertExists(statsA, "Owner A stats payload should be available.");
    assertEquals(
      statsA.total_amount,
      totalValue,
      "Owner A stats should include recorded amount.",
    );
    assertEquals(
      statsA.transaction_count,
      1,
      "Owner A should have one transaction recorded.",
    );

    const transactionsA = await store.listTransactions(ownerA, categoryA_id);
    assertEquals(
      transactionsA.length,
      1,
      "Owner A should list one transaction.",
    );
    assertEquals(
      transactionsA[0].tx_id,
      txA.toString(),
      "Owner A transaction should match added tx.",
    );

    const [statsBFrame] = await store.getMetricStats(
      ownerB,
      categoryB_id,
      period,
    );
    assertExists(statsBFrame, "Owner B stats should resolve even when empty.");
    const statsB = statsBFrame?.stats;
    assertExists(
      statsB,
      "Owner B stats payload should resolve even when empty.",
    );
    assertEquals(
      statsB.total_amount,
      0,
      "Owner B stats should remain empty.",
    );
    assertEquals(
      statsB.transaction_count,
      0,
      "Owner B should have no transactions recorded.",
    );

    const transactionsB = await store.listTransactions(ownerB, categoryB_id);
    assertEquals(
      transactionsB.length,
      0,
      "Owner B should list no transactions, demonstrating isolation.",
    );
  } finally {
    await client.close(true);
  }
});
Deno.test("CategoryConcept: deleteMetricsForCategory removes metric bucket", async () => {
  const [db, client] = await testDb();
  const store = new CategoryConcept(db);

  try {
    // 1. Setup: Create one owner and one category
    const ownerId = Id.from("test_user_delete_metrics_standalone");
    const categoryName = "Standalone Metrics Category";
    const { category_id: categoryId } = await store.create(
      ownerId,
      categoryName,
    );
    assertExists(categoryId, "Category should be created.");

    await store.addTransaction({
      owner_id: ownerId.toString(),
      category_id: categoryId.toString(),
      tx_id: Id.from("delete_metric_tx_1").toString(),
      amount: 100,
      tx_date: new Date("2023-01-10"),
    });
    await store.addTransaction({
      owner_id: ownerId.toString(),
      category_id: categoryId.toString(),
      tx_id: Id.from("delete_metric_tx_2").toString(),
      amount: 200,
      tx_date: new Date("2023-02-12"),
    });

    const transactionsBeforeDelete = await store.listTransactions(
      ownerId,
      categoryId,
    );
    assertEquals(
      transactionsBeforeDelete.length,
      2,
      "Two transactions should exist before deletion.",
    );

    const deletedCount = await store.deleteMetricsForCategory(
      ownerId,
      categoryId,
    );
    assertEquals(
      deletedCount,
      1,
      "deleteMetricsForCategory should remove the single metric bucket.",
    );

    //
    const transactionsAfterDelete = await store.listTransactions(
      ownerId,
      categoryId,
    );
    assertEquals(
      transactionsAfterDelete.length,
      0,
      "All metric transactions should be removed.",
    );
    const [statsAfterDeleteFrame] = await store.getMetricStats(
      ownerId,
      categoryId,
      Period.from(new Date("2023-01-01"), new Date("2023-03-31")),
    );
    assertExists(statsAfterDeleteFrame, "Stats should resolve after deletion.");
    const statsAfterDelete = statsAfterDeleteFrame?.stats;
    assertExists(
      statsAfterDelete,
      "Stats payload should resolve after deletion.",
    );
    assertEquals(
      statsAfterDelete.total_amount,
      0,
      "Stats should reset after deletion.",
    );
  } finally {
    await client.close(true);
  }
});
