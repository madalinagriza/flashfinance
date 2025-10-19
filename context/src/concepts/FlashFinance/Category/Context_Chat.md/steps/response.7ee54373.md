---
timestamp: 'Fri Oct 17 2025 23:04:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_230437.e2c58bc7.md]]'
content_id: 7ee54373715a42746ff236af29039c89965943d5a634452c760aa9b2b84ea8e1
---

# response:

To add a helper function that returns category information, we'll introduce a public `Category` interface that represents the full category concept, and then implement a `getCategory` method in the `CategoryStore`. This method will fetch a `CategoryDoc` from the database and transform it into the `Category` interface.

Here's the updated `src/concepts/FlashFinance/Category/category.ts` file:

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
 * Represents the public-facing Category information.
 * This aligns with the concept: Category[ID, Period], but without the period
 * as this specific helper is for the category definition itself.
 */
export interface Category {
  id: Id; // The unique ID of the category (category_id in concept)
  ownerId: Id; // The ID of the user who owns this category (owner_id in concept)
  name: string; // The user-defined name of the category
}

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

  /**
   * Retrieves category information by owner_id and category_id.
   * This helper function returns the full category definition.
   *
   * @param owner_id The ID of the owner.
   * @param category_id The ID of the category.
   * @returns A `Category` object if found, otherwise `null`.
   */
  async getCategory(owner_id: Id, category_id: Id): Promise<Category | null> {
    // Construct the unique document ID using the helper
    const docId = this.makeCategoryKey(owner_id, category_id);

    // Find the category document in the collection
    const categoryDoc = await this.categories.findOne({ _id: docId });

    // If no document is found, return null
    if (!categoryDoc) {
      return null;
    }

    // Transform the internal CategoryDoc into the public Category interface
    return {
      id: Id.from(categoryDoc.category_id),
      ownerId: Id.from(categoryDoc.owner_id),
      name: categoryDoc.name,
    };
  }
}
```
