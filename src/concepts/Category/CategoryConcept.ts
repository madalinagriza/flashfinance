import { Collection, Db } from "mongodb";

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
const TRASH_CATEGORY_ID = Id.from("TRASH_CATEGORY");

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

type BulkTransactionEntry = {
  category_id: string;
  tx_id: string;
  amount: number;
  tx_date: Date | string;
};

type MetricStats = {
  total_amount: number;
  transaction_count: number;
  average_per_day: number;
  days: number;
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

  async create(owner_id: Id, name: string): Promise<{ category_id: Id }>;
  async create(
    payload: { owner_id: string; name: string },
  ): Promise<{ category_id: Id }>;
  async create(
    a: Id | { owner_id: string; name: unknown },
    b?: string,
  ): Promise<{ category_id: Id }> {
    // narrow both styles
    const owner_id = a instanceof Id ? a : Id.from(String(a.owner_id));
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
    owner_id: string;
    category_id: string;
    new_name: string;
  }): Promise<{ category_id: Id }>;
  async rename(
    a: Id | { owner_id: string; category_id: string; new_name: unknown },
    b?: Id,
    c?: string,
  ): Promise<{ category_id: Id }> {
    // narrow both styles
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_id);
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
    owner_id: string;
    category_id: string;
  }): Promise<string>;
  async getCategoryNameById(
    a: Id | { owner_id: string; category_id: string },
    b?: Id,
  ): Promise<string> {
    // narrow both styles
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_id);

    const doc = await this.getCategoryById(owner_id, category_id);
    if (!doc) {
      throw new Error(
        `Category with ID "${category_id.toString()}" not found for owner ${owner_id.toString()}.`,
      );
    }
    return doc.name;
  }

  // async getCategoriesFromOwner(owner_id: Id): Promise<Id[]>;
  // async getCategoriesFromOwner(payload: { owner_id: string }): Promise<Id[]>;
  // async getCategoriesFromOwner(
  //   a: Id | { owner_id: string },
  // ): Promise<Id[]> {
  //   const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
  //   const docs = await this.categories.find({
  //     owner_id: owner_id.toString(),
  //   })
  //     .project({ category_id: 1, _id: 0 })
  //     .toArray();

  //   return docs.map((doc) => Id.from(doc.category_id));
  // }

  /**
   * Query to get all categories (ID and name) for a given owner.
   * This is a query method, intended for use in synchronizations.
   */
  async getCategoriesFromOwner(
    { owner_id }: { owner_id: string | Id },
  ): Promise<{ category_id: string; name: string }[]> {
    const ownerIdStr = owner_id.toString();
    const docs = await this.categories.find({ owner_id: ownerIdStr })
      .project({ category_id: 1, name: 1, _id: 0 })
      .toArray();

    return docs.map((doc) => ({
      category_id: doc.category_id,
      name: doc.name,
    }));
  }

  private async ensureMetricDocument(
    owner_id: Id,
    category_id: Id,
  ): Promise<CategoryMetricDoc> {
    const metricKey = `${owner_id.toString()}:${category_id.toString()}`;
    const existing = await this.categoryMetrics.findOne({ _id: metricKey });
    if (existing) {
      return existing;
    }

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
      const fallback = await this.categoryMetrics.findOne({ _id: metricKey });
      if (fallback) {
        return fallback;
      }
      throw error;
    }
  }

  async addTransaction(
    owner_id: Id,
    category_id: Id,
    tx_id: Id,
    amount: number,
    tx_date: Date,
  ): Promise<{ ok: boolean }>;
  async addTransaction(payload: {
    owner_id: string;
    category_id: string;
    tx_id: string;
    amount: number;
    tx_date: string | Date;
  }): Promise<{ ok: boolean }>;
  async addTransaction(
    a:
      | Id
      | {
        owner_id: string;
        category_id: string;
        tx_id: string;
        amount: number;
        tx_date: string | Date;
      },
    b?: Id,
    c?: Id,
    d?: number,
    e?: Date,
  ): Promise<{ ok: boolean }> {
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_id);
    const tx_id = a instanceof Id ? c! : Id.from(a.tx_id);
    const amount = a instanceof Id ? Number(d) : Number(a.amount);
    const rawDate = a instanceof Id ? e : a.tx_date;

    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(
        "Transaction amount must be a nonnegative finite number.",
      );
    }

    if (!rawDate) {
      throw new Error("Transaction date is required.");
    }

    const txDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (Number.isNaN(txDate.getTime())) {
      throw new Error("Invalid transaction date provided.");
    }

    let existingCategory = await this.getCategoryById(owner_id, category_id);
    if (!existingCategory) {
      // If the category doesn't exist, check if it's the special Trash category.
      if (category_id.toString() === TRASH_CATEGORY_ID.toString()) {
        // Lazily create the Trash category for this user.
        const trashKey = this.makeCategoryKey(owner_id, TRASH_CATEGORY_ID);
        const trashDoc: CategoryDoc = {
          _id: trashKey,
          owner_id: owner_id.toString(),
          category_id: TRASH_CATEGORY_ID.toString(),
          name: "Trash",
        };
        await this.categories.updateOne(
          { _id: trashKey },
          { $setOnInsert: trashDoc },
          { upsert: true },
        );
        // After creating it, we can proceed as if it existed.
      } else {
        // If it's not the Trash category, then it's an error.
        throw new Error(
          `Cannot record metric: category with ID ${category_id.toString()} not found.`,
        );
      }
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
  /**
   * Implements a bulk 'addTransaction' action by calling `addTransaction` in parallel.
   * Adds multiple transaction metrics to their respective categories.
   *
   * @param owner_id The ID of the user owning the categories and transactions.
   * @param transactions A list of transaction entries to add.
   * @returns A void Promise on success.
   * @throws An Error if any of the individual `addTransaction` calls fail.
   */
  async bulk_add_transaction(
    { owner_id, transactions }: {
      owner_id: string;
      transactions: BulkTransactionEntry[];
    },
  ): Promise<void> {
    if (!transactions || transactions.length === 0) {
      return; // Nothing to do
    }

    const promises = transactions.map((tx) =>
      this.addTransaction({
        owner_id,
        category_id: tx.category_id,
        tx_id: tx.tx_id,
        amount: tx.amount,
        tx_date: tx.tx_date,
      })
    );

    try {
      await Promise.all(promises);
      return;
    } catch (error) {
      console.error("Error during bulk add transaction:", error);
      // Re-throw the error to signal failure of the bulk operation
      throw new Error(
        `One or more transactions failed to be added. First error: ${
          (error as Error).message
        }`,
      );
    }
  }

  async removeTransaction(
    owner_id: Id,
    category_id: Id,
    tx_id: Id,
  ): Promise<{ ok: boolean }>;
  async removeTransaction(payload: {
    owner_id: string;
    category_id: string;
    tx_id: string;
  }): Promise<{ ok: boolean }>;
  async removeTransaction(
    a: Id | { owner_id: string; category_id: string; tx_id: string },
    b?: Id,
    c?: Id,
  ): Promise<{ ok: boolean }> {
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_id);
    const tx_id = a instanceof Id ? c! : Id.from(a.tx_id);

    const metricKey = `${owner_id.toString()}:${category_id.toString()}`;
    const metricDoc = await this.categoryMetrics.findOne({ _id: metricKey });
    if (!metricDoc) {
      throw new Error("Metric bucket not found for removal.");
    }

    const txIdStr = tx_id.toString();
    const filtered = metricDoc.transactions.filter((entry) =>
      entry.tx_id !== txIdStr
    );

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

  /**
   * Moves a transaction from one category to another.
   * This operation finds the transaction in the old category, removes it,
   * and then adds it to the new category.
   *
   * @param owner_id The ID of the user.
   * @param tx_id The ID of the transaction to move.
   * @param old_category_id The source category ID.
   * @param new_category_id The destination category ID.
   * @returns A promise resolving to { ok: true } on success.
   * @throws An error if the transaction or categories are not found, or if the move fails.
   */
  async updateTransaction(
    owner_id: Id,
    tx_id: Id,
    old_category_id: Id,
    new_category_id: Id,
  ): Promise<{ ok: boolean }>;
  async updateTransaction(payload: {
    owner_id: string;
    tx_id: string;
    old_category_id: string;
    new_category_id: string;
  }): Promise<{ ok: boolean }>;
  async updateTransaction(
    a:
      | Id
      | {
        owner_id: string;
        tx_id: string;
        old_category_id: string;
        new_category_id: string;
      },
    b?: Id,
    c?: Id,
    d?: Id,
  ): Promise<{ ok: boolean }> {
    // Narrow arguments from both calling styles
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const tx_id = a instanceof Id ? b! : Id.from(a.tx_id);
    const old_category_id = a instanceof Id ? c! : Id.from(a.old_category_id);
    const new_category_id = a instanceof Id ? d! : Id.from(a.new_category_id);

    // If the category is not changing, the operation is a success.
    if (old_category_id.toString() === new_category_id.toString()) {
      return { ok: true };
    }

    // Find the original transaction to get its details (amount, date).
    const oldMetricKey = `${owner_id.toString()}:${old_category_id.toString()}`;
    const oldMetricDoc = await this.categoryMetrics.findOne({
      _id: oldMetricKey,
    });

    if (!oldMetricDoc) {
      throw new Error(
        `Metric document not found for source category ${old_category_id.toString()}.`,
      );
    }

    const txIdStr = tx_id.toString();
    const transactionToMove = oldMetricDoc.transactions.find(
      (tx) => tx.tx_id === txIdStr,
    );

    if (!transactionToMove) {
      throw new Error(
        `Transaction ${txIdStr} not found in source category ${old_category_id.toString()}.`,
      );
    }

    // Verify destination category exists. addTransaction does this, but failing early is better.
    const newCategory = await this.getCategoryById(owner_id, new_category_id);
    if (!newCategory) {
      throw new Error(
        `Destination category ${new_category_id.toString()} does not exist.`,
      );
    }

    // The core logic: remove from old, then add to new.
    // This is not a true atomic transaction, so we add a rollback mechanism.
    await this.removeTransaction(owner_id, old_category_id, tx_id);

    try {
      await this.addTransaction(
        owner_id,
        new_category_id,
        tx_id,
        transactionToMove.amount,
        transactionToMove.tx_date,
      );
    } catch (error) {
      // If adding to the new category fails, we must roll back by adding the transaction back to the old category.
      console.error(
        `Failed to add transaction ${txIdStr} to new category. Rolling back.`,
        error,
      );
      await this.addTransaction(
        owner_id,
        old_category_id,
        tx_id,
        transactionToMove.amount,
        transactionToMove.tx_date,
      );
      // Rethrow the original error to inform the caller that the update failed.
      throw new Error(
        `Failed to move transaction: ${(error as Error).message}`,
      );
    }

    return { ok: true };
  }

  async moveTransactionToTrash(
    owner_id: Id,
    from_category_id: Id,
    tx_id: Id,
  ): Promise<{ ok: boolean }>;
  async moveTransactionToTrash(payload: {
    owner_id: string;
    from_category_id: string;
    tx_id: string;
  }): Promise<{ ok: boolean }>;
  async moveTransactionToTrash(
    a: Id | { owner_id: string; from_category_id: string; tx_id: string },
    b?: Id,
    c?: Id,
  ): Promise<{ ok: boolean }> {
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const from_category_id = a instanceof Id ? b! : Id.from(a.from_category_id);
    const tx_id = a instanceof Id ? c! : Id.from(a.tx_id);

    const metricKey = `${owner_id.toString()}:${from_category_id.toString()}`;
    const metricDoc = await this.categoryMetrics.findOne({ _id: metricKey });
    if (!metricDoc) {
      throw new Error("Metric bucket not found for move.");
    }

    const txIdStr = tx_id.toString();
    const entry = metricDoc.transactions.find((item) => item.tx_id === txIdStr);
    if (!entry) {
      throw new Error(
        `Transaction ${txIdStr} is not recorded for category ${from_category_id.toString()}.`,
      );
    }

    await this.removeTransaction(owner_id, from_category_id, tx_id);

    const trashKey = this.makeCategoryKey(owner_id, TRASH_CATEGORY_ID);
    const trashDoc = await this.getCategoryById(owner_id, TRASH_CATEGORY_ID);
    if (!trashDoc) {
      const insertDoc: CategoryDoc = {
        _id: trashKey,
        owner_id: owner_id.toString(),
        category_id: TRASH_CATEGORY_ID.toString(),
        name: "Trash",
      };
      await this.categories.updateOne(
        { _id: trashKey },
        { $setOnInsert: insertDoc },
        { upsert: true },
      );
    }

    await this.addTransaction(
      owner_id,
      TRASH_CATEGORY_ID,
      tx_id,
      entry.amount,
      entry.tx_date,
    );

    return { ok: true };
  }

  async listTransactions(
    owner_id: Id,
    category_id: Id,
  ): Promise<CategoryMetricEntry[]>;
  async listTransactions(payload: {
    owner_id: string;
    category_id: string;
  }): Promise<CategoryMetricEntry[]>;
  async listTransactions(
    a: Id | { owner_id: string; category_id: string },
    b?: Id,
  ): Promise<CategoryMetricEntry[]> {
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_id);

    const metricKey = `${owner_id.toString()}:${category_id.toString()}`;
    const metricDoc = await this.categoryMetrics.findOne({ _id: metricKey });
    if (!metricDoc) {
      return [];
    }

    return metricDoc.transactions;
  }

  /**
   * Computes aggregate statistics for metric transactions within a period.
   */
  async getMetricStats(
    owner_id: Id,
    category_id: Id,
    period: Period,
  ): Promise<{ stats: MetricStats }[]>;
  async getMetricStats(payload: {
    owner_id: string;
    category_id: string;
    period: Period | { startDate: string | Date; endDate: string | Date };
  }): Promise<{ stats: MetricStats }[]>;
  async getMetricStats(
    a:
      | Id
      | {
        owner_id: string;
        category_id: string;
        period: Period | { startDate: string | Date; endDate: string | Date };
      },
    b?: Id,
    c?: Period,
  ): Promise<{ stats: MetricStats }[]> {
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_id);

    let period: Period | undefined;
    if (a instanceof Id) {
      period = c;
    } else if (a.period instanceof Period) {
      period = a.period;
    } else if (a.period) {
      const start = a.period.startDate instanceof Date
        ? a.period.startDate
        : new Date(a.period.startDate);
      const end = a.period.endDate instanceof Date
        ? a.period.endDate
        : new Date(a.period.endDate);
      period = Period.from(start, end);
    }

    if (!period) {
      throw new Error("Metric stats lookup requires a period.");
    }

    const metricKey = `${owner_id.toString()}:${category_id.toString()}`;
    const metricDoc = await this.categoryMetrics.findOne({ _id: metricKey });

    const days = this.daysInPeriod(period);

    if (!metricDoc || metricDoc.transactions.length === 0) {
      return [
        {
          stats: {
            total_amount: 0,
            transaction_count: 0,
            average_per_day: 0,
            days,
          },
        },
      ];
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
      return [
        {
          stats: {
            total_amount: 0,
            transaction_count: 0,
            average_per_day: 0,
            days,
          },
        },
      ];
    }

    const total_amount = relevant.reduce((sum, entry) => sum + entry.amount, 0);
    const transaction_count = relevant.length;
    const average_per_day = days > 0 ? total_amount / days : 0;

    return [{
      stats: { total_amount, transaction_count, average_per_day, days },
    }];
  }

  /**
   * Retrieves a specific CategoryMetric document.
   * Returns the document or null if not found.
   */
  async getMetric(
    owner_id: Id,
    category_id: Id,
    period: Period,
  ): Promise<CategoryMetricDoc[]>;
  async getMetric(payload: {
    owner_id: string;
    category_id: string;
    period: Period;
  }): Promise<CategoryMetricDoc[]>;
  async getMetric(
    a: Id | { owner_id: string; category_id: string; period: Period },
    b?: Id,
    c?: Period,
  ): Promise<CategoryMetricDoc[]> {
    // narrow both styles
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_id);
    const period = a instanceof Id ? c! : a.period;

    const metric_id = this.makeCategoryMetricKey(
      owner_id,
      category_id,
      period,
    );
    const doc = await this.categoryMetrics.findOne({ _id: metric_id });
    return doc ? [doc] : [];
  }

  /**
   * Lists all CategoryMetrics for a given owner and category, sorted by period_start ascending.
   */
  async listMetrics(
    owner_id: Id,
    category_id: Id,
  ): Promise<CategoryMetricDoc[]>;
  async listMetrics(payload: {
    owner_id: string;
    category_id: string;
  }): Promise<CategoryMetricDoc[]>;
  async listMetrics(
    a: Id | { owner_id: string; category_id: string },
    b?: Id,
  ): Promise<CategoryMetricDoc[]> {
    // narrow both styles
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_id);

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
  ): Promise<number>;
  async deleteMetricsForCategory(payload: {
    owner_id: string;
    category_id: string;
  }): Promise<number>;
  async deleteMetricsForCategory(
    a: Id | { owner_id: string; category_id: string },
    b?: Id,
  ): Promise<number> {
    // narrow both styles
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_id);

    const deleteResult = await this.categoryMetrics.deleteMany({
      owner_id: owner_id.toString(),
      category_id: category_id.toString(),
    });
    return deleteResult.deletedCount;
  }

  private daysInPeriod(period: Period): number {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const diffMs = period.endDate.getTime() - period.startDate.getTime();
    return Math.max(1, Math.floor(diffMs / MS_PER_DAY) + 1);
  }

  async delete(
    owner_id: Id,
    category_id: Id,
  ): Promise<{ ok: boolean }>;
  async delete(payload: {
    owner_id: string;
    category_id: string;
  }): Promise<{ ok: boolean }>;
  async delete(
    a: Id | { owner_id: string; category_id: string },
    b?: Id,
  ): Promise<{ ok: boolean }> {
    // narrow both styles
    const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_id);

    // Requires: category exists and category.owner_id = owner_id
    const existingCategory = await this.getCategoryById(owner_id, category_id);

    if (!existingCategory) {
      throw new Error(
        `Category with ID "${category_id.toString()}" not found for owner ${owner_id.toString()}.`,
      );
    }

    // Check if the category has any transactions.
    const transactions = await this.listTransactions(owner_id, category_id);
    if (transactions.length > 0) {
      throw new Error(
        `Cannot delete category "${existingCategory.name}" because it contains transactions.`,
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
