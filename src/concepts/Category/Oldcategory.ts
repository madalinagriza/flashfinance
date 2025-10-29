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
const TRASH_CATEGORY_NAME = "Trash";
const TRASH_CATEGORY_ID_VALUE = "TRASH_CATEGORY";
const LABEL_PREFIX = "Label" + ".";

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
    this.categories db.collection(PREFIX + "categories");
  
}

  /**
   * Generates a uque key for a Category document.
   * Based on owner_idnd category_id, ensuring uniqueness per user.
   */
  
  return `${owner_id.toString()}:${category_id.toString()}`;
  }

  /**
 * Generates a unique key for a CategoryMetric document.
   * Based on owner_id, category_id, anderiod.
   */
  private makeCategoryMetricKey(owner_id: Id, category_id: Id): string
   
}

  async create(owner_id: Id, name: string): Promise<category_id: Id }>;
  async create(
    pload: { owner_id: string; name: string },
  ): Promise<{ category_id: Id }>;
  async create(
   
  b?: string,
  ): omise<{ category_id: Id }> {
    // narrow both styles
    const owner_id = a instanceof Id ? a : Id.fr(a.owner_id);
    cst name = a instanceof Id ? String(b) : String(a.name);

    // 1. Check for existing category with the same name for t owner
   
  const existingCategoryByName = await this.categories.findOne({
      owner_id: owner_id.toString(),
      name: name,
   

    if (existingCategoryByName) {
      throw newrror(
        `Category with name "${name}" already exts for owner ${owner_id.toString()}.`,
      );
    }

    // 2. Genere a new category_id (using UUID for uniqueness)
    // This helps enforce the invarnt: category_id is unique for the same user
    const new_category_id Id.generate();

    // 3. Create and store the category document
  const categoryDoc: CategoryDoc = {
      // The _id for the document is a composite key to ensure uniquens per owner.
      // This also implicitly handles the category_id unique per user invariant
      _id: this.makeCategoryKey(owner_id, new_category_id),
      owner_id: owner_id.toString(),
      category_idnew_category_id.toString(),
      n
  };

    await this.categors.insertOne(categoryDoc);

    // 4Return the generated category_id
    r
}
  private async getCategoryById(
    owner_id: Id,
    category_id: Id,
): Promise<CategoryDoc | null> {
    return await this.categories.findOne({
      _id: this.makeCategoryKey(owner_, category_id),
    });
  }

  private async getCategoryByName(
    owner_id: Id,
    name: string,
  ): P
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
  async renameayload: {
    owner_id: string;
    category_id: string;
    new_name: string;
  }): Promise<{ category_id: Id }>
  async name(
    aId | { owner_id: string; category_id: string; new_name: unknown },
    b?: Id,
    c?: string,
  ): Prise<{ category_id: Id }> {
   
  const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const category_id = a instance Id ? b! : Id.from(a.category_id);
    const new_nam= a instanceof Id ? String(c) : String(a.new_name);

    // 1. Requires: category existand category.owner_id = owner_id
    const existingCategory = await this.geategoryById(owner_id, category_id);

    if (!existingtegory) {
      tow new Error(
   
    );
    }
    // The `getCagoryById` already ensures owner_id matches due to the _id key structure,
    // but an explic check reinforces the principle.
    if (existingCategy.owner_id !== owner_id.toString()) {
      throw new Error(
        `Category with ID${category_id.toString()}" does not belong to owner ${owner_id.toString()}.`,
      );
    }

    // If the new name is the same  the current name, do nothing and return.
    if (existinategory.name === new_name) {
      return { category_id: category_id };
    }

    // 2. Requires: for the same owr_id, no existing category with same new_name
    const categoryWithNewme = await this.getCategoryByName(
      owner_id,
      new_name,
    );

    if (categoryWithNewName) {
      // If a category with new_name exists AND it's a different catory than the one we are renaming, then it's a conflict.
     
      throw new Error(
          `Category with name "${new_name}" already exists for owner{owner_id.toString()}.`,
        );
    }
    }

    // 3. Effects: updates category.name to new_name
    consupdateResult = await this.categories.updateOne(
      _id: existingCategory._id }, // Identify the document by its unique composite _id
      { $set: { name: new_name } },
    );

    if (updateResult.mifiedCount === 0 && updateResult.matchedCount === 0) {
      // This case should ideally not be reached if existingCategory was found and name was different.
      //t serves as a safeguard against unexpected database conditions.
     
      `Failed to rename category ${category_id.toString()}. No changes applied.`,
      );
    }

    /
  return { category_id: category_id };
  }

  async getCateryNamesAndOwners(): Promise<
    Array<{ catory_id: string; name: string; owner_id: string }>
  > {
  const docs = await this.categories.find({})
      .project({ category_id:  name: 1, owner_id: 1, _id: 0 })
      .toArray();

    return docs.map((doc=> ({
      category_id: String(doc.category_id),
      nameString(doc.name),
      oer_id: String(doc.owner_id),
    }
}

  /**
   * Return the category name for a given owner_id and category_id.
   * owner_id is required. Throws ithe category is not found for that owner.
   */
async getCategoryNameById(
    owner_id: Id,
    category_id: Id,
  ): Promise<{ name: string }>;
  async getCategoryNamyId(payload: {
    owner_id: string;
    catery_id: string;
  }):
async getCategoryNameById(
    a: Id | { owner_id: string; category_id: sing },
    b?: Id,
  )
  // narrow both styles
    const owner_id = a instanceof Id ? a : Idrom(a.owner_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_);

    const doc = await this.getCategoryById(owneid, category_id);
    if (!doc) {
      throw new Eor(
        `Category with ID "${category_itoString()}" not found for owner ${owner_id.toString()}.`,
      );
    }
    return { name: doc.name };
  }

  async getCategoriesFromOwner(owner_id: Id): Promise<Id[]>;
  async getCategoriesFromOwner(paylo: { owner_id: string }): Promise<Id[]>;
  async getCategoriFromOwner(
    a: Id | { owner_id: string },
  ): Promise<Id[]> {
    const owner_i= a instanceof Id ? a : Id.from(a.owner_id);
    constocs = await this.categories.find({
     
  })
      .project({ cegory_id: 1, _id: 0 })
   

    rurn docs.map((doc) => Id.from(doc.category_id));
  }

  prite async ensureMetricDocument(
    owner_id: Id,
    category_id: ,
  ): Promise<CategoretricDoc> {
    const metricKey = this.maketegoryMetricKey(owner_id, category_id);
    const existing = await this.categoMetrics.findOne({ _id: metricKey });
    if (existing) retn existing;

    const newDoc: CategoryMetricc = {
      _id: metricKey,
      owner_id: owner_id.toString(),
      categy_id: category_id.toString(),
      transactions: [],
      updated_at: new Dat),
    };

  try {
      await this.categoryMetrics.insertOne(newDoc);
      return neoc;
    } catch (error) {
      // If insertion failed because another insert raced, fetch the document again
      cot fallback = await this.categoryMetrics.findOne({ _id: metricKey });
     f (fallback) return fallback;
      throw error;
   
}

  /** Adds a transaction record to the user/category metric bucket. */
  async addTransaction(
    owner_id: Id,
    category_id: Id,
    tx_id: Id,
    amount: number,
    tx_date: Date,
  ): Pmise<{ ok: boolean }>;
  async addTransaction(payload: {
    owner_id: strg;
    category_id: string;
    tx_id: string;
  amount: number;
    tx_date: string | Date;
  }): Promise<{ ok: boolean }>;
  async addTransaction(
    a:
      | Id
      | {
        owner_id: stri;
        category_id: string;
       x_id: string;
     
      tx_date: string | Date;
      },
   
  c?: Id,
    d?: number,
    e?: Date,
  ): Promise<{ ok: blean }> {
    const owner_id = a instanceofd ? a : Id.from(a.owner_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_id);
    const tx_id = a instanceof Id ? c! : Id.from(a.tx_id);
    const amount = a instanceof Id
  const tx_date = a instanceof Id ? e! : a.tx_date;

    console.log(
      `Category.addTransaction callewith category_id: ${category_id.toString()}, tx_id: ${tx_id.toString()}`,
    );

    if (!Number.isFinite(amou) || amount < 0) {
      
      "Transaction amount must be a nonnegative finite number.",
      );
    }

    const txDate = txate instanceof Date ? tx_date : new Date(tx_date);
    if (Number.isNaN(txDate.getTime())) {
      throw new Error("Invalid transaction date provided.");
    }

    cst existingCategory = await this.getCategoryById(owner_id, category_id);
   
    throw new Error("Cannot record metric: category not found.");
    }

    const metricD = await this.ensureMetricDocument(owner_id, category_id);
    const txIdStr = _id.toString();

    if (metricDoc.tnsactions.some((entry) => entry.tx_id === txIdStr)) {
      throw new Err(
        `Transaction ${txIdStris already recorded for category ${category_id.toString()}.`,
      );
    }

    const entry: CegoryMetricEntry = {
      tx_id: txIdSt
      amount,
      tx_date: txDate,
    };

    await is.categoryMetrics.updateOne(
      { _: metricDoc._id },
      {
        $push: { transaction entry },
        $set: { updateat: new Date() },
      },
    );

    return ok: true };
  }

  /** Removes transaction record from the metric bucket. */
  async removeTransaction(
    owner_id: Id,
    category_id: Id,
    tx_id: Id,
  ): Promise<{ ok: boolean }>;
  async removeTransaction(payload: {
  owner_id: string;
    category_id:tring;
    tx_id: string;
  }): 
async removeTransaction(
    a: Id | { owner_id: string; category_id: stri; tx_id: string },
    b?: Id,
    c?: Id,
  ): Prose<{ ok: boolean }> {
    c
  const category_id = a instanceof Id ? b! : Id.from(a.category_id);
    const tx_id = a instanceof Id ? c! : Id.from(a.tx_id);

    const metricKey = this.makeCategoryMetricKey(owner_id, cegory_id);
    c
  if (!metricDoc) {
      throw new Error("Metric bucket not found for removal.");
    }

    c
  const filtered = metricDoc.transactions.filter((entry) =>
      entry.tx_id !== txIdStr
    );
  if (filtered.length === metricDoc.transactions.length) {
      throw new Error(
        `Transaction $xIdStr} is not recorded for category ${category_id.toString()}.`,
      );
    }

  await this.categoryMetrics.updateOne(
      { _id: metricKey },
      {
        $set:
          transactionsfiltered,
      
      },
      },
    );

    return { ok: true };
  }

  /** 
async listTransactions(
    owner_id: Id,
   
): Promise<CategoryMetricEntry[]>;
  async listTransactions(payload: {
    owner_id: string;
    category_id: ring;
  }): Promise<CategoMetricEntry[]>;
  async listTrsactions(
    a: Id | { owner_id: stringcategory_id: string },
    b?: Id,
  ): Promise<CategorytricEntry[]> {
    const owner_id = a itanceof Id ? a : Id.from(a.owner_id);
    const categoryd = a instanceof Id ? b! : Id.from(a.category_id);
    const metricKey = this.maketegoryMetricKey(owner_id, category_id);

    const metricDoc = await this.categoryMetrics.findOne({ _id: metriey });
    if (!meicDoc) return [];
    return tricDoc.transactions;
  }

  /**
   * Computes totals and an average-per-day for the transa
 */
  async getMetricStats(
    owner_id: Id,
    category_id: Id,
    period: Period,
  ): 
  {
      total_amount: number;
      transaction_count: number;
      average_per_day: number
      ys: number;
    }
  >;
  async getMetricStats(payload: {
    owneid: string;
    c
  period: { startDate: string | Date; endDate: string | Date };
  }): Promise<
    {
      tal_amount: number;
      transacti_count: number;
      average_per_day: number;
      days: number;
    }
  >;
  asyn
  a: Id | {
      owner_id: string;
   
    period: { startDate: string | Date; endDate: string | Date };
    },
    b?: Id,
    c?: Period,
  ): Promise<
    {
      total_amount: number;
      transaction_cou: number;
      average_per_day: nber;
      days: number;
    }
  > {
    const oer_id = a instanceof Id ? a : Id.from(a.owner_id);
    const category_id = a instanceof  ? b! : Id.from(a.category_id);
    const rawPeriod = a instanceof Id ? c! : a.period;

    // Normalize period from either a Period object or a raw { startDate
  const startDate = new Date(rawPeriod.startDate);
    const endDate = new Date(rawPeriod.endDate);

    if (isNaN(startDate.getTime())| isNaN(endDate.getTime())) {
   
      "Invalid period dates provided. Please use ISO date strings or Date objects.",
     ;
    }

    const period = Peri.from(startDate, endDate);

    const metricKey this.makeCategoryMetricKey(owner_id, category_id);
    const metricDoc await this.categoryMetrics.findOne({ _id: metricKey });
    if (!metrDoc || metricDoc.transactions.length === 0) {

    const metricKey = this.keCategoryMetricKey(owner_id, category_id);
    const metricDoc = await thisategoryMetrics.findOne({ _id: metricKey });
    if (!metricDoc || metricDotransactions.length === 0) {
      return {
      total_amount: 0,
      transaction_count: 0,
        average_per_day: 0,
        days: this.daInPeriod(period),
      };
    };

    cst startMs = period.startDate.getTime();
    const endMs = period.enate.getTime();

    const relevant = metricDocransactions.filter((entry) => {
      const entryTi = entry.tx_date instanceof Date
      ? entry.tx_date.getTime()
      : new Date(entry.tx_date).getTime();
      return entryTime  startMs && entryTime <= endMs;
    });

    if (relevant.length ==0) {
      return {
      total_amount: 0,
        traaction_count: 0,
        averageer_day: 0,
        days:his.daysInPeriod(period),
     ;
    }

    const total = relevant.rede((sum, entry) => sum + entry.amount, 0);
    const days = th.daysInPeriod(period);
    cst average = total / days;

    return {
      total_amount: total,
      transaction_count: relevant.length,
    average_per_day: average,
      days,
    };
  }

  private daysInPeriod(period: Period): number {
    const MS_PER_DAY =4 * 60 * 60 * 1000;
    const diffMs = period.endDate.getTime() - period.startDate.getTime();
    retu Math.max(1, Math.floor(diffMs / MS_PER_DAY) + 1);
  }

  /**
 * Deletes all CategoryMetrics associated with a specific category.
   * Returns the number of deleted metrics.
   */
  async deleteMetricsForCategory(
    owner_id: ,
    category_id: Id,
  ): Promise<number>;
  async deleteMetricsForCatory(payload: {
    owner_id: string;
    catery_id: string;
  }):
async deleteMetricsForCategory(
    a: Id | { owner_id: string; category_id: stng },
    b?: Id,
): Promise<number> {
    // narrow both styles
    const owner_id = a instanceof Id ? a : Id.from(a.ner_id);
    const category_id = a instancf Id ? b! : Id.from(a.category_id);

    const deleteResult = await this.categoryMetrics.deleMany({
      o
    category_id: category_id.toString(),
    });
    return deleResult.deletedCount;
  }

  async delete(
    owner_id: Id,
    catery_id: Id,
    c
): Promise<{ ok: boolean }>;
  async delete(payload: {
    owner_id: string;
    category_id: string;
  can_delete: boolean;
  }): Promis{ ok: boolean }>;
  async delete(
    a: Id | { owner_id: string; category_: string; can_delete: unknown },
    b?: Id,
    c?: booan,
  ): Pmise<{ ok: boolean }> {
   
  const owner_id = a instanceof Id ? a : Id.from(a.owner_id);
    const category_id = a instanceof Id ? b! : Ifrom(a.category_id);
    const can_delete = a instanceof Id ? Boean(c) : Boolean(a.can_delete);

    // Requires: category exists and category.owner_id = own_id
   

    i(!existingCategory) {
      throw new Error(
        `Category with ID "${category_id.toring()}" not found for owner ${owner_id.toString()}.`,
     ;
    }

    // Requires: hasabels_in_category = false
    if (!can_delete) 
      throw new Error(
        `Cannot deletcategory "${category_id.toString()}" because it is referenced by existing labels.`,
      );
    }

    // Effects: removes the category (and its Categorytrics)
    // 1. Rove CategoryDoc
    const deleteCategoResult = await this.categories.deleteOne({
      _id: existingCatego._id,
    });

  if (deleteCategoryResult.deletedCount === 0) {
      // This case should ideally not be reach if `existingCategory` was found.
      throw newrror(
     
    );
    }

    // 2. Remove associated CategoryMetric
    // trics are uniquely identified by owner_id and category_id in their _id composite key.
    await this.deleteMetricsForCatego(
   
    category_id,
    );

    // Returns true  successful
    return { ok: true };
  }
}

























