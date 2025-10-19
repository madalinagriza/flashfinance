---
timestamp: 'Fri Oct 17 2025 19:16:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_191630.2b8d80c8.md]]'
content_id: ac4a7ea67ccd5d39cd8796b4ded44cfa126b239a1dc9d5aefd10d631eb6907b7
---

# response:

To implement the new `stage`, `finalize`, and `cancel` actions and modify `label.ts` accordingly, the following changes have been made:

1. **StagedLabel Data Structures:**
   * Added `StagedLabel` interface and `StagedLabelDoc` type to represent pending labels. Each `StagedLabel` will correspond to a single transaction and its proposed category.
2. **`stagedLabels` Collection:**
   * A new MongoDB collection `stagedLabels` has been added to the `LabelStore` to persist `StagedLabelDoc` instances.
3. **Refactored `apply` to `_commitSingleLabel`:**
   * The original `apply` method, which directly wrote to history, has been renamed to `_commitSingleLabel` and made a `private` helper method. This encapsulates the logic for committing a single label, which `finalize` will now leverage.
4. **`stage` Action:**
   * Implemented to create a `StagedLabelDoc` in the `stagedLabels` collection.
   * It includes `requires` checks:
     * Ensures no committed label exists for the `tx_id`.
     * Ensures no staged label already exists for the `tx_id` by the same user.
5. **`finalize` Action:**
   * Implemented to process all `StagedLabels` belonging to a given `user_id`.
   * It performs a critical `requires` check upfront: it verifies that *no committed label exists* for any of the transactions being finalized. If conflicts are found, it throws an error and prevents any staged labels from being committed, maintaining an all-or-nothing approach for the batch.
   * For each valid `StagedLabel`, it calls the `_commitSingleLabel` helper to write the label, transaction info, and category history to the main collections.
   * After successfully processing all staged labels, it wipes (deletes) all `StagedLabels` for that `user_id` from the `stagedLabels` collection.
6. **`cancel` Action:**
   * Implemented to delete all `StagedLabels` associated with a specific `user_id`, effectively discarding the pending session without affecting committed labels.
7. **`update` and `remove` Actions:**
   * These actions operate on *committed* labels and do not interact with staged labels. They remain unchanged, fulfilling the "minimal changes" requirement.
8. **`suggest` Function:**
   * This function is stateless and does not interact with staged labels, so it also remains unchanged.

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

export interface Label {
  tx_id: Id;
  category_id: Id;
  user_id: Id;
  created_at: Date;
}

// New: StagedLabel record
export interface StagedLabel {
  tx_id: Id; // This effectively serves as the stagedlabel_id
  user_id: Id;
  category_id: Id;
  tx_name: string;
  tx_merchant: string;
  staged_at: Date;
}

type CategoryMeta = { id: Id; name: string };

export interface TransactionInfo {
  tx_id: Id;
  tx_name: string;
  tx_merchant: string;
}

type LabelDoc = {
  _id: string; // tx_id.toString()
  user_id: string;
  category_id: string;
  created_at: Date;
};
type TxInfoDoc = { _id: string; tx_name: string; tx_merchant: string };
type CatTxDoc = { _id: string; category_id: string; tx_id: string };

// New: StagedLabelDoc type for MongoDB
type StagedLabelDoc = {
  _id: string; // tx_id.toString()
  user_id: string;
  category_id: string;
  tx_name: string;
  tx_merchant: string;
  staged_at: Date;
};

export class LabelStore {
  private labels: Collection<LabelDoc>;
  private txInfos: Collection<TxInfoDoc>;
  private catTx: Collection<CatTxDoc>;
  private stagedLabels: Collection<StagedLabelDoc>; // New collection for pending labels

  constructor(private readonly db: Db) {
    this.labels = db.collection(PREFIX + "labels");
    this.txInfos = db.collection(PREFIX + "tx_infos");
    this.catTx = db.collection(PREFIX + "cat_tx");
    this.stagedLabels = db.collection(PREFIX + "staged_labels"); // Initialize new collection
  }

  // Renamed from 'apply' and made private. Its logic is now used by 'finalize'.
  private async _commitSingleLabel(
    user_id: Id,
    tx_id: Id,
    tx_name: string,
    tx_merchant: string,
    category_id: Id,
  ): Promise<void> {
    const key = tx_id.toString();
    const now = new Date();

    // snapshot (implementation detail; allowed)
    await this.txInfos.updateOne(
      { _id: key },
      { $set: { _id: key, tx_name, tx_merchant } },
      { upsert: true },
    );

    // add to history (Labels)
    await this.labels.updateOne(
      { _id: key },
      {
        $set: {
          _id: key,
          user_id: user_id.toString(),
          category_id: category_id.toString(),
          created_at: now,
        },
      },
      { upsert: true },
    );
    // Maintain category history mapping (unique per (category_id, tx_id))
    const mapId = `${category_id.toString()}_${key}`;
    await this.catTx.updateOne(
      { _id: mapId },
      {
        $set: {
          _id: mapId,
          category_id: category_id.toString(),
          tx_id: key,
        },
      },
      { upsert: true },
    );
  }

  /**
   * Stages a label for a transaction, holding it in a pending state.
   * @param user_id The ID of the user staging the label.
   * @param tx_id The ID of the transaction to be labeled.
   * @param tx_name The name of the transaction.
   * @param tx_merchant The merchant of the transaction.
   * @param category_id The ID of the category to assign.
   * @returns An object containing the transaction ID that was staged.
   */
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

    // Check for existing committed label
    const existingLabel = await this.labels.findOne({ _id: txIdStr });
    if (existingLabel) {
      throw new Error(`A committed label already exists for transaction ${txIdStr}.`);
    }

    // Check for existing staged label by the same user for this tx_id
    const existingStagedLabel = await this.stagedLabels.findOne({ _id: txIdStr, user_id: userIdStr });
    if (existingStagedLabel) {
      throw new Error(`A staged label already exists for transaction ${txIdStr} for this user.`);
    }

    const now = new Date();
    const stagedLabelDoc: StagedLabelDoc = {
      _id: txIdStr, // Using tx_id as the stagedlabel_id
      user_id: userIdStr,
      category_id: category_id.toString(),
      tx_name: tx_name,
      tx_merchant: tx_merchant,
      staged_at: now,
    };

    await this.stagedLabels.insertOne(stagedLabelDoc);

    return { label_tx_id: tx_id };
  }

  /**
   * Finalizes all staged labels for a user, committing them to history.
   * @param user_id The ID of the user whose staged labels are to be finalized.
   */
  async finalize(user_id: Id): Promise<void> {
    const userIdStr = user_id.toString();

    // Find all staged labels for the user
    const stagedDocs = await this.stagedLabels.find({ user_id: userIdStr }).toArray();

    if (stagedDocs.length === 0) {
      return; // No staged labels to finalize
    }

    // requires: for each StagedLabel belonging to the user: no committed label exists for `tx_id`
    // This check is performed for the entire batch to ensure atomicity.
    const txIdsToFinalize = stagedDocs.map(doc => doc._id);
    const existingCommittedLabels = await this.labels.find({ _id: { $in: txIdsToFinalize } }).toArray();

    if (existingCommittedLabels.length > 0) {
      const conflictingTxIds = existingCommittedLabels.map(label => label._id);
      throw new Error(
        `Cannot finalize: Committed labels already exist for transactions: ${conflictingTxIds.join(", ")}. ` +
        `Please remove or update these transactions before finalizing their staged labels.`
      );
    }

    // effects: for each StagedLabel belonging to the user, do what _commitSingleLabel implements
    for (const doc of stagedDocs) {
      await this._commitSingleLabel(
        Id.from(doc.user_id),
        Id.from(doc._id), // _id is tx_id
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
    const key = tx_id.toString();
    const now = new Date();

    const result = await this.labels.findOneAndUpdate(
      { _id: key },
      {
        $set: {
          category_id: new_category_id.toString(),
          user_id: user_id.toString(),
          created_at: now,
        },
      },
      { returnDocument: "after" },
    );
    if (!result) throw new Error(`Label not found for transaction ${key}`);

    // Update catTx (category history)
    // First, remove old category mapping for this tx_id
    await this.catTx.deleteMany({ tx_id: key });
    // Then, add new category mapping
    const mapId = `${new_category_id.toString()}_${key}`;
    await this.catTx.updateOne(
      { _id: mapId },
      { $set: { category_id: new_category_id.toString(), tx_id: key } },
      { upsert: true },
    );

    return { label_tx_id: tx_id };
  }

  /** Reassign the label for a transaction to the built-in Trash category. */
  async remove(user_id: Id, tx_id: Id): Promise<{ label_tx_id: Id }> {
    // This implicitly calls the update method, which operates on committed labels.
    await this.update(user_id, tx_id, TRASH_CATEGORY_ID);
    return { label_tx_id: tx_id };
  }

  /** Queries for demos/tests. */
  async getLabel(tx_id: Id) {
    return await this.labels.findOne({ _id: tx_id.toString() });
  }

  async getTxInfo(tx_id: Id) {
    return await this.txInfos.findOne({ _id: tx_id.toString() });
  }

  async getCategoryHistory(category_id: Id): Promise<string[]> {
    const rows = await this.catTx.find({ category_id: category_id.toString() })
      .project({ tx_id: 1, _id: 0 }).toArray();
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
