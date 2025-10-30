---
timestamp: 'Fri Oct 17 2025 22:56:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_225649.0ee0f07e.md]]'
content_id: 81c7a53ab13c24f436c5222fd4679caf8906ef07818ebc84d51f1b9bede7b7fd
---

# response:

```typescript
// deno-lint-ignore no-unversioned-import
import { Collection, Db } from "npm:mongodb";

// Id class copied from label.ts as per instructions
export class Id {
  private constructor(private value: string) {}

  static from(value: string): Id {
    return new Id(value);
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
export type CategoryDoc = {
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
export type CategoryMetricDoc = {
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

  /**
   * Retrieves a category by its ID for a specific owner.
   * @param owner_id The ID of the owner.
   * @param category_id The ID of the category.
   * @returns The CategoryDoc if found, otherwise null.
   */
  async getCategoryById(owner_id: Id, category_id: Id): Promise<CategoryDoc | null> {
    return await this.categories.findOne({
      _id: this.makeCategoryKey(owner_id, category_id),
      owner_id: owner_id.toString(),
      category_id: category_id.toString(),
    });
  }

  /**
   * Retrieves a category by its name for a specific owner.
   * @param owner_id The ID of the owner.
   * @param name The name of the category.
   * @returns The CategoryDoc if found, otherwise null.
   */
  async getCategoryByName(owner_id: Id, name: string): Promise<CategoryDoc | null> {
    return await this.categories.findOne({
      owner_id: owner_id.toString(),
      name: name.trim(), // Use trimmed name for consistent lookup
    });
  }

  /**
   * Creates a new category for a given owner with the specified name.
   *
   * @param owner_id The ID of the user creating the category.
   * @param name The name of the new category.
   * @returns An object containing the ID of the newly created category.
   * @throws Error if the category name is empty or if a category with the same name already exists for the owner.
   * @requires user owner_id exists (this is an external requirement, not enforced by this method).
   */
  async create(owner_id: Id, name: string): Promise<{ category_id: Id }> {
    // 1. Validate name
    if (!name || name.trim() === "") {
      throw new Error("Category name cannot be empty.");
    }
    const trimmedName = name.trim();

    // 2. Check requirements: for the same owner_id, no existing category with same name
    const existingCategory = await this.getCategoryByName(owner_id, trimmedName);
    if (existingCategory) {
      throw new Error(
        `Category with name '${trimmedName}' already exists for owner ${owner_id.toString()}.`,
      );
    }

    // 3. Generate a new unique category_id
    // This upholds the invariant: category_id is unique for the same user
    let newCategoryId: Id;
    let categoryIdStr: string;
    let categoryKey: string;
    const MAX_ATTEMPTS = 5; // To prevent infinite loop in case of extremely rare UUID collisions

    for (let attemptCount = 0; attemptCount < MAX_ATTEMPTS; attemptCount++) {
      newCategoryId = Id.from(crypto.randomUUID()); // Deno's native crypto for UUID generation
      categoryIdStr = newCategoryId.toString();
      categoryKey = this.makeCategoryKey(owner_id, newCategoryId);

      // Check if this generated category_id already exists for this owner
      const existingById = await this.getCategoryById(owner_id, newCategoryId);
      if (!existingById) {
        // ID is unique, break and proceed
        break;
      }
      if (attemptCount === MAX_ATTEMPTS - 1) {
        throw new Error(
          "Failed to generate a unique category ID after multiple attempts.",
        );
      }
    }
    // Check if newCategoryId was successfully assigned (should always be due to throw above)
    if (!newCategoryId!) {
        throw new Error("Internal error: category ID generation failed.");
    }


    // 4. Create and store the new CategoryDoc
    const categoryDoc: CategoryDoc = {
      _id: categoryKey, // Composite key for owner_id and category_id
      owner_id: owner_id.toString(),
      category_id: categoryIdStr,
      name: trimmedName,
    };

    await this.categories.insertOne(categoryDoc);

    // 5. Return the new category_id
    return { category_id: newCategoryId };
  }
}

```
