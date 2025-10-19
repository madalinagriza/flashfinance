---
timestamp: 'Thu Oct 16 2025 22:26:10 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_222610.3e2c3648.md]]'
content_id: 0480a9f59aa4e0016a86eac8dcca2491000ea1e17a1ff1ee3dc819cff16074f7
---

# file: src/concepts/FlashFinance/Label/label.ts

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

type CategoryMeta = { id: Id; name: string };

export interface TransactionInfo {
  tx_id: Id;
  tx_name: string;
  tx_merchant: string;
}

type LabelDoc = {
  _id: string;
  user_id: string;
  category_id: string;
  created_at: Date;
};
type TxInfoDoc = { _id: string; tx_name: string; tx_merchant: string };
type CatTxDoc = { _id: string; category_id: string; tx_id: string };

export class LabelStore {
  private labels: Collection<LabelDoc>;
  private txInfos: Collection<TxInfoDoc>;
  private catTx: Collection<CatTxDoc>;

  constructor(private readonly db: Db) {
    this.labels = db.collection(PREFIX + "labels");
    this.txInfos = db.collection(PREFIX + "tx_infos");
    this.catTx = db.collection(PREFIX + "cat_tx");
  }

  async apply(
    user_id: Id,
    tx_id: Id,
    tx_name: string,
    tx_merchant: string,
    category_id: Id,
  ): Promise<{ label_tx_id: Id }> {
    // make transactionInfo
    const key = tx_id.toString();
    const now = new Date();

    // snapshot (implementation detail; allowed)
    await this.txInfos.updateOne(
      { _id: key },
      { $set: { _id: key, tx_name, tx_merchant } },
      { upsert: true },
    );

    // add to history
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

    return { label_tx_id: tx_id };
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

    await this.catTx.deleteMany({ tx_id: key });
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
