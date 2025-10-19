---
timestamp: 'Sat Oct 18 2025 16:21:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_162145.d5ba0a76.md]]'
content_id: 174e3d5cf6d9f2a3b843b1fbcb96f642ee2c567c3808d1969c5de64bb2a0d2f0
---

# file: src/concepts/FlashFinance/Category/category.ts

```typescript
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
    // but an explicit check reinforces the principle.
    if (existingCategory.owner_id !== owner_id.toString()) {
      throw new Error(
        `Category with ID "${category_id.toString()}" does not belong to owner ${owner_id.toString()}.`,
      );
    }

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
