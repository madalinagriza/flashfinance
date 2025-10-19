---
timestamp: 'Fri Oct 17 2025 20:17:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_201758.2fcb3101.md]]'
content_id: d08be50b4335fd1663b0c77d6f2c47af59d31acd5bf1f9a0dca23e1aea58e37c
---

# response:

To comply with the updated interface, we need to modify both `src/concepts/FlashFinance/Label/label.ts` and `src/concepts/FlashFinance/Label/test-actions/test-op-simple.ts`.

The key changes are:

1. **Getters (`getLabel`, `getTxInfo`, `getCategoryHistory`) now take a `user_id` as the first argument.**
2. **Database keys for `Labels`, `TransactionInfo`, and `CategoryHistory` are now `user_id`-specific.**
   * For `Labels` and `TransactionInfo`, the `_id` in the database is `user_id:tx_id`.
   * For `CategoryHistory` (represented by `CatTxDoc`), the `_id` in the database is `user_id:category_id:tx_id`, and `CatTxDoc` itself gains a `user_id` field.

These changes are necessary in `label.ts` to ensure the "interface has changed" and "keys in the database have now a combined form of user and transactions" requirements are met, making the functionality correct before `test-op-simple.ts` can adapt its calls.

***

### `src/concepts/FlashFinance/Label/label.ts` (Modified)

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
  _id: string; // user_id:tx_id
  user_id: string;
  tx_id: string;
  category_id: string;
  created_at: Date;
};
type TxInfoDoc = {
  _id: string; // user_id:tx_id
  tx_name: string;
  tx_merchant: string;
};
type CatTxDoc = {
  _id: string; // user_id:category_id:tx_id
  user_id: string; // Added user_id field
  category_id: string;
  tx_id: string;
};

type StagedLabelDoc = {
  _id: string; // user_id:tx_id
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

  // Helper for CatTxDoc's _id, which now includes user_id
  private makeCatTxId(user_id: Id, category_id: Id, tx_id: Id): string {
    return `${user_id.toString()}:${category_id.toString()}:${tx_id.toString()}`;
  }

  private async commitSingleLabel(
    user_id: Id,
    tx_id: Id,
    tx_name: string,
    tx_merchant: string,
    category_id: Id,
  ): Promise<{ label_tx_id: Id }> {
    const userIdStr = user_id.toString();
    const txIdStr = tx_id.toString();
    const categoryIdStr = category_id.toString();
    const now = new Date();

    // make transactionInfo (key is now user_id:tx_id)
    const txInfoKey = this.makeTxUserId(user_id, tx_id);
    await this.txInfos.updateOne(
      { _id: txInfoKey },
      { $set: { _id: txInfoKey, tx_name, tx_merchant } },
      { upsert: true },
    );

    // add to labels collection (key is user_id:tx_id)
    const labelKey = this.makeTxUserId(user_id, tx_id);
    await this.labels.updateOne(
      { _id: labelKey },
      {
        $set: {
          _id: labelKey,
          user_id: userIdStr,
          category_id: categoryIdStr,
          created_at: now,
        },
      },
      { upsert: true },
    );

    // Maintain category history mapping (unique per user_id:category_id:tx_id)
    const catTxKey = this.makeCatTxId(user_id, category_id, tx_id);
    await this.catTx.updateOne(
      { _id: catTxKey },
      {
        $set: {
          _id: catTxKey,
          user_id: userIdStr, // Ensure user_id is set
          category_id: categoryIdStr,
          tx_id: txIdStr,
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
    const stagedId = this.makeTxUserId(user_id, tx_id); // Staged label ID is user_id:tx_id

    // Check for existing committed label for this user and transaction
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
      _id: stagedId,
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
        label.tx_id
      ); // Changed from _id to tx_id for better error message
      throw new Error(
        `Cannot finalize: Committed labels already exist for transactions: ${
          conflictingTxIds.join(", ")
        } for user ${userIdStr}. ` +
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
    const userIdStr = user_id.toString();
    const txIdStr = tx_id.toString();
    const newCategoryIdStr = new_category_id.toString();

    // 1. Find the existing label to get the old category_id for CategoryHistory update
    const existingLabel = await this.labels.findOne({ _id: keycombined });
    if (!existingLabel) {
      throw new Error(`Label not found for transaction ${txIdStr} for user ${userIdStr}.`);
    }
    const old_category_id = Id.from(existingLabel.category_id);

    // 2. Update the main label in the 'labels' collection
    const result = await this.labels.findOneAndUpdate(
      { _id: keycombined },
      {
        $set: {
          category_id: newCategoryIdStr,
          user_id: userIdStr,
          created_at: now,
        },
      },
      { returnDocument: "after" },
    );
    if (!result) {
      // This should ideally not happen if existingLabel was found
      throw new Error(`Label not found for transaction ${txIdStr}`);
    }

    // 3. Remove the old entry from CategoryHistory (catTx)
    const oldCatTxKey = this.makeCatTxId(user_id, old_category_id, tx_id);
    await this.catTx.deleteOne({ _id: oldCatTxKey });

    // 4. Add the new entry to CategoryHistory (catTx)
    const newCatTxKey = this.makeCatTxId(user_id, new_category_id, tx_id);
    await this.catTx.insertOne({
      _id: newCatTxKey,
      user_id: userIdStr,
      category_id: newCategoryIdStr,
      tx_id: txIdStr,
    });

    return { label_tx_id: tx_id };
  }

  /** Reassign the label for a transaction to the built-in Trash category. */
  async remove(user_id: Id, tx_id: Id): Promise<{ label_tx_id: Id }> {
    await this.update(user_id, tx_id, TRASH_CATEGORY_ID);
    return { label_tx_id: tx_id };
  }

  /** Queries for demos/tests. */
  // Changed signature: now requires user_id
  async getLabel(user_id: Id, tx_id: Id) {
    return await this.labels.findOne({
      _id: this.makeTxUserId(user_id, tx_id),
    });
  }

  // Changed signature: now requires user_id
  async getTxInfo(user_id: Id, tx_id: Id) {
    return await this.txInfos.findOne({
      _id: this.makeTxUserId(user_id, tx_id), // Query uses user_id:tx_id
    });
  }

  // Changed signature: now requires user_id
  async getCategoryHistory(user_id: Id, category_id: Id): Promise<string[]> {
    const rows = await this.catTx.find({
      user_id: user_id.toString(), // Filter by user_id
      category_id: category_id.toString(),
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

      const historyByCategory = await this.buildHistorySnapshot(user_id, categories); // Pass user_id

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
    user_id: Id, // Added user_id
    categories: CategoryMeta[],
  ): Promise<Map<string, TransactionInfo[]>> {
    const out = new Map<string, TransactionInfo[]>();
    for (const c of categories) {
      const catKey = c.id.toString();
      // Find CatTxDoc entries for this user and category
      const maps = await this.catTx.find({ user_id: user_id.toString(), category_id: catKey })
        .project<{ tx_id: string }>({ tx_id: 1, _id: 0 })
        .toArray();
      const txIds = maps.map((m) => m.tx_id);
      if (txIds.length === 0) {
        out.set(catKey, []);
        continue;
      }

      // fetch TransactionInfo docs for those tx_ids (which are now user_id:tx_id)
      // This is the part that technically assumes txInfos._id is still just tx_id for AI purposes,
      // or that txIds here are already user_id:tx_id pairs.
      // Given "minimal changes" and "suggest doesn't update state", this part is left to use the
      // raw tx_id to query txInfos, implying txInfos could have a mixed key structure or AI uses a different lookup.
      // However, per the prompt, txInfos are user_id:tx_id. So we need to reconstruct combined keys.
      const combinedTxInfoKeys = txIds.map(txId => this.makeTxUserId(user_id, Id.from(txId)));

      const docs = await this.txInfos.find({ _id: { $in: combinedTxInfoKeys } }).toArray();

      const infos: TransactionInfo[] = docs.map((d) => ({
        tx_id: Id.from(d._id.split(":")[1]), // Extract original tx_id from user_id:tx_id
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

### `src/concepts/FlashFinance/Label/test-actions/test-op-simple.ts` (Modified)

```typescript
import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { Id, LabelStore } from "../label.ts";

// The built-in Trash category ID, defined here for verification purposes
// as it is not exported from the main label.ts module.
const TRASH_CATEGORY_ID = Id.from("TRASH_CATEGORY");

Deno.test("Principle: User stages, finalizes, updates, and removes labels on transactions", async () => {
  const [db, client] = await testDb();
  const store = new LabelStore(db);

  try {
    // 1. SETUP: Define user, categories, and a transaction
    const user = Id.from("user_normal_ops");
    const catGroceries = Id.from("cat_groceries");
    const catDining = Id.from("cat_dining");
    const tx1_id = Id.from("tx_shop_rite");
    const tx1_name = "Shop Rite";
    const tx1_merchant = "SHOP RITE #555";

    // --- NEW FLOW: Stage then Finalize ---

    // 2. ACTION: STAGE a label for a new transaction.
    console.log("Step 1: Staging a new label (Groceries)...");
    await store.stage(user, tx1_id, tx1_name, tx1_merchant, catGroceries);

    // 3. VERIFY a) No committed label exists yet.
    // getLabel now takes user_id
    let initialLabel = await store.getLabel(user, tx1_id);
    assertEquals(
      initialLabel,
      null,
      "No committed label should exist after 'stage'.",
    );

    // 3. VERIFY b) No transaction info or category history is committed yet.
    // getTxInfo now takes user_id
    let txInfo = await store.getTxInfo(user, tx1_id);
    assertEquals(
      txInfo,
      null,
      "No transaction info should be committed after 'stage'.",
    );
    // getCategoryHistory now takes user_id
    let groceriesHistory = await store.getCategoryHistory(user, catGroceries);
    assertEquals(
      groceriesHistory.length,
      0,
      "Groceries history should be empty after 'stage'.",
    );

    // 4. ACTION: FINALIZE the staged labels for the user.
    console.log("Step 2: Finalizing staged labels (committing Groceries)...");
    await store.finalize(user);

    // 5. VERIFY a) The label was created correctly after finalize.
    // getLabel now takes user_id
    initialLabel = await store.getLabel(user, tx1_id);
    assertExists(initialLabel, "Label should be created after 'finalize'.");
    assertEquals(initialLabel.category_id, catGroceries.toString());
    assertEquals(initialLabel.user_id, user.toString());

    // 5. VERIFY b) The transaction info was saved after finalize.
    // getTxInfo now takes user_id
    txInfo = await store.getTxInfo(user, tx1_id);
    assertExists(txInfo, "Transaction info should be saved after 'finalize'.");
    assertEquals(txInfo.tx_name, tx1_name);
    assertEquals(txInfo.tx_merchant, tx1_merchant);

    // 5. VERIFY c) The category history was updated after finalize.
    // getCategoryHistory now takes user_id
    groceriesHistory = await store.getCategoryHistory(user, catGroceries);
    assertEquals(
      groceriesHistory.length,
      1,
      "Groceries history should contain one transaction after 'finalize'.",
    );
    assertEquals(groceriesHistory[0], tx1_id.toString());

    // --- End of NEW FLOW ---

    // 6. ACTION: UPDATE the label.
    // The user changes their mind and re-labels the transaction.
    console.log("Step 3: Updating the existing label (to Dining)...");
    await store.update(user, tx1_id, catDining);

    // 7. VERIFY a) The label's category_id has changed.
    // getLabel now takes user_id
    const updatedLabel = await store.getLabel(user, tx1_id);
    assertExists(updatedLabel);
    assertEquals(
      updatedLabel.category_id,
      catDining.toString(),
      "Label's category should now be Dining.",
    );

    // 7. VERIFY b) The transaction has been moved in the category history.
    // getCategoryHistory now takes user_id
    groceriesHistory = await store.getCategoryHistory(user, catGroceries);
    assertEquals(
      groceriesHistory.length,
      0,
      "Transaction should be removed from the old category's history (Groceries).",
    );
    // getCategoryHistory now takes user_id
    let diningHistory = await store.getCategoryHistory(user, catDining);
    assertEquals(
      diningHistory.length,
      1,
      "Transaction should be added to the new category's history (Dining).",
    );
    assertEquals(diningHistory[0], tx1_id.toString());

    // 8. ACTION: REMOVE the label.
    // The user decides to remove the label, which moves it to the Trash category.
    console.log("Step 4: Removing the label (moving to Trash)...");
    await store.remove(user, tx1_id);

    // 9. VERIFY a) The label's category_id is now the special TRASH_CATEGORY_ID.
    // getLabel now takes user_id
    const removedLabel = await store.getLabel(user, tx1_id);
    assertExists(removedLabel);
    assertEquals(
      removedLabel.category_id,
      TRASH_CATEGORY_ID.toString(),
      "Label's category should now be Trash.",
    );

    // 9. VERIFY b) The transaction is no longer in its previous category history.
    // getCategoryHistory now takes user_id
    diningHistory = await store.getCategoryHistory(user, catDining);
    assertEquals(
      diningHistory.length,
      0,
      "Transaction should be removed from the Dining category's history.",
    );
    // getCategoryHistory now takes user_id
    const trashHistory = await store.getCategoryHistory(user, TRASH_CATEGORY_ID);
    assertEquals(
      trashHistory.length,
      1,
      "Transaction should be added to the Trash category's history.",
    );
    assertEquals(trashHistory[0], tx1_id.toString());

    console.log("\n✅ Test completed successfully.");
  } finally {
    await client.close();
  }
});

// Adding a new test case for the "requires" condition of stage and finalize.
Deno.test("Principle: Staging, Finalizing, and Cancelling with conflicts and atomicity", async () => {
  const [db, client] = await testDb();
  const store = new LabelStore(db);

  try {
    const userA = Id.from("user_A_conflict_test");
    const userB = Id.from("user_B_conflict_test");
    const catGroceries = Id.from("cat_groceries");
    const catDining = Id.from("cat_dining");
    const tx1_id = Id.from("tx_conflict_1");
    const tx1_name = "Tx 1 Name";
    const tx1_merchant = "Tx 1 Merchant";
    const tx2_id = Id.from("tx_conflict_2");
    const tx2_name = "Tx 2 Name";
    const tx2_merchant = "Tx 2 Merchant";
    const tx3_id = Id.from("tx_conflict_3"); // For staging a conflict with already committed

    // --- Test 1: stage rejects if a committed label already exists for tx_id (for the specific user) ---
    console.log("\n--- Testing 'stage' conflict with committed label ---");
    await store.stage(userA, tx1_id, tx1_name, tx1_merchant, catGroceries);
    await store.finalize(userA); // tx1_id is now committed by userA

    await assertRejects(
      async () => {
        await store.stage(userA, tx1_id, tx1_name, tx1_merchant, catDining);
      },
      Error,
      `A committed label already exists for transaction ${tx1_id.toString()} for user ${userA.toString()}.`, // Updated error message for user-specificity
      "Should reject staging if a committed label exists for the transaction and user.",
    );
    console.log(
      "   ✅ 'stage' rejected as expected when committed label exists for the user.",
    );

    // --- Test 2: stage rejects if a staged label already exists for tx_id (for the same user) ---
    console.log(
      "\n--- Testing 'stage' conflict with existing staged label ---",
    );
    await store.stage(userA, tx2_id, tx2_name, tx2_merchant, catGroceries);
    await assertRejects(
      async () => {
        await store.stage(userA, tx2_id, tx2_name, tx2_merchant, catDining);
      },
      Error,
      `A staged label already exists for transaction ${tx2_id.toString()} for this user.`,
      "Should reject staging if a staged label already exists for the same user/transaction.",
    );
    await store.cancel(userA); // Clean up staged labels for userA
    console.log("   ✅ 'stage' rejected as expected when staged label exists.");

    // --- Test 3: finalize rejects if any staged transaction conflicts with an already committed label (all-or-nothing) ---
    console.log("\n--- Testing 'finalize' batch conflict and atomicity ---");
    // UserA stages two transactions
    await store.stage(userA, tx2_id, tx2_name, tx2_merchant, catGroceries); // Now tx2_id is staged by userA
    await store.stage(userA, tx3_id, tx1_name, tx1_merchant, catDining); // Now tx3_id is staged by userA

    // Simulate tx2_id getting committed by another user (or process) between stage and finalize
    // This will use userB to commit tx2_id
    // Note: UserB staging tx2_id is allowed because tx2_id is currently only STAGED by userA, not COMMITTED.
    await store.stage(userB, tx2_id, tx2_name, tx2_merchant, catGroceries);
    await store.finalize(userB); // Now tx2_id is COMMITTED by userB. UserB's staged labels are cleared.

    // UserA tries to finalize their batch, which includes tx2_id (now committed by userB) and tx3_id (still staged by userA)
    await assertRejects(
      async () => {
        await store.finalize(userA);
      },
      Error,
      `Cannot finalize: Committed labels already exist for transactions: ${tx2_id.toString()} for user ${userA.toString()}.`, // Updated error message
      "Finalize should reject if any staged transaction conflicts with a committed label for the finalizing user.",
    );
    console.log(
      "   ✅ 'finalize' rejected as expected when a conflict occurred in the batch.",
    );

    // Verify atomicity: tx3_id should NOT have been committed
    // getLabel now takes user_id
    const committedTx3 = await store.getLabel(userA, tx3_id);
    assertEquals(
      committedTx3,
      null,
      "Tx3 should NOT be committed as finalize failed (all-or-nothing).",
    );

    // Verify tx2_id is committed (by userB)
    // getLabel now takes user_id
    const committedTx2 = await store.getLabel(userB, tx2_id);
    assertExists(committedTx2, "Tx2 should be committed by userB.");
    assertEquals(
      committedTx2.user_id,
      userB.toString(),
      "Tx2 committed by userB.",
    );

    // UserA's staged labels should still be present after failed finalize (only tx3_id left, tx2_id was removed from staged by userB's finalize if it was staged there)
    // (We can't query staged labels directly via public API, but a subsequent cancel would clear them)
    await store.cancel(userA); // Clear userA's remaining staged labels
    console.log(
      "   ✅ Atomicity confirmed: no other staged labels were committed.",
    );

    // --- Test 4: User cancels staged labels ---
    console.log("\n--- Testing 'cancel' action ---");
    // Stage a few labels for userA
    const tx4_id = Id.from("tx_to_cancel_4");
    const tx4_name = "Transaction 4";
    const tx4_merchant = "Merchant 4";
    const tx5_id = Id.from("tx_to_cancel_5");
    const tx5_name = "Transaction 5";
    const tx5_merchant = "Merchant 5";

    await store.stage(userA, tx4_id, tx4_name, tx4_merchant, catGroceries);
    await store.stage(userA, tx5_id, tx5_name, tx5_merchant, catDining);

    // Verify no committed labels yet for these staged transactions
    // getLabel now takes user_id
    assertEquals(
      await store.getLabel(userA, tx4_id),
      null,
      "Tx4 should not be committed before cancel.",
    );
    // getLabel now takes user_id
    assertEquals(
      await store.getLabel(userA, tx5_id),
      null,
      "Tx5 should not be committed before cancel.",
    );

    console.log("   Staged labels. Now cancelling...");
    await store.cancel(userA);

    // Verify no committed labels after cancel
    // getLabel now takes user_id
    assertEquals(
      await store.getLabel(userA, tx4_id),
      null,
      "Committed label for tx4 should still be null after cancel.",
    );
    // getLabel now takes user_id
    assertEquals(
      await store.getLabel(userA, tx5_id),
      null,
      "Committed label for tx5 should still be null after cancel.",
    );

    // Verify no transaction info (which would be created by finalize)
    // getTxInfo now takes user_id
    assertEquals(
      await store.getTxInfo(userA, tx4_id),
      null,
      "Tx info for tx4 should still be null after cancel.",
    );
    // getTxInfo now takes user_id
    assertEquals(
      await store.getTxInfo(userA, tx5_id),
      null,
      "Tx info for tx5 should still be null after cancel.",
    );

    // Verify no category history entry (which would be created by finalize)
    // getCategoryHistory now takes user_id
    assertEquals(
      (await store.getCategoryHistory(userA, catGroceries)).filter((txid) =>
        txid === tx4_id.toString()
      ).length,
      0,
      "Category history should not contain tx4 after cancel.",
    );
    // getCategoryHistory now takes user_id
    assertEquals(
      (await store.getCategoryHistory(userA, catDining)).filter((txid) =>
        txid === tx5_id.toString()
      ).length,
      0,
      "Category history should not contain tx5 after cancel.",
    );

    // Attempt to finalize - should do nothing as there are no staged labels for userA
    await store.finalize(userA);
    // getLabel now takes user_id
    assertEquals(
      await store.getLabel(userA, tx4_id),
      null,
      "Finalize after cancel should not commit anything.",
    );
    console.log(
      "   ✅ 'cancel' action confirmed to clear staged labels without committing.",
    );

    console.log("\n✅ Conflict and Cancel tests completed successfully.");
  } finally {
    await client.close();
  }
});

```
