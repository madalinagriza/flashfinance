---
timestamp: 'Sat Oct 18 2025 12:22:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_122237.85d11764.md]]'
content_id: f598d9bc622028d6e3f852dc6ac6ffe1cf81f16c98e72c0c9f72e4bc176ce28d
---

# response:

### `src/concepts/FlashFinance/Category/category.ts`

```typescript
// deno-lint-ignore no-unversioned-import
import { Collection, Db } from "npm:mongodb";
import { LabelStore } from "../Label/label.ts"; // Import LabelStore to check for label references

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
 * Public interface for a Category, used in action signatures.
 */
export interface Category {
  id: Id;
  ownerId: Id;
  name: string;
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
  private labelStore: LabelStore; // Injected LabelStore for cross-concept checks

  constructor(private readonly db: Db, labelStore: LabelStore) {
    this.categories = db.collection(PREFIX + "categories");
    this.categoryMetrics = db.collection(PREFIX + "category_metrics");
    this.labelStore = labelStore;
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
   * Private getter to retrieve the raw CategoryDoc from the database.
   */
  private async getCategoryDocById(
    owner_id: Id,
    category_id: Id,
  ): Promise<CategoryDoc | null> {
    return await this.categories.findOne({
      _id: this.makeCategoryKey(owner_id, category_id),
    });
  }

  /**
   * Public getter to retrieve a Category object by its ID and owner.
   * Returns null if not found.
   */
  async getCategory(owner_id: Id, category_id: Id): Promise<Category | null> {
    const doc = await this.getCategoryDocById(owner_id, category_id);
    if (!doc) {
      return null;
    }
    return {
      id: Id.from(doc.category_id),
      ownerId: Id.from(doc.owner_id),
      name: doc.name,
    };
  }

  async rename(
    owner_id: Id,
    category_id: Id,
    new_name: string,
  ): Promise<{ category_id: Id }> {
    // 1. Requires: category exists and category.owner_id = owner_id
    const existingCategory = await this.getCategoryDocById(owner_id, category_id);

    if (!existingCategory) {
      throw new Error(
        `Category with ID "${category_id.toString()}" not found for owner ${owner_id.toString()}.`,
      );
    }
    // The `getCategoryDocById` already ensures owner_id matches due to the _id key structure,
    // but an explicit check reinforces the principle.
    if (existingCategory.owner_id !== owner_id.toString()) {
      // This case is unlikely to be hit if _id is correctly formed and category exists,
      // but provides a strong guarantee.
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

  /**
   * Deletes a category and its associated metrics, provided it is not
   * currently referenced by any labels for the given owner.
   *
   * @param owner_id The ID of the owner.
   * @param category The Category object to be deleted.
   * @returns `true` if the category was successfully deleted, `false` if deletion was blocked by existing labels.
   * @throws Error if `category` does not exist or `category.ownerId` does not match `owner_id`.
   */
  async delete(owner_id: Id, category: Category): Promise<boolean> {
    // requires: category exists and category.owner_id = owner_id

    // 1. Validate the provided category object's ownerId against the action's owner_id.
    if (category.ownerId.toString() !== owner_id.toString()) {
      throw new Error(
        `Provided category object's ownerId (${category.ownerId.toString()}) does not match the action's owner_id (${owner_id.toString()}).`,
      );
    }

    // 2. Verify the category exists in the database for this owner.
    const existingCategoryDoc = await this.getCategoryDocById(owner_id, category.id);
    if (!existingCategoryDoc) {
      throw new Error(
        `Category with ID "${category.id.toString()}" not found for owner ${owner_id.toString()}.`,
      );
    }
    // At this point, existingCategoryDoc is guaranteed to belong to owner_id
    // due to the `makeCategoryKey` used in `getCategoryDocById`'s query.

    // 3. Check for label references. The prompt specifies "current-period label references".
    // As the `delete` action doesn't accept a `Period` argument, and `LabelStore`'s `catTx`
    // collection doesn't store `created_at` or `Period` directly for efficient lookup,
    // we interpret "current-period label references" as *any* existing labels
    // referencing this category, to ensure deletion is blocked while referenced by labels.
    const hasLabels = await this.labelStore.hasAnyLabelsForCategory(
      owner_id,
      category.id,
    );

    if (hasLabels) {
      // otherwise leaves state unchanged and returns false
      return false;
    }

    // effects: if no current-period label references this category, removes it (and any CategoryMetrics for it) and returns true

    const categoryKey = this.makeCategoryKey(owner_id, category.id);
    const categoryIdStr = category.id.toString();
    const ownerIdStr = owner_id.toString();

    // Delete the CategoryDoc
    await this.categories.deleteOne({
      _id: categoryKey,
    });

    // Delete all associated CategoryMetrics
    await this.categoryMetrics.deleteMany({
      owner_id: ownerIdStr,
      category_id: categoryIdStr,
    });

    return true; // Deletion successful
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
}
```

### `src/concepts/FlashFinance/Label/label.ts`

```typescript
// deno-lint-ignore no-unversioned-import
import { Collection, Db } from "npm:mongodb";
import { GeminiLLM } from "./gemini-llm.ts";

export class Id {
  private constructor(private value: string) {}

  static from(value: string): Id {
    return new Id(value);
  }

  toString(): string {
    return this.value;
  }
}

const PREFIX = "Label" + ".";
const TRASH_CATEGORY_ID = Id.from("TRASH_CATEGORY");

//// Label record

type CategoryMeta = { id: Id; name: string };

export interface TransactionInfo {
  tx_id: Id;
  tx_name: string;
  tx_merchant: string;
}

type LabelDoc = {
  _id: string; //appended user_id with tx_id
  user_id: string;
  tx_id: string;
  category_id: string;
  created_at: Date;
};
type TxInfoDoc = { _id: string; tx_name: string; tx_merchant: string };
type CatTxDoc = {
  _id: string;
  category_id: string;
  tx_id: string;
  user_id: string;
};

type StagedLabelDoc = {
  _id: string; // appended user_id with tx_id
  user_id: string;
  category_id: string;
  tx_id: string;
  tx_name: string;
  tx_merchant: string;
  staged_at: Date;
};

export class LabelStore {
  private labels: Collection<LabelDoc>;
  private txInfos: Collection<TxInfoDoc>;
  private catTx: Collection<CatTxDoc>;
  private stagedLabels: Collection<StagedLabelDoc>;

  constructor(private readonly db: Db) {
    this.labels = db.collection(PREFIX + "labels");
    this.txInfos = db.collection(PREFIX + "tx_infos");
    this.catTx = db.collection(PREFIX + "cat_tx");
    this.stagedLabels = db.collection(PREFIX + "staged_labels");
  }
  private makeTxUserId(user_id: Id, tx_id: Id): string {
    return `${user_id.toString()}:${tx_id.toString()}`;
  }

  private async commitSingleLabel(
    user_id: Id,
    tx_id: Id,
    tx_name: string,
    tx_merchant: string,
    category_id: Id,
  ): Promise<{ label_tx_id: Id }> {
    // make transactionInfo
    const k = this.makeTxUserId(user_id, tx_id);
    const now = new Date();

    await this.txInfos.updateOne(
      { _id: k },
      { $set: { _id: k, tx_name, tx_merchant } },
      { upsert: true },
    );

    // add to history
    await this.labels.updateOne(
      { _id: k },
      {
        $set: {
          _id: k,
          tx_id: tx_id.toString(),
          user_id: user_id.toString(),
          category_id: category_id.toString(),
          created_at: now,
        },
      },
      { upsert: true },
    );
    // TO DO
    await this.catTx.updateOne(
      { _id: k },
      {
        $set: {
          _id: k,
          user_id: user_id.toString(),
          category_id: category_id.toString(),
          tx_id: tx_id.toString(),
        },
      },
      { upsert: true },
    );

    return { label_tx_id: tx_id };
  }

  async stage(
    user_id: Id,
    tx_id: Id,
    tx_name: string,
    tx_merchant: string,
    category_id: Id,
  ): Promise<{ label_tx_id: Id }> {
    // requires: no committed label exists for `tx_id`; no stagedLabel with ID tx_id.
    const txIdStr = tx_id.toString();
    const userIdStr = user_id.toString();
    const stagedId = this.makeTxUserId(user_id, tx_id);

    // Check for existing committed label
    const existingLabel = await this.labels.findOne({ _id: stagedId });
    if (existingLabel) {
      throw new Error(
        `A committed label already exists for transaction ${txIdStr} for user ${userIdStr}.`,
      );
    }

    // Check for existing staged label by the same user for this tx_id
    const existingStagedLabel = await this.stagedLabels.findOne({
      _id: stagedId,
    });
    if (existingStagedLabel) {
      throw new Error(
        `A staged label already exists for transaction ${txIdStr} for this user.`,
      );
    }

    const now = new Date();
    const stagedLabelDoc: StagedLabelDoc = {
      _id: stagedId, // Using tx_id as the stagedlabel_id
      user_id: userIdStr,
      category_id: category_id.toString(),
      tx_id: txIdStr,
      tx_name: tx_name,
      tx_merchant: tx_merchant,
      staged_at: now,
    };

    await this.stagedLabels.insertOne(stagedLabelDoc);

    return { label_tx_id: tx_id };
  }

  async finalize(user_id: Id): Promise<void> {
    const userIdStr = user_id.toString();

    // Find all staged labels for the user
    const stagedDocs = await this.stagedLabels.find({ user_id: userIdStr })
      .toArray();

    if (stagedDocs.length === 0) {
      return; // No staged labels to finalize
    }

    // requires: for each StagedLabel belonging to the user: no committed label exists for `tx_id`
    // This check is performed for the entire batch to ensure atomicity.
    const compositeIds = stagedDocs.map((doc) =>
      this.makeTxUserId(Id.from(doc.user_id), Id.from(doc.tx_id))
    );
    const existingCommittedLabels = await this.labels.find({
      _id: { $in: compositeIds },
    }).toArray();

    if (existingCommittedLabels.length > 0) {
      const conflictingTxIds = existingCommittedLabels.map((label) =>
        label._id
      );
      throw new Error(
        `Cannot finalize: Committed labels already exist for transactions: ${
          conflictingTxIds.join(", ")
        }. ` +
          `Please remove or update these transactions before finalizing their staged labels.`,
      );
    }

    // effects: for each StagedLabel belonging to the user, do what _commitSingleLabel implements
    for (const doc of stagedDocs) {
      await this.commitSingleLabel(
        Id.from(doc.user_id),
        Id.from(doc.tx_id),
        doc.tx_name,
        doc.tx_merchant,
        Id.from(doc.category_id),
      );
    }

    // effects: after processing all staged labels, wipes stagedLabels for the user
    await this.stagedLabels.deleteMany({ user_id: userIdStr });
  }

  /**
   * Cancels all staged labels for a user, deleting them without committing.
   * @param user_id The ID of the user whose staged labels are to be cancelled.
   */
  async cancel(user_id: Id): Promise<void> {
    // effects: deletes all StagedLabels for that user;
    await this.stagedLabels.deleteMany({ user_id: user_id.toString() });
  }

  /** Change the category for an existing label. */
  async update(
    user_id: Id,
    tx_id: Id,
    new_category_id: Id,
  ): Promise<{ label_tx_id: Id }> {
    const keycombined = this.makeTxUserId(user_id, tx_id);
    const now = new Date();

    const result = await this.labels.findOneAndUpdate(
      { _id: keycombined },
      {
        $set: {
          category_id: new_category_id.toString(),
          user_id: user_id.toString(),
          created_at: now,
        },
      },
      { returnDocument: "after" },
    );
    if (!result) {
      throw new Error(`Label not found for transaction ${tx_id.toString()}`);
    }

    await this.catTx.updateOne(
      { _id: keycombined },
      {
        $set: {
          user_id: user_id.toString(),
          category_id: new_category_id.toString(),
          tx_id: tx_id.toString(),
        },
      },
      { upsert: true },
    );

    return { label_tx_id: tx_id };
  }

  /** Reassign the label for a transaction to the built-in Trash category. */
  async remove(user_id: Id, tx_id: Id): Promise<{ label_tx_id: Id }> {
    await this.update(user_id, tx_id, TRASH_CATEGORY_ID);
    return { label_tx_id: tx_id };
  }

  /**
   * Checks if there are any labels referencing a specific category for a given user.
   * This is used by CategoryStore to determine if a category can be deleted.
   * @param user_id The ID of the user.
   * @param category_id The ID of the category to check.
   * @returns `true` if any labels reference the category, `false` otherwise.
   */
  async hasAnyLabelsForCategory(
    user_id: Id,
    category_id: Id,
  ): Promise<boolean> {
    const count = await this.catTx.countDocuments({
      user_id: user_id.toString(),
      category_id: category_id.toString(),
    });
    return count > 0;
  }

  /** Queries for demos/tests. */
  async getLabel(user_id: Id, tx_id: Id) {
    return await this.labels.findOne({
      _id: this.makeTxUserId(user_id, tx_id),
    });
  }

  async getTxInfo(user_id: Id, tx_id: Id) {
    return await this.txInfos.findOne({
      _id: this.makeTxUserId(user_id, tx_id),
    });
  }

  async getCategoryHistory(user_id: Id, category_id: Id): Promise<string[]> {
    const rows = await this.catTx.find({
      category_id: category_id.toString(),
      user_id: user_id.toString(),
    })
      .project({ tx_id: 1, _id: 0 })
      .toArray();
    return rows.map((r) => r.tx_id);
  }

  async all(): Promise<LabelDoc[]> {
    return await this.labels.find().toArray();
  }

  // more info about the transaction
  async suggest(
    llm: GeminiLLM,
    user_id: Id,
    allCategories: [string, Id][],
    txInfo: TransactionInfo,
  ): Promise<CategoryMeta> {
    console.log("🤖 Requesting labeling suggestions from Gemini AI...");
    if (allCategories.length === 0) {
      throw new Error("No categories available");
    }
    try {
      // Normalize tuples -> CategoryMeta[]
      const categories: CategoryMeta[] = allCategories.map(([name, id]) => ({
        name,
        id,
      }));

      const historyByCategory = await this.buildHistorySnapshot(categories);

      const prompt = this.buildSuggestPrompt(
        user_id,
        categories,
        txInfo,
        historyByCategory,
      );

      const text = await llm.executeLLM(prompt);

      const chosen = this.parseFindSuggestResponse(text, categories);
      console.log("✅ Received response from Gemini AI!\n");

      return chosen;
    } catch (error) {
      console.error("❌ Error calling Gemini API:", (error as Error).message);
      throw error;
    }
  }
  private async buildHistorySnapshot(
    categories: CategoryMeta[],
  ): Promise<Map<string, TransactionInfo[]>> {
    const out = new Map<string, TransactionInfo[]>();
    for (const c of categories) {
      const catKey = c.id.toString();
      const maps = await this.catTx.find({ category_id: catKey })
        .project<{ tx_id: string }>({ tx_id: 1, _id: 0 })
        .toArray();
      const txIds = maps.map((m) => m.tx_id);
      if (txIds.length === 0) {
        out.set(catKey, []);
        continue;
      }

      // fetch TransactionInfo docs for those tx_ids
      const docs = await this.txInfos.find({ _id: { $in: txIds } }).toArray();

      const infos: TransactionInfo[] = docs.map((d) => ({
        tx_id: Id.from(d._id),
        tx_name: d.tx_name,
        tx_merchant: d.tx_merchant,
      }));

      out.set(catKey, infos);
    }
    return out;
  }
  private buildSuggestPrompt(
    userId: Id,
    categories: CategoryMeta[],
    tx: TransactionInfo,
    history: Map<string, TransactionInfo[]>,
  ): string {
    const categoriesBlock = categories.map((c) =>
      `- ${c.id.toString()}: ${c.name}`
    ).join("\n");

    const historyBlock = categories.map((c) => {
      const catKey = c.id.toString();
      const items = history.get(catKey) ?? [];
      if (items.length === 0) {
        return `• ${c.name} (${c.id.toString()}): (no prior transactions)`;
      }
      const lines = items.map((info) =>
        `  - "${info.tx_merchant}" | ${info.tx_name}`
      );
      return `• ${c.name} (${c.id.toString()}):\n${lines.join("\n")}`;
    }).join("\n");

    return `
You classify ONE bank transaction into exactly ONE of the user's categories.

The data can be noisy. Merchant and name fields may include:
- Processor prefixes/suffixes (e.g., "SQ *", "TST*", "POS", "AUTH", "COMNY", "ONLINE"). 
- Uppercase, punctuation, and partial words.
- Aggregators (DoorDash/Grubhub/UberEats) where the underlying restaurant is implied.

Rules:
1) Choose exactly one category from the list below. Do not invent categories.
2) Prefer matches based on normalized keywords (strip "SQ*", "TST*", "POS", "*", punctuation, repeated whitespace).
3) If a transaction appears in multiple categories historically, prefer the category with the strongest exact/near keyword match in history; break ties by the category with more matching historical examples.
4) If still uncertain, choose the most semantically appropriate category by name (e.g., "Coffee Shops" vs "Restaurants" for coffee chains).
5) Treat delivery aggregators (DoorDash/Grubhub/UberEats) as "Takeout / Delivery" unless the history for a specific restaurant clearly maps elsewhere.
6) If the text suggests transit (MBTA, MTA, LYFT/UBER rides) treat as "Transit".
7) Never output explanations—return only the JSON object.

USER: ${userId.toString()}

CATEGORIES (id: name):
${categoriesBlock}

FULL CATEGORY HISTORY (examples of previously labeled transactions):
${historyBlock || "(none yet)"}

TRANSACTION TO CLASSIFY (noisy, normalize before matching):
{ "id": "${tx.tx_id.toString()}", "merchant": "${tx.tx_merchant}", "name": "${tx.tx_name}" }

Return ONLY this JSON (no extra text):
{
  "suggestedCategoryId": "<one existing category id>",
  "suggestedCategoryName": "<that category's name as listed above>"
}
`.trim();
  }

  private parseFindSuggestResponse(
    text: string,
    categories: CategoryMeta[],
  ): CategoryMeta {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON object found in response");
    const json = JSON.parse(m[0]);

    // validate shape
    const id = json?.suggestedCategoryId;
    const name = json?.suggestedCategoryName;

    if (typeof id !== "string" || id.length === 0) {
      throw new Error("Invalid suggestedCategoryId");
    }
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Invalid suggestedCategoryName");
    }

    const invalidVals = ["", "none", "null", "undefined", "n/a", "todo"];
    if (
      invalidVals.includes(id.toLowerCase()) ||
      invalidVals.includes(name.toLowerCase())
    ) {
      throw new Error(
        `Invalid placeholder value in response: id="${id}", name="${name}"`,
      );
    }

    const idIsName = categories.some((c) =>
      c.name.toLowerCase() === id.toLowerCase()
    );
    if (idIsName) {
      throw new Error(
        `Response appears to have swapped name/id fields (id='${id}')`,
      );
    }

    // validate id exists
    const byId = categories.find((c) => c.id.toString() === id);
    if (!byId) {
      const allowedIds = categories.map((c) => c.id.toString());
      throw new Error(
        `No matching category for id "${id}". Expected one of: [${
          allowedIds.join(", ")
        }]`,
      );
    }

    // validate name matches the id's name
    if (byId.name.toLowerCase() !== name.toLowerCase()) {
      throw new Error(
        `Name/id mismatch: got id="${id}" name="${name}", but canonical name for that id is "${byId.name}".`,
      );
    }

    return byId;
  }
}
```

### `src/concepts/FlashFinance/Category/test-actions/test-op-simple.ts`

```typescript
// deno-lint-ignore no-unversioned-import
import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { CategoryStore, Id, Category } from "../category.ts"; // Adjust path, add Category type
import { LabelStore } from "../../Label/label.ts"; // Import LabelStore
import { Db } from "npm:mongodb"; // Import Db for explicit type

Deno.test("CategoryStore: create action works and enforces name uniqueness per owner", async () => {
  const [db, client] = await testDb();
  const labelStore = new LabelStore(db); // Instantiate LabelStore
  const categoryStore = new CategoryStore(db, labelStore); // Pass to CategoryStore

  try {
    // 1. Setup: Define a test user ID and a category name.
    const ownerId = Id.from("test_user_create_1");
    const categoryName = "Groceries";

    // 2. Action: Create the first category.
    console.log(
      `Attempting to create category "${categoryName}" for owner "${ownerId.toString()}"...`,
    );
    const { category_id: createdCategoryId } = await categoryStore.create(
      ownerId,
      categoryName,
    );
    assertExists(
      createdCategoryId,
      "A category ID should be returned upon successful creation.",
    );
    console.log("   ✅ Category created successfully.");

    // 3. Verification: Use getCategoryNamesAndOwners to confirm the category exists.
    const categories = await categoryStore.getCategoryNamesAndOwners();
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
        await categoryStore.create(ownerId, categoryName);
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
  const labelStore = new LabelStore(db); // Instantiate LabelStore
  const categoryStore = new CategoryStore(db, labelStore); // Pass to CategoryStore

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
    const { category_id: categoryToRenameId } = await categoryStore.create(
      ownerId,
      initialName,
    );
    assertExists(categoryToRenameId, "Initial category should be created.");
    console.log(
      `   ✅ Created category with ID: ${categoryToRenameId.toString()}`,
    );

    // Verify initial state
    let categories = await categoryStore.getCategoryNamesAndOwners();
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
    const { category_id: renamedCategoryId } = await categoryStore.rename(
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
    categories = await categoryStore.getCategoryNamesAndOwners();
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
    const { category_id: anotherCategoryId } = await categoryStore.create(
      ownerId,
      anotherCategoryName,
    );
    console.log(
      `   Created another category "${anotherCategoryName}" with ID: ${anotherCategoryId.toString()}`,
    );

    await assertRejects(
      async () => {
        await categoryStore.rename(ownerId, categoryToRenameId, anotherCategoryName);
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
        await categoryStore.rename(ownerId, nonExistentId, "Some truly new name");
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
    const { category_id: renamedToSameId } = await categoryStore.rename(
      ownerId,
      categoryToRenameId,
      newName,
    );
    assertEquals(
      renamedToSameId.toString(),
      categoryToRenameId.toString(),
      "Renaming to the same name should return the original ID.",
    );

    categories = await categoryStore.getCategoryNamesAndOwners();
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

Deno.test("CategoryStore: delete action works and enforces conditions", async () => {
  const [db, client] = await testDb();
  const labelStore = new LabelStore(db);
  const categoryStore = new CategoryStore(db, labelStore);

  try {
    const ownerId = Id.from("test_user_delete_1");
    const categoryName1 = "Bills";
    const categoryName2 = "Restaurants";
    const categoryName3 = "Savings";

    // --- Setup: Create categories ---
    console.log(`\n--- Test Delete Action ---`);
    console.log(`1. Creating initial categories...`);

    const { category_id: categoryId1 } = await categoryStore.create(
      ownerId,
      categoryName1,
    );
    const category1: Category = {
      id: categoryId1,
      ownerId: ownerId,
      name: categoryName1,
    };
    assertExists(await categoryStore.getCategory(ownerId, categoryId1));

    const { category_id: categoryId2 } = await categoryStore.create(
      ownerId,
      categoryName2,
    );
    const category2: Category = {
      id: categoryId2,
      ownerId: ownerId,
      name: categoryName2,
    };
    assertExists(await categoryStore.getCategory(ownerId, categoryId2));

    const { category_id: categoryId3 } = await categoryStore.create(
      ownerId,
      categoryName3,
    );
    const category3: Category = {
      id: categoryId3,
      ownerId: ownerId,
      name: categoryName3,
    };
    assertExists(await categoryStore.getCategory(ownerId, categoryId3));
    console.log("   ✅ Initial categories created.");

    // --- Negative Test 1: Attempt to delete a category for a wrong owner ---
    console.log(
      "\n2. Negative Test: Attempting to delete a category with mismatching owner ID...",
    );
    const wrongOwnerId = Id.from("wrong_owner");
    const categoryForWrongOwner: Category = {
      id: categoryId1,
      ownerId: ownerId, // Correct owner in category object, but wrong owner for the call
      name: categoryName1,
    };
    await assertRejects(
      async () => {
        await categoryStore.delete(wrongOwnerId, categoryForWrongOwner);
      },
      Error,
      `Category with ID "${categoryId1.toString()}" not found for owner ${wrongOwnerId.toString()}.`,
      "Should reject deletion if owner_id does not match.",
    );
    console.log(
      "   ✅ Verified: Deletion with mismatching owner ID was correctly rejected.",
    );

    // --- Negative Test 2: Attempt to delete a non-existent category ---
    console.log(
      "\n3. Negative Test: Attempting to delete a non-existent category...",
    );
    const nonExistentCategoryId = Id.from("non_existent_cat");
    const nonExistentCategory: Category = {
      id: nonExistentCategoryId,
      ownerId: ownerId,
      name: "NonExistent",
    };
    await assertRejects(
      async () => {
        await categoryStore.delete(ownerId, nonExistentCategory);
      },
      Error,
      `Category with ID "${nonExistentCategoryId.toString()}" not found for owner ${ownerId.toString()}.`,
      "Should reject deletion of a non-existent category.",
    );
    console.log(
      "   ✅ Verified: Deletion of non-existent category was correctly rejected.",
    );

    // --- Test 1: Delete a category with no labels ---
    console.log("\n4. Test: Deleting category 'Bills' (no labels)...");
    let deleteResult = await categoryStore.delete(ownerId, category1);
    assertEquals(deleteResult, true, "Category 'Bills' should be deleted.");
    assertEquals(
      await categoryStore.getCategory(ownerId, categoryId1),
      null,
      "Category 'Bills' should no longer exist.",
    );
    console.log("   ✅ Verified: Category 'Bills' deleted successfully.");

    // --- Test 2: Attempt to delete a category that has labels ---
    console.log(
      "\n5. Test: Attempting to delete category 'Restaurants' (with labels)...",
    );
    const txId1 = Id.from("tx_rest_1");
    const txInfo1 = { tx_id: txId1, tx_name: "Dinner", tx_merchant: "ABC Rest" };
    // Add a label for category2 ('Restaurants')
    await labelStore.commitSingleLabel(
      ownerId,
      txId1,
      txInfo1.tx_name,
      txInfo1.tx_merchant,
      categoryId2,
    );
    assertExists(
      await labelStore.getLabel(ownerId, txId1),
      "Label should exist.",
    );

    deleteResult = await categoryStore.delete(ownerId, category2);
    assertEquals(
      deleteResult,
      false,
      "Category 'Restaurants' should NOT be deleted due to existing labels.",
    );
    assertExists(
      await categoryStore.getCategory(ownerId, categoryId2),
      "Category 'Restaurants' should still exist.",
    );
    console.log(
      "   ✅ Verified: Deletion of 'Restaurants' blocked by existing labels.",
    );

    // --- Test 3: Delete a category that previously had labels, but they were removed (moved to trash) ---
    console.log(
      "\n6. Test: Deleting category 'Restaurants' after moving its labels to trash...",
    );
    // Remove the label referencing category2 by moving it to trash
    await labelStore.remove(ownerId, txId1);
    assertEquals(
      (await labelStore.getLabel(ownerId, txId1))?.category_id,
      "TRASH_CATEGORY",
      "Label should now point to TRASH_CATEGORY.",
    );

    // Now try deleting category2 again
    deleteResult = await categoryStore.delete(ownerId, category2);
    assertEquals(
      deleteResult,
      true,
      "Category 'Restaurants' should now be deleted as labels are removed.",
    );
    assertEquals(
      await categoryStore.getCategory(ownerId, categoryId2),
      null,
      "Category 'Restaurants' should no longer exist.",
    );
    console.log(
      "   ✅ Verified: Category 'Restaurants' deleted successfully after labels were unreferenced.",
    );

    // Verify CategoryMetrics are also deleted (implicitly, as we don't have a direct metric getter yet)
    // For now, assume this is handled by deleteMany. A future test would require a getCategoryMetrics method.
    // However, the action specifies "removes it (and any CategoryMetrics for it)"
    // The `categoryMetrics` collection should have no documents for categoryId1 and categoryId2.
    const metricsForDeletedCategories1 = await db.collection("Category.category_metrics").find({
      owner_id: ownerId.toString(),
      category_id: categoryId1.toString(),
    }).toArray();
    assertEquals(metricsForDeletedCategories1.length, 0, "No metrics should exist for deleted category1.");

    const metricsForDeletedCategories2 = await db.collection("Category.category_metrics").find({
      owner_id: ownerId.toString(),
      category_id: categoryId2.toString(),
    }).toArray();
    assertEquals(metricsForDeletedCategories2.length, 0, "No metrics should exist for deleted category2.");

    console.log("   ✅ Verified: Associated CategoryMetrics were also removed.");

    // --- Final check: category3 should still exist ---
    assertExists(
      await categoryStore.getCategory(ownerId, categoryId3),
      "Category 'Savings' should still exist.",
    );
    console.log(
      "   ✅ Verified: Category 'Savings' (untouched) still exists.",
    );
  } finally {
    await client.close();
    console.log("Database client closed.");
  }
});
```
