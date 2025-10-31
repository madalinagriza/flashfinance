---
timestamp: 'Tue Oct 28 2025 20:58:38 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251028_205838.b7dac12c.md]]'
content_id: 316197a2f758a87b8b38be6ce4a0517745fa80c31724a4d7f9897df6ceb98185
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
 * The _id field uniquely identifies the metric bucket for a user + category.
 * Invariants:
 * - (owner_id, category_id) uniquely identifies a CategoryMetricDoc
 * - Each transaction entry is unique by tx_id within the document
 * - Transaction amounts are nonnegative
 */
type CategoryMetricEntry = {
  tx_id: string;
  amount: number;
  tx_date: Date;
};

type CategoryMetricDoc = {
  _id: string; // Composite key: `${owner_id.toString()}:${category_id.toString()}`
  owner_id: string;
  category_id: string;
  transactions: CategoryMetricEntry[];
  updated_at: Date;
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
  private makeCategoryMetricKey(owner_id: Id, category_id: Id): string {
    return `${owner_id.toString()}:${category_id.toString()}`;
  }

  async create(owner_id: Id, name: string): Promise<{ category_id: Id }>;
  async create(
    payload: { owner_id: Id; name: string },
  ): Promise<{ category_id: Id }>;
  async create(
    a: Id | { owner_id: Id; name: unknown },
    b?: string,
  ): Promise<{ category_id: Id }> {
    // narrow both styles
    const owner_id = a instanceof Id ? a : a.owner_id;
    const name = a instanceof Id ? String(b) : String(a.name);

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
  ): Promise<{ category_id: Id }>;
  async rename(payload: {
    owner_id: Id;
    category_id: Id;
    new_name: string;
  }): Promise<{ category_id: Id }>;
  async rename(
    a: Id | { owner_id: Id; category_id: Id; new_name: unknown },
    b?: Id,
    c?: string,
  ): Promise<{ category_id: Id }> {
    // narrow both styles
    const owner_id = a instanceof Id ? a : a.owner_id;
    const category_id = a instanceof Id ? b! : a.category_id;
    const new_name = a instanceof Id ? String(c) : String(a.new_name);

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
    Array<{ category_id: string; name: string; owner_id: string }>
  > {
    const docs = await this.categories.find({})
      .project({ category_id: 1, name: 1, owner_id: 1, _id: 0 })
      .toArray();

    return docs.map((doc) => ({
      category_id: String(doc.category_id),
      name: String(doc.name),
      owner_id: String(doc.owner_id),
    }));
  }

  /**
   * Return the category name for a given owner_id and category_id.
   * owner_id is required. Throws if the category is not found for that owner.
   */
  async getCategoryNameById(owner_id: Id, category_id: Id): Promise<string>;
  async getCategoryNameById(payload: {
    owner_id: Id;
    category_id: Id;
  }): Promise<string>;
  async getCategoryNameById(
    a: Id | { owner_id: Id; category_id: Id },
    b?: Id,
  ): Promise<string> {
    // narrow both styles
    const owner_id = a instanceof Id ? a : a.owner_id;
    const category_id = a instanceof Id ? b! : a.category_id;

    const doc = await this.getCategoryById(owner_id, category_id);
    if (!doc) {
      throw new Error(
        `Category with ID "${category_id.toString()}" not found for owner ${owner_id.toString()}.`,
      );
    }
    return doc.name;
  }

  async getCategoriesFromOwner(owner_id: Id): Promise<Id[]>;
  async getCategoriesFromOwner(payload: { owner_id: Id }): Promise<Id[]>;
  async getCategoriesFromOwner(
    a: Id | { owner_id: Id },
  ): Promise<Id[]> {
    const owner_id = a instanceof Id ? a : a.owner_id;
    const docs = await this.categories.find({
      owner_id: owner_id.toString(),
    })
      .project({ category_id: 1, _id: 0 })
      .toArray();

    return docs.map((doc) => Id.from(doc.category_id));
  }

  private async ensureMetricDocument(
    owner_id: Id,
    category_id: Id,
  ): Promise<CategoryMetricDoc> {
    const metricKey = this.makeCategoryMetricKey(owner_id, category_id);
    const existing = await this.categoryMetrics.findOne({ _id: metricKey });
    if (existing) return existing;

    const newDoc: CategoryMetricDoc = {
      _id: metricKey,
      owner_id: owner_id.toString(),
      category_id: category_id.toString(),
      transactions: [],
      updated_at: new Date(),
    };

    try {
      await this.categoryMetrics.insertOne(newDoc);
      return newDoc;
    } catch (error) {
      // If insertion failed because another insert raced, fetch the document again
      const fallback = await this.categoryMetrics.findOne({ _id: metricKey });
      if (fallback) return fallback;
      throw error;
    }
  }

  /** Adds a transaction record to the user/category metric bucket. */
  async addTransaction(
    owner_id: Id,
    category_id: Id,
    tx_id: Id,
    amount: number,
    tx_date: Date,
  ): Promise<{ ok: boolean }>;
  async addTransaction(payload: {
    owner_id: Id;
    category_id: Id;
    tx_id: Id;
    amount: number;
    tx_date: Date;
  }): Promise<{ ok: boolean }>;
  async addTransaction(
    a:
      | Id
      | {
        owner_id: Id;
        category_id: Id;
        tx_id: Id;
        amount: number;
        tx_date: Date;
      },
    b?: Id,
    c?: Id,
    d?: number,
    e?: Date,
  ): Promise<{ ok: boolean }> {
    const owner_id = a instanceof Id ? a : a.owner_id;
    const category_id = a instanceof Id ? b! : a.category_id;
    const tx_id = a instanceof Id ? c! : a.tx_id;
    const amount = a instanceof Id ? Number(d) : Number(a.amount);
    const tx_date = a instanceof Id ? e! : a.tx_date;

    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("Transaction amount must be a nonnegative finite number.");
    }

    const txDate = tx_date instanceof Date ? tx_date : new Date(tx_date);
    if (Number.isNaN(txDate.getTime())) {
      throw new Error("Invalid transaction date provided.");
    }

    const existingCategory = await this.getCategoryById(owner_id, category_id);
    if (!existingCategory) {
      throw new Error("Cannot record metric: category not found.");
    }

    const metricDoc = await this.ensureMetricDocument(owner_id, category_id);
    const txIdStr = tx_id.toString();

    if (metricDoc.transactions.some((entry) => entry.tx_id === txIdStr)) {
      throw new Error(
        `Transaction ${txIdStr} is already recorded for category ${category_id.toString()}.`,
      );
    }

    const entry: CategoryMetricEntry = {
      tx_id: txIdStr,
      amount,
      tx_date: txDate,
    };

    await this.categoryMetrics.updateOne(
      { _id: metricDoc._id },
      {
        $push: { transactions: entry },
        $set: { updated_at: new Date() },
      },
    );

    return { ok: true };
  }

  /** Removes a transaction record from the metric bucket. */
  async removeTransaction(
    owner_id: Id,
    category_id: Id,
    tx_id: Id,
  ): Promise<{ ok: boolean }>;
  async removeTransaction(payload: {
    owner_id: Id;
    category_id: Id;
    tx_id: Id;
  }): Promise<{ ok: boolean }>;
  async removeTransaction(
    a: Id | { owner_id: Id; category_id: Id; tx_id: Id },
    b?: Id,
    c?: Id,
  ): Promise<{ ok: boolean }> {
    const owner_id = a instanceof Id ? a : a.owner_id;
    const category_id = a instanceof Id ? b! : a.category_id;
    const tx_id = a instanceof Id ? c! : a.tx_id;

    const metricKey = this.makeCategoryMetricKey(owner_id, category_id);
    const metricDoc = await this.categoryMetrics.findOne({ _id: metricKey });
    if (!metricDoc) {
      throw new Error("Metric bucket not found for removal.");
    }

    const txIdStr = tx_id.toString();
    const filtered = metricDoc.transactions.filter((entry) => entry.tx_id !== txIdStr);
    if (filtered.length === metricDoc.transactions.length) {
      throw new Error(
        `Transaction ${txIdStr} is not recorded for category ${category_id.toString()}.`,
      );
    }

    await this.categoryMetrics.updateOne(
      { _id: metricKey },
      {
        $set: {
          transactions: filtered,
          updated_at: new Date(),
        },
      },
    );

    return { ok: true };
  }

  /** Lists all transaction entries recorded for the user/category pair. */
  async listTransactions(
    owner_id: Id,
    category_id: Id,
  ): Promise<CategoryMetricEntry[]>;
  async listTransactions(payload: {
    owner_id: Id;
    category_id: Id;
  }): Promise<CategoryMetricEntry[]>;
  async listTransactions(
    a: Id | { owner_id: Id; category_id: Id },
    b?: Id,
  ): Promise<CategoryMetricEntry[]> {
    const owner_id = a instanceof Id ? a : a.owner_id;
    const category_id = a instanceof Id ? b! : a.category_id;
    const metricKey = this.makeCategoryMetricKey(owner_id, category_id);

    const metricDoc = await this.categoryMetrics.findOne({ _id: metricKey });
    if (!metricDoc) return [];
    return metricDoc.transactions;
  }

  /**
   * Computes totals and an average-per-day for the transactions that fall within the provided period.
   */
  async getMetricStats(
    owner_id: Id,
    category_id: Id,
    period: Period,
  ): Promise<{ total_amount: number; transaction_count: number; average_per_day: number; days: number }>;
  async getMetricStats(payload: {
    owner_id: Id;
    category_id: Id;
    period: Period;
  }): Promise<{ total_amount: number; transaction_count: number; average_per_day: number; days: number }>;
  async getMetricStats(
    a: Id | { owner_id: Id; category_id: Id; period: Period },
    b?: Id,
    c?: Period,
  ): Promise<{ total_amount: number; transaction_count: number; average_per_day: number; days: number }> {
    const owner_id = a instanceof Id ? a : a.owner_id;
    const category_id = a instanceof Id ? b! : a.category_id;
    const period = a instanceof Id ? c! : a.period;

    const metricKey = this.makeCategoryMetricKey(owner_id, category_id);
    const metricDoc = await this.categoryMetrics.findOne({ _id: metricKey });
    if (!metricDoc || metricDoc.transactions.length === 0) {
      return { total_amount: 0, transaction_count: 0, average_per_day: 0, days: this.daysInPeriod(period) };
    }

    const startMs = period.startDate.getTime();
    const endMs = period.endDate.getTime();

    const relevant = metricDoc.transactions.filter((entry) => {
      const entryTime = entry.tx_date instanceof Date
        ? entry.tx_date.getTime()
        : new Date(entry.tx_date).getTime();
      return entryTime >= startMs && entryTime <= endMs;
    });

    if (relevant.length === 0) {
      return { total_amount: 0, transaction_count: 0, average_per_day: 0, days: this.daysInPeriod(period) };
    }

    const total = relevant.reduce((sum, entry) => sum + entry.amount, 0);
    const days = this.daysInPeriod(period);
    const average = total / days;

    return {
      total_amount: total,
      transaction_count: relevant.length,
      average_per_day: average,
      days,
    };
  }

  private daysInPeriod(period: Period): number {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const diffMs = period.endDate.getTime() - period.startDate.getTime();
    return Math.max(1, Math.floor(diffMs / MS_PER_DAY) + 1);
  }

  /**
   * Deletes all CategoryMetrics associated with a specific category.
   * Returns the number of deleted metrics.
   */
  async deleteMetricsForCategory(
    owner_id: Id,
    category_id: Id,
  ): Promise<number>;
  async deleteMetricsForCategory(payload: {
    owner_id: Id;
    category_id: Id;
  }): Promise<number>;
  async deleteMetricsForCategory(
    a: Id | { owner_id: Id; category_id: Id },
    b?: Id,
  ): Promise<number> {
    // narrow both styles
    const owner_id = a instanceof Id ? a : a.owner_id;
    const category_id = a instanceof Id ? b! : a.category_id;

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
  ): Promise<{ ok: boolean }>;
  async delete(payload: {
    owner_id: Id;
    category_id: Id;
    can_delete: boolean;
  }): Promise<{ ok: boolean }>;
  async delete(
    a: Id | { owner_id: Id; category_id: Id; can_delete: unknown },
    b?: Id,
    c?: boolean,
  ): Promise<{ ok: boolean }> {
    // narrow both styles
    const owner_id = a instanceof Id ? a : a.owner_id;
    const category_id = a instanceof Id ? b! : a.category_id;
    const can_delete = a instanceof Id ? Boolean(c) : Boolean(a.can_delete);

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

> **discard**(user\_id : ID, tx\_id : ID, tx\_name : String, tx\_merchant : String)  : (label\_tx\_id : ID)
>
> > *requires:*
> > no committed label exists for `tx_id`;  no stagedLabel with ID tx\_id.
> > *effects:*\
> > creates a StagedLabel for this user and transaction, assigning it to the built-in **Trash** category.

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
