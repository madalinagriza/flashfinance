---
timestamp: 'Mon Oct 20 2025 17:48:08 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_174808.82c05cef.md]]'
content_id: b46df68bce3e98b4de3124c0c48eac6a666a03a4a649ee9fa36fed115d50925d
---

# file: src/concepts/Category/CategoryConcept.ts

```typescript
// deno-lint-ignore no-unversioned-import
import { Collection, Db } from "npm:mongodb";

// Id class copied from LabelConcept.ts as per instructions
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

export default class CategoryConcept {
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

  async setMetricTotal(
    owner_id: Id,
    category_id: Id,
    period: Period,
    total: number,
  ): Promise<{ ok: boolean }> {
    // 1. Validate total
    if (total < 0) {
      throw new Error("Metric update failed: total must be nonnegative.");
    }

    // 2. The Period constructor already performs validation (start date cannot be after end date).
    // If `period` is an instance of `Period`, its internal validation covers this.
    // If an invalid Period object was passed in, its constructor would have thrown.

    // 3. Requires: category exists
    const existingCategory = await this.getCategoryById(owner_id, category_id);
    if (!existingCategory) {
      throw new Error("Metric update failed: Category not found.");
    }

    // 4. Upsert CategoryMetric
    const metric_id = this.makeCategoryMetricKey(
      owner_id,
      category_id,
      period,
    );

    const updateDoc: CategoryMetricDoc = {
      _id: metric_id,
      owner_id: owner_id.toString(),
      category_id: category_id.toString(),
      period_start: period.startDate,
      period_end: period.endDate,
      current_total: total,
    };

    await this.categoryMetrics.updateOne(
      { _id: metric_id },
      { $set: updateDoc },
      { upsert: true }, // Create the document if it doesn't exist, otherwise update.
    );

    return { ok: true };
  }

  /**
   * Retrieves a specific CategoryMetric document.
   * Returns the document or null if not found.
   */
  async getMetric(
    owner_id: Id,
    category_id: Id,
    period: Period,
  ): Promise<CategoryMetricDoc | null> {
    const metric_id = this.makeCategoryMetricKey(
      owner_id,
      category_id,
      period,
    );
    return await this.categoryMetrics.findOne({ _id: metric_id });
  }

  /**
   * Lists all CategoryMetrics for a given owner and category, sorted by period_start ascending.
   */
  async listMetrics(
    owner_id: Id,
    category_id: Id,
  ): Promise<CategoryMetricDoc[]> {
    return await this.categoryMetrics.find({
      owner_id: owner_id.toString(),
      category_id: category_id.toString(),
    }).sort({ period_start: 1 }).toArray(); // Sort by period_start ascending
  }

  /**
   * Deletes all CategoryMetrics associated with a specific category.
   * Returns the number of deleted metrics.
   */
  async deleteMetricsForCategory(
    owner_id: Id,
    category_id: Id,
  ): Promise<number> {
    const deleteResult = await this.categoryMetrics.deleteMany({
      owner_id: owner_id.toString(),
      category_id: category_id.toString(),
    });
    return deleteResult.deletedCount;
  }

  async delete(
    owner_id: Id,
    category_id: Id,
    can_delete: boolean,
  ): Promise<{ ok: boolean }> {
    // Requires: category exists and category.owner_id = owner_id
    const existingCategory = await this.getCategoryById(owner_id, category_id);

    if (!existingCategory) {
      throw new Error(
        `Category with ID "${category_id.toString()}" not found for owner ${owner_id.toString()}.`,
      );
    }

    // Requires: has_labels_in_category = false
    if (!can_delete) {
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
    await this.deleteMetricsForCategory(
      owner_id,
      category_id,
    );

    // Returns true if successful
    return { ok: true };
  }
}

```

## Label Concept

Specification:

**concept:** Label\[ID, Timestamp]

**purpose:** record the user's assignment of a specific transaction to a specific category so that spending meaning is explicit and auditable

**principle:** if a user applies a label, the transaction holds exactly one active label at a time; relabeling replaces the previous one. Users may stage labels during a session before confirming them. The system’s AI may suggest labels based on transaction context, but suggestions never change state until confirmed by the user.

***

**state:**

> a set of **Labels** with
>
> > a `tx_id` : ID\
> > a `category_id` : ID\
> > a `user_id` : ID\
> > a `created_at` : Timestamp
>
> a set of **TransactionInfo** with
>
> > a `tx_id` : ID\
> > a `tx_name` : String\
> > a `tx_merchant` : String
>
> a set of **CategoryHistory** with
>
> > a `category_id` : ID\
> > a set of `transactions` : TransactionInfos

> a set of StagedLabels with
>
> > a stagedlabel\_id: ID
> > a user\_id : ID
> > a set of transactions : TransactionInfos

***

**actions:**

***

> **stage**(user\_id : ID, tx\_id : ID, tx\_name : String, tx\_merchant : String, category\_id : ID)  : (label\_tx\_id : ID)
>
> > *requires:*
> > no committed label exists for `tx_id`;  no stagedLabel with ID tx\_id.
> > *effects:*\
> > creates a StagedLabel for this user and transaction with the provided info and category. Adds it to the stagedLabels (that are not yet commited). Returns the created stagedLabel.

***

> **finalize**(user\_id : ID)
>
> > *requires:*\
> > for each StagedLabel belonging to the user:  no committed label exists for `tx_id`\
> > *effects:*\
> > for each StagedLabel belonging to the user
> >
> > > creates a TransactionInfo
> > > creates a new Label linking `tx_id` to `category_id` and `user_id`;\
> > > adds TransactionInfo to CategoryHistory under the chosen category;\
> > > after processing all staged labels, wipes stagedLabels

***

> **cancel**(user\_id : ID)
>
> > *requires:*\
> > true (a user may cancel a pending session at any time)\
> > *effects:*\
> > deletes all StagedLabels for that user;\
> > no modifications to Labels or CategoryHistory

***

> **update**(user\_id : ID, tx\_id : ID, new\_category\_id : ID) : (label\_tx\_id : ID)
>
> > *requires:*\
> > a label for `tx_id` exists; `transaction.owner_id = user_id`;\
> > `new_category_id` exists and `owner_id = user_id`;\
> > TransactionInfo exists with `transactionInfo.id = tx_id`\
> > *effects:*\
> > updates CategoryHistory, associating TransactionInfo with the new category;\
> > replaces the label’s `category_id` with `new_category_id`;\
> > updates `created_at` to now; returns updated label

***

> **remove**(user\_id : ID, tx\_id : ID)
>
> > *requires:*\
> > a label for `tx_id` exists; `transaction.owner_id = user_id`\
> > *effects:*\
> > reassigns the transaction’s label to the user’s built-in **Trash** category;\
> > updates CategoryHistory, associating the transaction with the trash category

***

**invariants:**

* at most one label per tx\_id
* `label.user_id = transaction.owner_id` for the labeled transaction
* a label’s category.owner\_id = label.user\_id
* suggestions do not create or modify labels until the user explicitly applies or updates

***

**significant (non-action) function**

> **suggest**(llm : GeminiLLM, user\_id : ID, allCategories : \[(ID, String)], transactionInfo) : (suggested\_category\_id : ID)
>
> > *requires:*\
> > user has ≥ 1 category\
> > *effects:*\
> > returns a best-guess category\_id from the user’s existing categories for this `tx_id`, highlighted in the UI;\
> > suggested by AI and does **not** alter Labels state

***

**notes on suggest function:**

> suggest has its place somewhere in between the UI and Label concept. I chose to put it here since Label in majority the necessary data for the suggest.\
> In order for the AI to be trained well on good examples, I needed to keep a history of past transactions, as well as give it full info on categories, which is why the data types involved in suggest are more complex.\
> Nevertheless, since suggest doesn't update the Label's state, it's not an action. Therefore, I considered it permissable to involve a little more complexity in the function arguments. For a little more details on the records and arguments needed for suggest:
>
> > catTx is a record used for AI suggestions and later UI. Labels remain the source of truth for what’s currently assigned.  \
> > txInfos carries merchant and name fields since the AI needs them for interpreting.  \
> > txInfos must be passed into `suggest` because suggestions apply to transactions not yet labeled—there’s no existing connection from transaction id -> transaction info within the Label concept.\
> > All categories and their names must be passed in since we may not have a full record of categories through past labeling (say we never assgined to the category "Restaurants" but it's still a valid suggestion)

Implementation:
