---
timestamp: 'Sat Oct 18 2025 12:38:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_123823.6ff41947.md]]'
content_id: 62a9c99d4eb492192493a92c832c4b52c2380c3e7a872df78789096608dbbb3b
---

# response:

To add the action of deleting a category, I will implement the `delete` method in the `CategoryStore` class. Additionally, to support testing the deletion of `CategoryMetrics`, I will implement the `set_metric_total` action and a minimal getter `getCategoryMetric`. All `requires` conditions will lead to an error being thrown if they fail, as per the instructions.

Here's how the `category.ts` file will be modified:

1. **`set_metric_total` Method**: This method will create or update category metrics. It will validate that the category exists, belongs to the owner, and the total is non-negative.
2. **`getCategoryMetric` Method**: A simple getter to retrieve a `CategoryMetricDoc` by its keys, primarily for testing purposes.
3. **`delete` Method**: This method will:
   * Verify the category exists and belongs to the `owner_id`.
   * Throw an error if `has_labels_in_category` is true.
   * Remove the `CategoryDoc` from the `categories` collection.
   * Remove all associated `CategoryMetricDoc`s from the `categoryMetrics` collection.

I will also update `test-op-simple.ts` to include comprehensive test cases for both `set_metric_total` and `delete` actions, covering success scenarios and all failure conditions.

```typescript
// file: src/concepts/FlashFinance/Category/category.ts
// deno-lint-ignore no-unversioned-import
import { Collection, Db } from "npm:mongodb";

// Id class copied from label.ts as per instructions
export class Id {
  private constructor(private value: string) {}

  static from(value: string): Id {
    return new Id(value);
  }
  static generate(): Id {
    return new Id(crypto.randomUUID());
  }
  toString(): string {
    return this.value;
  }
}

/**
 * Represents a time period, defined by a start and an end date.
 * This class provides a canonical string representation suitable for unique keys.
 */
export class Period {
  constructor(public readonly startDate: Date, public readonly endDate: Date) {}

  static from(startDate: Date, endDate: Date): Period {
    // Basic validation to ensure start date is not after end date
    if (startDate.getTime() > endDate.getTime()) {
      throw new Error("Period start date cannot be after end date.");
    }
    return new Period(startDate, endDate);
  }

  /**
   * Returns a canonical string representation of the period,
   * using ISO strings for dates, separated by '__'.
   * Example: "2023-01-01T00:00:00.000Z__2023-01-31T23:59:59.999Z"
   */
  toString(): string {
    return `${this.startDate.toISOString()}__${this.endDate.toISOString()}`;
  }
}

const PREFIX = "Category" + "."; // Using "Category" as prefix as per the concept

/**
 * Represents a Category record as stored in MongoDB.
 * The _id field uniquely identifies a category within a user's context.
 * Invariants:
 * - (owner_id, name) is unique among Categories
 * - category_id is unique for the same user
 * - categories cannot belong to multiple users
 */
type CategoryDoc = {
  _id: string; // Composite key: `${owner_id.toString()}:${category_id.toString()}`
  owner_id: string;
  category_id: string;
  name: string;
};

/**
 * Represents a CategoryMetric record as stored in MongoDB.
 * The _id field uniquely identifies a metric for a given category and period for a user.
 * Invariants:
 * - (owner_id, category_id, period) uniquely identifies a CategoryMetric
 * - CategoryMetric.current_total is nonnegative
 */
type CategoryMetricDoc = {
  _id: string; // Composite key: `${owner_id.toString()}:${category_id.toString()}:${period.toString()}`
  owner_id: string;
  category_id: string;
  period_start: Date; // Storing the start date of the period
  period_end: Date; // Storing the end date of the period
  current_total: number;
};

export class CategoryStore {
  private categories: Collection<CategoryDoc>;
  private categoryMetrics: Collection<CategoryMetricDoc>;

  constructor(private readonly db: Db) {
    this.categories = db.collection(PREFIX + "categories");
    this.categoryMetrics = db.collection(PREFIX + "category_metrics");
  }

  /**
   * Generates a unique key for a Category document.
   * Based on owner_id and category_id, ensuring uniqueness per user.
   */
  private makeCategoryKey(owner_id: Id, category_id: Id): string {
    return `${owner_id.toString()}:${category_id.toString()}`;
  }

  /**
   * Generates a unique key for a CategoryMetric document.
   * Based on owner_id, category_id, and period.
   */
  private makeCategoryMetricKey(
    owner_id: Id,
    category_id: Id,
    period: Period,
  ): string {
    return `${owner_id.toString()}:${category_id.toString()}:${period.toString()}`;
  }

  async create(owner_id: Id, name: string): Promise<{ category_id: Id }> {
    // 1. Check for existing category with the same name for the owner
    // This enforces the invariant: (owner_id, name) is unique among Categories
    const existingCategoryByName = await this.categories.findOne({
      owner_id: owner_id.toString(),
      name: name,
    });

    if (existingCategoryByName) {
      throw new Error(
        `Category with name "${name}" already exists for owner ${owner_id.toString()}.`,
      );
    }

    // 2. Generate a new category_id (using UUID for uniqueness)
    // This helps enforce the invariant: category_id is unique for the same user
    const new_category_id = Id.generate();

    // 3. Create and store the category document
    const categoryDoc: CategoryDoc = {
      // The _id for the document is a composite key to ensure uniqueness per owner.
      // This also implicitly handles the category_id unique per user invariant.
      _id: this.makeCategoryKey(owner_id, new_category_id),
      owner_id: owner_id.toString(),
      category_id: new_category_id.toString(),
      name: name,
    };

    await this.categories.insertOne(categoryDoc);

    // 4. Return the generated category_id
    return { category_id: new_category_id };
  }
  private async getCategoryById(
    owner_id: Id,
    category_id: Id,
  ): Promise<CategoryDoc | null> {
    return await this.categories.findOne({
      _id: this.makeCategoryKey(owner_id, category_id),
    });
  }

  private async getCategoryByName(
    owner_id: Id,
    name: string,
  ): Promise<CategoryDoc | null> {
    return await this.categories.findOne({
      owner_id: owner_id.toString(),
      name: name,
    });
  }

  async rename(
    owner_id: Id,
    category_id: Id,
    new_name: string,
  ): Promise<{ category_id: Id }> {
    // 1. Requires: category exists and category.owner_id = owner_id
    const existingCategory = await this.getCategoryById(owner_id, category_id);

    if (!existingCategory) {
      throw new Error(
        `Category with ID "${category_id.toString()}" not found for owner ${owner_id.toString()}.`,
      );
    }
    // The `getCategoryById` already ensures owner_id matches due to the _id key structure,
    // so an explicit `if (existingCategory.owner_id !== owner_id.toString())` is redundant here.

    // If the new name is the same as the current name, do nothing and return.
    if (existingCategory.name === new_name) {
      return { category_id: category_id };
    }

    // 2. Requires: for the same owner_id, no existing category with same new_name
    const categoryWithNewName = await this.getCategoryByName(
      owner_id,
      new_name,
    );

    if (categoryWithNewName) {
      // If a category with new_name exists AND it's a different category than the one we are renaming, then it's a conflict.
      if (categoryWithNewName.category_id !== category_id.toString()) {
        throw new Error(
          `Category with name "${new_name}" already exists for owner ${owner_id.toString()}.`,
        );
      }
    }

    // 3. Effects: updates category.name to new_name
    const updateResult = await this.categories.updateOne(
      { _id: existingCategory._id }, // Identify the document by its unique composite _id
      { $set: { name: new_name } },
    );

    if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
      // This case should ideally not be reached if existingCategory was found and name was different.
      // It serves as a safeguard against unexpected database conditions.
      throw new Error(
        `Failed to rename category ${category_id.toString()}. No changes applied.`,
      );
    }

    // 4. Effects: returns updated category_id
    return { category_id: category_id };
  }

  async getCategoryNamesAndOwners(): Promise<
    Array<{ name: string; owner_id: Id }>
  > {
    const docs = await this.categories.find({})
      .project({ name: 1, owner_id: 1, _id: 0 }) // Project only the name and owner_id fields
      .toArray();

    return docs.map((doc) => ({
      name: doc.name,
      owner_id: Id.from(doc.owner_id),
    }));
  }

  // Action: set_metric_total
  async set_metric_total(
    owner_id: Id,
    category_id: Id,
    period: Period,
    total: number,
  ): Promise<void> {
    // Requires: owner and category exist
    const categoryExists = await this.getCategoryById(owner_id, category_id);
    if (!categoryExists) {
      throw new Error(
        `Category with ID "${category_id.toString()}" not found for owner ${owner_id.toString()}.`,
      );
    }

    // Requires: total >= 0
    if (total < 0) {
      throw new Error("Category metric total cannot be negative.");
    }

    const metricKey = this.makeCategoryMetricKey(owner_id, category_id, period);

    const metricDoc: CategoryMetricDoc = {
      _id: metricKey,
      owner_id: owner_id.toString(),
      category_id: category_id.toString(),
      period_start: period.startDate,
      period_end: period.endDate,
      current_total: total,
    };

    // Effects: creates or updates the metric for (owner, category, period) with current_total = total
    await this.categoryMetrics.updateOne(
      { _id: metricKey },
      { $set: metricDoc },
      { upsert: true },
    );
  }

  // Getter for CategoryMetricDoc (minimal design, primarily for testing)
  async getCategoryMetric(
    owner_id: Id,
    category_id: Id,
    period: Period,
  ): Promise<CategoryMetricDoc | null> {
    const metricKey = this.makeCategoryMetricKey(owner_id, category_id, period);
    return await this.categoryMetrics.findOne({ _id: metricKey });
  }

  // Action: delete
  async delete(
    owner_id: Id,
    category_id: Id,
    has_labels_in_category: boolean,
  ): Promise<{ ok: boolean }> {
    // Requires: category exists and category.owner_id = owner_id
    const existingCategory = await this.getCategoryById(owner_id, category_id);

    if (!existingCategory) {
      throw new Error(
        `Category with ID "${category_id.toString()}" not found for owner ${owner_id.toString()}.`,
      );
    }

    // Requires: has_labels_in_category = false
    if (has_labels_in_category) {
      throw new Error(
        `Cannot delete category "${category_id.toString()}" because it is referenced by existing labels.`,
      );
    }

    // Effects: removes the category (and its CategoryMetrics)
    // 1. Remove CategoryDoc
    const deleteCategoryResult = await this.categories.deleteOne({
      _id: existingCategory._id,
    });

    if (deleteCategoryResult.deletedCount === 0) {
      // This case should ideally not be reached if `existingCategory` was found.
      throw new Error(
        `Failed to delete category "${category_id.toString()}". Category not found for deletion.`,
      );
    }

    // 2. Remove associated CategoryMetrics
    // Metrics are uniquely identified by owner_id and category_id in their _id composite key.
    await this.categoryMetrics.deleteMany({
      owner_id: owner_id.toString(),
      category_id: category_id.toString(),
    });

    // Returns true if successful
    return { ok: true };
  }
}

```

```typescript
// file: src/concepts/FlashFinance/Category/test-actions/test-op-simple.ts
// deno-lint-ignore no-unversioned-import
import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { CategoryStore, Id, Period } from "../category.ts"; // Adjust path if category.ts is not in the parent directory

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
    console.log(
      `   ✅ Created category with ID: ${categoryToRenameId.toString()}`,
    );

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
    console.log(
      `3. Verifying the renamed category using getCategoryNamesAndOwners...`,
    );
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
    console.log(
      "   ✅ Verified: Category successfully renamed and old name is gone.",
    );

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

// New test for set_metric_total
Deno.test("CategoryStore: set_metric_total action works and enforces requirements", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);

  try {
    const ownerId = Id.from("test_user_metrics_1");
    const categoryName = "Utilities";
    const period1 = Period.from(new Date("2023-01-01T00:00:00Z"), new Date("2023-01-31T23:59:59Z"));
    const period2 = Period.from(new Date("2023-02-01T00:00:00Z"), new Date("2023-02-28T23:59:59Z"));
    const total1 = 150.75;
    const total2 = 200.00;

    // --- Setup: Create a category ---
    console.log(`\n--- Test Set Metric Total Action ---`);
    console.log(`1. Creating category "${categoryName}" for owner "${ownerId.toString()}"...`);
    const { category_id: categoryId } = await store.create(ownerId, categoryName);
    assertExists(categoryId, "Category should be created.");
    console.log(`   ✅ Created category with ID: ${categoryId.toString()}`);

    // --- Action 1: Set a metric for the first time ---
    console.log(`2. Setting metric for period 1 with total ${total1}...`);
    await store.set_metric_total(ownerId, categoryId, period1, total1);
    console.log(`   ✅ Metric set successfully.`);

    // --- Verification 1: Check if the metric exists and has the correct total ---
    console.log(`3. Verifying metric for period 1...`);
    let metric = await store.getCategoryMetric(ownerId, categoryId, period1);
    assertExists(metric, "Metric for period 1 should exist.");
    assertEquals(metric.current_total, total1, "Metric total should match.");
    assertEquals(metric.owner_id, ownerId.toString(), "Metric owner_id should match.");
    assertEquals(metric.category_id, categoryId.toString(), "Metric category_id should match.");
    assertEquals(metric.period_start.toISOString(), period1.startDate.toISOString(), "Metric period start should match.");
    assertEquals(metric.period_end.toISOString(), period1.endDate.toISOString(), "Metric period end should match.");
    console.log(`   ✅ Verified: Metric for period 1 found with correct total.`);

    // --- Action 2: Update the metric for the same period ---
    console.log(`4. Updating metric for period 1 with new total ${total2}...`);
    await store.set_metric_total(ownerId, categoryId, period1, total2);
    console.log(`   ✅ Metric updated successfully.`);

    // --- Verification 2: Check if the metric is updated ---
    console.log(`5. Verifying updated metric for period 1...`);
    metric = await store.getCategoryMetric(ownerId, categoryId, period1);
    assertExists(metric, "Metric for period 1 should still exist after update.");
    assertEquals(metric.current_total, total2, "Metric total should be updated.");
    console.log(`   ✅ Verified: Metric for period 1 updated to new total.`);

    // --- Action 3: Set a metric for a different period ---
    console.log(`6. Setting metric for period 2 with total ${total1}...`);
    await store.set_metric_total(ownerId, categoryId, period2, total1);
    console.log(`   ✅ Metric for period 2 set successfully.`);

    // --- Verification 3: Check if the new metric exists ---
    console.log(`7. Verifying metric for period 2...`);
    metric = await store.getCategoryMetric(ownerId, categoryId, period2);
    assertExists(metric, "Metric for period 2 should exist.");
    assertEquals(metric.current_total, total1, "Metric total for period 2 should match.");
    console.log(`   ✅ Verified: Metric for period 2 found.`);


    // --- Negative Test 1: Attempt to set metric for a non-existent category ---
    console.log(`\n8. Negative Test: Attempting to set metric for a non-existent category...`);
    const nonExistentCategoryId = Id.from("non_existent_cat_id");
    await assertRejects(
      async () => {
        await store.set_metric_total(ownerId, nonExistentCategoryId, period1, 50.00);
      },
      Error,
      `Category with ID "${nonExistentCategoryId.toString()}" not found for owner ${ownerId.toString()}.`,
      "Should reject setting metric for a non-existent category.",
    );
    console.log(`   ✅ Verified: Setting metric for non-existent category was correctly rejected.`);

    // --- Negative Test 2: Attempt to set metric with negative total ---
    console.log(`\n9. Negative Test: Attempting to set metric with negative total...`);
    await assertRejects(
      async () => {
        await store.set_metric_total(ownerId, categoryId, period1, -10.00);
      },
      Error,
      "Category metric total cannot be negative.",
      "Should reject setting metric with a negative total.",
    );
    console.log(`   ✅ Verified: Setting metric with negative total was correctly rejected.`);

  } finally {
    await client.close();
    console.log("Database client closed.");
  }
});


// New test for delete action
Deno.test("CategoryStore: delete action works and enforces requirements", async () => {
  const [db, client] = await testDb();
  const store = new CategoryStore(db);

  try {
    const ownerId1 = Id.from("test_user_delete_1");
    const ownerId2 = Id.from("test_user_delete_2"); // For cross-user tests
    const categoryName1 = "Rent";
    const categoryName2 = "Donations";
    const categoryName3 = "Savings";
    const period = Period.from(new Date("2023-03-01T00:00:00Z"), new Date("2023-03-31T23:59:59Z"));

    // --- Setup: Create categories for deletion tests ---
    console.log(`\n--- Test Delete Action ---`);
    console.log(`1. Creating categories for owner ${ownerId1.toString()}...`);
    const { category_id: rentCategoryId } = await store.create(ownerId1, categoryName1);
    const { category_id: donationsCategoryId } = await store.create(ownerId1, categoryName2);
    const { category_id: savingsCategoryId } = await store.create(ownerId1, categoryName3);
    assertExists(rentCategoryId, "Rent category should be created.");
    assertExists(donationsCategoryId, "Donations category should be created.");
    assertExists(savingsCategoryId, "Savings category should be created.");
    console.log(`   ✅ Categories created: ${rentCategoryId.toString()}, ${donationsCategoryId.toString()}, ${savingsCategoryId.toString()}`);

    // Add a metric to 'Donations' category for owner1 to test metric deletion
    await store.set_metric_total(ownerId1, donationsCategoryId, period, 50.00);
    let metric = await store.getCategoryMetric(ownerId1, donationsCategoryId, period);
    assertExists(metric, "Metric for Donations category should exist.");
    console.log(`   ✅ Metric added to Donations category.`);

    // Create a category for owner2 to test cross-user deletion failure
    const { category_id: owner2CategoryId } = await store.create(ownerId2, "Owner2Category");
    assertExists(owner2CategoryId, "Owner2 category should be created.");
    console.log(`   ✅ Category created for owner ${ownerId2.toString()}: ${owner2CategoryId.toString()}`);

    // --- Action 1: Successful deletion of a category without metrics ---
    console.log(`\n2. Deleting "${categoryName1}" (ID: ${rentCategoryId.toString()}) without labels...`);
    const deleteResult1 = await store.delete(ownerId1, rentCategoryId, false);
    assertEquals(deleteResult1.ok, true, "Deletion should return true.");
    console.log(`   ✅ Deletion of "${categoryName1}" successful.`);

    // --- Verification 1: Check if category is gone ---
    console.log(`3. Verifying "${categoryName1}" is deleted...`);
    const categoriesAfterDelete1 = await store.getCategoryNamesAndOwners();
    assertEquals(
      categoriesAfterDelete1.some((c) => c.name === categoryName1 && c.owner_id.toString() === ownerId1.toString()),
      false,
      "Deleted category 'Rent' should no longer exist.",
    );
    // Ensure no metrics for this category were accidentally created/remain
    const rentMetric = await store.getCategoryMetric(ownerId1, rentCategoryId, period);
    assertEquals(rentMetric, null, "No metric should exist for the deleted 'Rent' category.");
    console.log(`   ✅ Verified: "${categoryName1}" and its (non-existent) metrics are gone.`);

    // --- Action 2: Successful deletion of a category with metrics ---
    console.log(`\n4. Deleting "${categoryName2}" (ID: ${donationsCategoryId.toString()}) with metrics and without labels...`);
    const deleteResult2 = await store.delete(ownerId1, donationsCategoryId, false);
    assertEquals(deleteResult2.ok, true, "Deletion should return true.");
    console.log(`   ✅ Deletion of "${categoryName2}" successful.`);

    // --- Verification 2: Check if category and its metrics are gone ---
    console.log(`5. Verifying "${categoryName2}" and its metrics are deleted...`);
    const categoriesAfterDelete2 = await store.getCategoryNamesAndOwners();
    assertEquals(
      categoriesAfterDelete2.some((c) => c.name === categoryName2 && c.owner_id.toString() === ownerId1.toString()),
      false,
      "Deleted category 'Donations' should no longer exist.",
    );
    const donationsMetric = await store.getCategoryMetric(ownerId1, donationsCategoryId, period);
    assertEquals(donationsMetric, null, "Metric for 'Donations' category should be deleted.");
    console.log(`   ✅ Verified: "${categoryName2}" and its metrics are gone.`);

    // --- Negative Test 1: Attempt to delete a non-existent category ---
    console.log(`\n6. Negative Test: Attempting to delete a non-existent category...`);
    const nonExistentId = Id.from("non_existent_cat_id_for_delete");
    await assertRejects(
      async () => {
        await store.delete(ownerId1, nonExistentId, false);
      },
      Error,
      `Category with ID "${nonExistentId.toString()}" not found for owner ${ownerId1.toString()}.`,
      "Should reject deleting a non-existent category.",
    );
    console.log(`   ✅ Verified: Deleting a non-existent category was correctly rejected.`);

    // --- Negative Test 2: Attempt to delete another user's category ---
    console.log(`\n7. Negative Test: Attempting to delete another user's category...`);
    await assertRejects(
      async () => {
        // Try to delete owner2's category using ownerId1
        await store.delete(ownerId1, owner2CategoryId, false);
      },
      Error,
      `Category with ID "${owner2CategoryId.toString()}" not found for owner ${ownerId1.toString()}.`, // Expecting not found for owner1
      "Should reject deleting another user's category.",
    );
    console.log(`   ✅ Verified: Deleting another user's category was correctly rejected.`);

    // --- Negative Test 3: Attempt to delete a category with existing labels (has_labels_in_category = true) ---
    console.log(`\n8. Negative Test: Attempting to delete "${categoryName3}" with existing labels...`);
    await assertRejects(
      async () => {
        await store.delete(ownerId1, savingsCategoryId, true); // Simulate labels existing
      },
      Error,
      `Cannot delete category "${savingsCategoryId.toString()}" because it is referenced by existing labels.`,
      "Should reject deleting a category when has_labels_in_category is true.",
    );
    console.log(`   ✅ Verified: Deleting category with existing labels was correctly rejected.`);

    // Ensure savings category still exists after failed deletion attempt
    const savingsCategoryAfterFailedDelete = await store.getCategoryNamesAndOwners();
    assertEquals(
      savingsCategoryAfterFailedDelete.some((c) => c.name === categoryName3 && c.owner_id.toString() === ownerId1.toString()),
      true,
      "Savings category should still exist after failed deletion attempt.",
    );
    console.log(`   ✅ Verified: "${categoryName3}" still exists after blocked deletion.`);

  } finally {
    await client.close();
    console.log("Database client closed.");
  }
});

```
