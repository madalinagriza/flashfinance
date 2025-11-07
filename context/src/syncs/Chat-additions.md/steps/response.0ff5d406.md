---
timestamp: 'Thu Nov 06 2025 09:13:10 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_091310.fe6bcf8a.md]]'
content_id: 0ff5d4064de8e4193d6c957efbb82dbcaffacda6c790677992c668a9b6712b85
---

# response:

Excellent question. You've pointed out an important design consideration regarding API consistency and future-proofing.

In the provided framework, there's a distinction between **actions** and **queries**:

* **Queries** are read-only operations on a concept's state. Their method names must start with an underscore (e.g., `_getUser`). Crucially, they **must always return an array** of results, as the engine iterates over this array to create different execution paths (frames).
* **Actions** are operations that can change state or have external side effects (like calling an AI model, which is not a pure read of local state). They do not start with an underscore. The convention is that they return a **single dictionary object** representing the result.

In this context, `Label.suggest` is defined as an **action** because it has the significant side effect of calling the external Gemini LLM. Therefore, according to the framework's conventions, it correctly returns a single object.

However, your point is well-taken. An endpoint for "suggestions" intuitively implies that multiple suggestions might be returned. The current implementation returns a single object `{ id, name }`, which is not very flexible. If we wanted to return multiple suggestions in the future, this would be a breaking API change.

A better design is to have the action return an object that *contains* an array of suggestions. This adheres to the "actions return a single object" rule while making the API contract more robust and extensible.

I will update the code to reflect this improved design. `Label.suggest` will now return an object `{ suggestions: [...] }`, and the corresponding sync will be updated to handle this new structure. This change makes the API more consistent with what a developer or user might expect from a "suggest" feature.

Here are the required changes:

### file: src\concepts\Label\LabelConcept.ts

I'll update the `suggest` action to wrap its result in an object containing a `suggestions` array. This makes the return value a single object, as expected for an action, but with a payload that is an array, satisfying your design suggestion.

```typescript
// deno-lint-ignore no-unversioned-import
import { Collection, Db } from "npm:mongodb";
import { Config, GeminiLLM } from "./gemini-llm.ts";

// Load Gemini API key from environment if available; otherwise try to load
// a local `config.json`. We avoid hard-failing at build time on missing
// file by preferring the environment variable, which is the correct
// approach for deployed environments (secrets via env).
let config: Config;
const envApiKey = Deno.env.get("GEMINI_API_KEY");
if (envApiKey) {
  config = { apiKey: envApiKey };
} else {
  try {
    // Try to read a local config.json file relative to this module.
    const cfgUrl = new URL("../../../config.json", import.meta.url);
    const rawText = await Deno.readTextFile(cfgUrl);
    config = JSON.parse(rawText) as Config;
  } catch (_err) {
    throw new Error(
      "Missing Gemini configuration: set GEMINI_API_KEY env var or provide config.json",
    );
  }
}

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

export default class LabelConcept {
  private labels: Collection<LabelDoc>;
  private txInfos: Collection<TxInfoDoc>;
  private catTx: Collection<CatTxDoc>;
  private stagedLabels: Collection<StagedLabelDoc>;
  private llm: GeminiLLM;

  constructor(private readonly db: Db) {
    this.labels = db.collection(PREFIX + "labels");
    this.txInfos = db.collection(PREFIX + "tx_infos");
    this.catTx = db.collection(PREFIX + "cat_tx");
    this.stagedLabels = db.collection(PREFIX + "staged_labels");
    this.llm = new GeminiLLM(config);
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
  ): Promise<{ label_tx_id: Id }>;
  async stage(payload: {
    user_id: string;
    tx_id: string;
    tx_name: string;
    tx_merchant: string;
    category_id: string;
  }): Promise<{ label_tx_id: Id }>;
  async stage(
    a: Id | {
      user_id: string;
      tx_id: string;
      tx_name: unknown;
      tx_merchant: unknown;
      category_id: string;
    },
    b?: Id,
    c?: string,
    d?: string,
    e?: Id,
  ): Promise<{ label_tx_id: Id }> {
    // narrow both styles
    const user_id = a instanceof Id ? a : Id.from(a.user_id);
    const tx_id = a instanceof Id ? b! : Id.from(a.tx_id);
    const tx_name = a instanceof Id ? String(c) : String(a.tx_name);
    const tx_merchant = a instanceof Id ? String(d) : String(a.tx_merchant);
    const category_id = a instanceof Id ? e! : Id.from(a.category_id);

    // requires: no committed label exists for `tx_id`; no stagedLabel with ID tx_id.
    const txIdStr = tx_id.toString();
    console.log(typeof user_id);
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

  /**
   * Creates a staged label that assigns the transaction to the Trash category.
   * Signature mirrors `stage` and delegates to it, so all validation is centralized.
   */
  async discardUnstagedToTrash(
    user_id: Id,
    tx_id: Id,
    tx_name: string,
    tx_merchant: string,
  ): Promise<{ label_tx_id: Id }>;
  async discardUnstagedToTrash(payload: {
    user_id: string;
    tx_id: string;
    tx_name?: string;
    tx_merchant?: string;
  }): Promise<{ label_tx_id: Id }>;
  async discardUnstagedToTrash(
    a:
      | Id
      | {
        user_id: string;
        tx_id: string;
        tx_name?: unknown;
        tx_merchant?: unknown;
      },
    b?: Id,
    c?: string,
    d?: string,
  ): Promise<{ label_tx_id: Id }> {
    const user_id = a instanceof Id ? a : Id.from(a.user_id);
    const tx_id = a instanceof Id ? b! : Id.from(a.tx_id);
    const tx_name = a instanceof Id ? String(c) : String(a.tx_name ?? "");
    const tx_merchant = a instanceof Id
      ? String(d)
      : String(a.tx_merchant ?? "");

    // Delegate to stage by passing a single payload object, which it expects.
    return await this.stage({
      user_id: user_id.toString(),
      tx_id: tx_id.toString(),
      tx_name,
      tx_merchant,
      category_id: TRASH_CATEGORY_ID.toString(),
    });
  }

  async finalize(user_id: Id): Promise<void>;
  async finalize(payload: { user_id: string }): Promise<void>;
  async finalize(a: Id | { user_id: string }): Promise<void> {
    // narrow both styles
    const user_id = a instanceof Id ? a : Id.from(a.user_id);

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
  async cancelSession(user_id: Id): Promise<void>;
  async cancelSession(payload: { user_id: string }): Promise<void>;
  async cancelSession(a: Id | { user_id: string }): Promise<void> {
    // narrow both styles
    const user_id = a instanceof Id ? a : Id.from(a.user_id);

    // effects: deletes all StagedLabels for that user;
    await this.stagedLabels.deleteMany({ user_id: user_id.toString() });
  }

  /** Change the category for an existing label. */
  async update(
    user_id: Id,
    tx_id: Id,
    new_category_id: Id,
  ): Promise<{ label_tx_id: Id }>;
  async update(payload: {
    user_id: string;
    tx_id: string;
    new_category_id: string;
  }): Promise<{ label_tx_id: Id }>;
  async update(
    a: Id | { user_id: string; tx_id: string; new_category_id: string },
    b?: Id,
    c?: Id,
  ): Promise<{ label_tx_id: Id }> {
    // narrow both styles
    const user_id = a instanceof Id ? a : Id.from(a.user_id);
    const tx_id = a instanceof Id ? b! : Id.from(a.tx_id);
    const new_category_id = a instanceof Id ? c! : Id.from(a.new_category_id);

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
  async removeCommittedLabel(
    user_id: Id,
    tx_id: Id,
  ): Promise<{ label_tx_id: Id }>;
  async removeCommittedLabel(
    payload: { user_id: string; tx_id: string },
  ): Promise<{ label_tx_id: Id }>;
  async removeCommittedLabel(
    a: Id | { user_id: string; tx_id: string },
    b?: Id,
  ): Promise<{ label_tx_id: Id }> {
    // narrow both styles
    const user_id = a instanceof Id ? a : Id.from(a.user_id);
    const tx_id = a instanceof Id ? b! : Id.from(a.tx_id);

    await this.update(user_id, tx_id, TRASH_CATEGORY_ID);
    return { label_tx_id: tx_id };
  }

  // Queries for demos/tests.
  async getLabel(user_id: Id, tx_id: Id): Promise<LabelDoc[]>;
  async getLabel(
    payload: { user_id: string; tx_id: string },
  ): Promise<LabelDoc[]>;
  async getLabel(
    a: Id | { user_id: string; tx_id: string },
    b?: Id,
  ): Promise<LabelDoc[]> {
    // narrow both styles
    const user_id = a instanceof Id ? a : Id.from(a.user_id);
    const tx_id = a instanceof Id ? b! : Id.from(a.tx_id);

    const doc = await this.labels.findOne({
      _id: this.makeTxUserId(user_id, tx_id),
    });
    return doc ? [doc] : [];
  }
  async getTxInfo(user_id: Id, tx_id: Id) {
    return await this.txInfos.findOne({
      _id: this.makeTxUserId(user_id, tx_id),
    });
  }

  async getCategoryHistory(
    user_id: Id,
    category_id: Id,
  ): Promise<string[]>;
  async getCategoryHistory(
    payload: { user_id: string; category_id: string },
  ): Promise<string[]>;
  async getCategoryHistory(
    a: Id | { user_id: string; category_id: string },
    b?: Id,
  ): Promise<string[]> {
    // narrow both styles
    const user_id = a instanceof Id ? a : Id.from(a.user_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_id);

    const rows = await this.catTx.find({
      category_id: category_id.toString(),
      user_id: user_id.toString(),
    })
      .project({ tx_id: 1, _id: 0 })
      .toArray();
    return rows.map((r) => r.tx_id);
  }

  /**
   * Backwards-compatible helper: returns all tx_ids for a user/category.
   * Matches the requested get_category_tx name.
   */
  async get_category_tx(user_id: Id, category_id: Id): Promise<string[]>;
  async get_category_tx(
    payload: { user_id: string; category_id: string },
  ): Promise<string[]>;
  async get_category_tx(
    a: Id | { user_id: string; category_id: string },
    b?: Id,
  ): Promise<string[]> {
    const user_id = a instanceof Id ? a : Id.from(a.user_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_id);
    return await this.getCategoryHistory(user_id, category_id);
  }

  /**
   * Returns all tx_ids currently in the Trash category for a given user.
   * Delegates to `get_category_tx` with the built-in TRASH_CATEGORY_ID.
   */
  async get_tx_in_trash(user_id: Id): Promise<string[]>;
  async get_tx_in_trash(payload: { user_id: string }): Promise<string[]>;
  async get_tx_in_trash(a: Id | { user_id: string }): Promise<string[]> {
    const user_id = a instanceof Id ? a : Id.from(a.user_id);
    return await this.get_category_tx(user_id, TRASH_CATEGORY_ID);
  }

  async all(): Promise<LabelDoc[]> {
    return await this.labels.find().toArray();
  }

  /**
   * Returns all staged (not-yet-committed) labels for a given user.
   * @param user_id The ID of the user whose staged labels to fetch.
   */
  async getStagedLabels(user_id: Id): Promise<StagedLabelDoc[]>;
  async getStagedLabels(
    payload: { user_id: string },
  ): Promise<StagedLabelDoc[]>;
  async getStagedLabels(
    a: Id | { user_id: string },
  ): Promise<StagedLabelDoc[]> {
    const user_id = a instanceof Id ? a : Id.from(a.user_id);
    return await this.stagedLabels.find({ user_id: user_id.toString() })
      .toArray();
  }

  async hasAnyLabelsForCategory(
    user_id: Id,
    category_id: Id,
  ): Promise<boolean>;
  async hasAnyLabelsForCategory(
    payload: { user_id: string; category_id: string },
  ): Promise<boolean>;
  async hasAnyLabelsForCategory(
    a: Id | { user_id: string; category_id: string },
    b?: Id,
  ): Promise<boolean> {
    // narrow both styles
    const user_id = a instanceof Id ? a : Id.from(a.user_id);
    const category_id = a instanceof Id ? b! : Id.from(a.category_id);

    const count = await this.catTx.countDocuments({
      user_id: user_id.toString(),
      category_id: category_id.toString(),
    });
    return count > 0;
  }

  // more info about the transaction
  async suggest(
    user_id: Id,
    allCategories: [string, Id][],
    txInfo: TransactionInfo,
  ): Promise<{ suggestions: CategoryMeta[] }>;
  async suggest(payload: {
    user_id: string;
    allCategories: [string, string][];
    txInfo: { tx_id: string; tx_name: string; tx_merchant: string };
  }): Promise<{ suggestions: CategoryMeta[] }>;
  async suggest(
    a:
      | Id
      | {
        user_id: string;
        allCategories: [string, string][];
        txInfo: { tx_id: string; tx_name: string; tx_merchant: string };
      },
    b?: [string, Id][],
    c?: TransactionInfo,
  ): Promise<{ suggestions: CategoryMeta[] }> {
    // narrow both styles (use this.llm instead of accepting an llm param)
    const user_id = a instanceof Id ? a : Id.from(a.user_id);
    const allCategories = a instanceof Id
      ? b!
      : a.allCategories.map(([name, id]) =>
        [name, Id.from(id)] as [string, Id]
      );
    const txInfo = a instanceof Id ? c! : {
      tx_id: Id.from(a.txInfo.tx_id),
      tx_name: a.txInfo.tx_name,
      tx_merchant: a.txInfo.tx_merchant,
    };

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

      // Only use user_id to build history snapshot (per-owner history).
      const historyByCategory = await this.buildHistorySnapshot(
        user_id,
        categories,
      );

      const prompt = this.buildSuggestPrompt(
        user_id,
        categories,
        txInfo,
        historyByCategory,
      );

      const text = await this.llm.executeLLM(prompt);

      const chosen = this.parseFindSuggestResponse(text, categories);
      console.log("✅ Received response from Gemini AI!\n");

      return { suggestions: [chosen] };
    } catch (error) {
      console.error("❌ Error calling Gemini API:", (error as Error).message);
      throw error;
    }
  }

  private async buildHistorySnapshot(
    user_id: Id,
    categories: CategoryMeta[],
  ): Promise<Map<string, TransactionInfo[]>> {
    const out = new Map<string, TransactionInfo[]>();
    const userStr = user_id.toString();
    for (const c of categories) {
      const catKey = c.id.toString();
      // restrict catTx rows to this user
      const maps = await this.catTx.find({
        category_id: catKey,
        user_id: userStr,
      })
        .project<{ tx_id: string }>({ tx_id: 1, _id: 0 })
        .toArray();
      const txIds = maps.map((m) => m.tx_id);
      if (txIds.length === 0) {
        out.set(catKey, []);
        continue;
      }

      // txInfos stores _id as `${user_id}:${tx_id}`; construct composite ids
      const compositeIds = txIds.map((txId) => `${userStr}:${txId}`);
      const docs = await this.txInfos.find({ _id: { $in: compositeIds } })
        .toArray();

      const infos: TransactionInfo[] = docs.map((d) => {
        const parts = String(d._id).split(":", 2);
        const txId = parts.length === 2 ? parts[1] : d._id;
        return {
          tx_id: Id.from(txId),
          tx_name: d.tx_name,
          tx_merchant: d.tx_merchant,
        };
      });

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

### file: src\syncs\label.sync.ts

Now I'll update the `SuggestLabelResponseSuccess` sync to expect the new response shape from the `Label.suggest` action.

```typescript
import { actions, Frames, Sync } from "@engine";
import {
  Category,
  Label,
  Requesting,
  Sessioning,
  Transaction,
} from "@concepts";

//-- Stage Label --//
export const StageLabelRequest: Sync = (
  { request, session, user, tx_id, tx_name, tx_merchant, category_id },
) => ({
  when: actions([Requesting.request, {
    path: "/Label/stage",
    session,
    tx_id,
    tx_name,
    tx_merchant,
    category_id,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Label.stage, {
    user_id: user,
    tx_id,
    tx_name,
    tx_merchant,
    category_id,
  }]),
});

export const StageLabelResponseSuccess: Sync = (
  { request, label_tx_id },
) => ({
  when: actions(
    [Requesting.request, { path: "/Label/stage" }, { request }],
    [Label.stage, {}, { label_tx_id }],
  ),
  then: actions([Requesting.respond, { request, label_tx_id }]),
});

export const StageLabelResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/stage" }, { request }],
    [Label.stage, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Discard Unstaged Label to Trash --//
export const DiscardUnstagedToTrashRequest: Sync = (
  { request, session, user, tx_id, tx_name, tx_merchant },
) => ({
  when: actions([Requesting.request, {
    path: "/Label/discardUnstagedToTrash",
    session,
    tx_id,
    tx_name,
    tx_merchant,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Label.discardUnstagedToTrash, {
    user_id: user,
    tx_id,
    tx_name,
    tx_merchant,
  }]),
});

export const DiscardUnstagedToTrashResponseSuccess: Sync = (
  { request, label_tx_id },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Label/discardUnstagedToTrash" },
      { request },
    ],
    [Label.discardUnstagedToTrash, {}, { label_tx_id }],
  ),
  then: actions([Requesting.respond, { request, label_tx_id }]),
});

export const DiscardUnstagedToTrashResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Label/discardUnstagedToTrash" },
      { request },
    ],
    [Label.discardUnstagedToTrash, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Handles the user request to finalize all currently staged labels.
 * This has been split into multiple syncs to handle different outcomes:
 * 1. FinalizeStagedLabelsUnauthorized: Responds with an error if the session is invalid.
 * 2. FinalizeWithNoLabels: Handles the case where a user has no staged labels to finalize.
 * 3. FinalizeWithLabels: The main success path, processing all staged labels in bulk.
 *
 * This multi-sync approach correctly models the conditional logic without using a function
 * in the `then` clause, which resolves the errors from the previous implementation.
 */

// This sync handles the unauthorized case for the finalize request.
export const FinalizeStagedLabelsUnauthorized: Sync = (
  { request, session, user, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Label/finalize", session }, { request }],
  ),
  where: async (frames) => {
    const userFrames = await frames.query(Sessioning._getUser, { session }, {
      user,
    });
    // This sync only fires if the session is invalid (no user found).
    if (userFrames.length === 0) {
      // Add an error to the frame to be used in the `then` clause.
      return frames.map((f) => ({ ...f, [error]: "Unauthorized" }));
    }
    // Veto this sync by returning empty frames if a user is found.
    return new Frames();
  },
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

// This sync handles the case where there are no staged labels for an authorized user.
export const FinalizeWithNoLabels: Sync = (
  { request, session, user, stagedLabel },
) => ({
  when: actions(
    [Requesting.request, { path: "/Label/finalize", session }, { request }],
  ),
  where: async (frames) => {
    const userFrames = await frames.query(Sessioning._getUser, { session }, {
      user,
    });
    // Veto if unauthorized (handled by another sync).
    if (userFrames.length === 0) return new Frames();

    const stagedLabelFrames = await userFrames.query(Label.getStagedLabels, {
      user_id: user,
    }, { stagedLabel });
    // This sync only fires if there are NO staged labels.
    if (stagedLabelFrames.length === 0) {
      return userFrames; // Pass the frame with user binding through.
    }
    // Veto if there are labels (handled by another sync).
    return new Frames();
  },
  then: actions(
    // We still call finalize, which is idempotent and will clean up any (empty) state.
    [Label.finalize, { user_id: user }],
    [Requesting.respond, { request, ok: true }],
  ),
});

// This sync handles the main success path where staged labels exist and are processed in bulk.
export const FinalizeWithLabels: Sync = (
  {
    request,
    session,
    user,
    stagedLabel,
    tx,
    tx_ids_for_marking,
    tx_data_for_category,
  },
) => ({
  when: actions(
    [Requesting.request, { path: "/Label/finalize", session }, { request }],
  ),
  where: async (frames) => {
    const userFrames = await frames.query(Sessioning._getUser, { session }, {
      user,
    });
    if (userFrames.length === 0) return new Frames(); // Veto for unauthorized

    const initialFrameWithUser = userFrames[0];
    const userId = initialFrameWithUser[user];

    const stagedLabelFrames = await userFrames.query(Label.getStagedLabels, {
      user_id: user,
    }, { stagedLabel });
    if (stagedLabelFrames.length === 0) return new Frames(); // Veto for no labels

    const enrichedFrames = new Frames();
    for (const frame of stagedLabelFrames) {
      const sl = frame[stagedLabel] as any;
      try {
        const txDocFrame = await new Frames(frame).query(
          Transaction.getTransaction,
          { owner_id: userId, tx_id: sl.tx_id },
          { tx },
        );
        if (txDocFrame.length > 0) enrichedFrames.push(txDocFrame[0]);
      } catch (e) {
        console.warn(
          `Transaction details not found for staged label tx_id: ${sl.tx_id}. Skipping.`,
        );
      }
    }

    if (enrichedFrames.length === 0) {
      // This case means staged labels existed but none had corresponding transactions.
      // The `FinalizeWithNoLabels` sync will run `Label.finalize` which cleans up the invalid
      // staged labels, and then it will correctly respond. So, we veto this sync.
      return new Frames();
    }

    const tx_ids_to_mark = enrichedFrames.map((f) =>
      (f[stagedLabel] as any).tx_id
    );
    const category_payload = enrichedFrames.map((f) => {
      const sl = f[stagedLabel] as any;
      const txDoc = f[tx] as any;
      return {
        category_id: sl.category_id,
        tx_id: sl.tx_id,
        amount: txDoc.amount,
        tx_date: txDoc.date,
      };
    });

    return new Frames({
      ...initialFrameWithUser,
      [tx_ids_for_marking]: tx_ids_to_mark,
      [tx_data_for_category]: category_payload,
    });
  },
  then: actions(
    [Transaction.bulk_mark_labeled, {
      tx_ids: tx_ids_for_marking,
      requester_id: user,
    }],
    [Category.bulk_add_transaction, {
      owner_id: user,
      transactions: tx_data_for_category,
    }],
    [Label.finalize, { user_id: user }],
    [Requesting.respond, { request, ok: true }],
  ),
});
//-- Suggest Label --//
export const SuggestLabelRequest: Sync = (
  {
    request,
    session,
    user,
    tx_id,
    tx_name,
    tx_merchant,
    txInfo,
    category_id,
    name,
    allCategories,
  },
) => ({
  when: actions([Requesting.request, {
    path: "/Label/suggest",
    session,
    tx_id,
    tx_name,
    tx_merchant,
  }, { request }]),
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    if (frames.length === 0) {
      return new Frames(); // Invalid session, stops the sync
    }

    const categoryFrames = await frames.query(
      Category.getCategoriesFromOwner,
      { owner_id: user },
      { category_id, name },
    );

    const categories = categoryFrames.map((f) => [f[name], f[category_id]]);
    const originalFrame = frames[0];
    const txInfoValue = {
      tx_id: originalFrame[tx_id],
      tx_name: originalFrame[tx_name],
      tx_merchant: originalFrame[tx_merchant],
    };

    return new Frames({
      ...originalFrame,
      [allCategories]: categories,
      [txInfo]: txInfoValue,
    });
  },
  then: actions([Label.suggest, {
    user_id: user,
    allCategories,
    txInfo,
  }]),
});

export const SuggestLabelResponseSuccess: Sync = (
  { request, suggestions },
) => ({
  when: actions(
    [Requesting.request, { path: "/Label/suggest" }, { request }],
    [Label.suggest, {}, { suggestions }],
  ),
  then: actions([Requesting.respond, { request, suggestions }]),
});

export const SuggestLabelResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/suggest" }, { request }],
    [Label.suggest, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Cancel Labeling Session --//
export const CancelSessionRequest: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, {
    path: "/Label/cancelSession",
    session,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Label.cancelSession, { user_id: user }]),
});

export const CancelSessionResponseSuccess: Sync = ({ request, ok }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/cancelSession" }, { request }],
    // Assuming `cancelSession` is updated to return { ok: true } on success
    [Label.cancelSession, {}, { ok: true }],
  ),
  then: actions([Requesting.respond, { request, ok: true }]),
});

export const CancelSessionResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Label/cancelSession" }, { request }],
    [Label.cancelSession, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Remove Committed Label --//
export const RemoveCommittedLabelRequest: Sync = (
  { request, session, user, tx_id },
) => ({
  when: actions([Requesting.request, {
    path: "/Label/removeCommittedLabel",
    session,
    tx_id,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Label.removeCommittedLabel, { user_id: user, tx_id }]),
});

export const RemoveCommittedLabelResponseSuccess: Sync = (
  { request, label_tx_id },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Label/removeCommittedLabel" },
      { request },
    ],
    [Label.removeCommittedLabel, {}, { label_tx_id }],
  ),
  then: actions([Requesting.respond, { request, label_tx_id }]),
});

export const RemoveCommittedLabelResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Label/removeCommittedLabel" },
      { request },
    ],
    [Label.removeCommittedLabel, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

export const GetLabelRequest: Sync = (
  { request, session, user, tx_id, label, error },
) => ({
  when: actions([Requesting.request, {
    path: "/Label/getLabel",
    session,
    tx_id,
  }, { request }]),
  where: async (frames) => {
    const originalFrame = frames[0];

    // Authenticate the session to get the user
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // Handle unauthorized case where session is invalid
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [error]: "Unauthorized" });
    }

    // Assuming the user is authenticated, query for the label.
    // The `Label.getLabel` query returns a single document or null.
    // The engine translates a null/empty result into zero frames.
    const resultFrames = await frames.query(
      Label.getLabel,
      { user_id: user, tx_id },
      { label }, // The result from the query will be bound to the `label` variable.
    );

    // Handle the case where no label is found for the given transaction ID
    if (resultFrames.length === 0) {
      // Respond successfully but with a null value for the label.
      // We use `frames[0]` which contains the bindings from before the Label query.
      return new Frames({ ...frames[0], [label]: null });
    }

    // Return the successful frame containing the found label
    return resultFrames;
  },
  then: actions([Requesting.respond, { request, label, error }]),
});
```
