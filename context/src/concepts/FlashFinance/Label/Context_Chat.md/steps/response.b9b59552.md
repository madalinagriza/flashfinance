---
timestamp: 'Thu Oct 16 2025 22:36:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_223650.b230b3f9.md]]'
content_id: b9b59552950d0b9eabe8de119e070926a77321b35b85cfc70af7eee9d2607e52
---

# response:

**src/concepts/FlashFinance/Label/test-AI/label-clear.ts**

```typescript
import { Id, LabelStore, TransactionInfo } from "../label.ts";
import { Config, GeminiLLM } from "../gemini-llm.ts";
import { testDb } from "@utils/database.ts";
import rawCfg from "../../../../../config.json" with { type: "json" };
const config: Config = rawCfg as Config;

export async function main() {
  const [db, client] = await testDb();
  const store = new LabelStore(db);
  const llm = new GeminiLLM(config);

  try {
    const user = Id.from("u1");

    // category ids + tuples (name, id)
    const catGroceries = Id.from("cat_groceries");
    const catClothes = Id.from("cat_clothes");
    const catUtilities = Id.from("cat_utilities");
    const categoriesTuples: [string, Id][] = [
      ["Groceries", catGroceries],
      ["Clothes", catClothes],
      ["Utilities", catUtilities],
    ];

    // seed: previously labeled examples (persisted in Mongo)
    await store.apply(
      user,
      Id.from("rx1"),
      "Whole Foods",
      "Whole Foods",
      catGroceries,
    );
    await store.apply(user, Id.from("rx2"), "H&M", "H&M", catClothes);
    await store.apply(
      user,
      Id.from("rx3"),
      "Electricity",
      "Eversource",
      catUtilities,
    );

    // unlabeled transactions to classify
    const txs: TransactionInfo[] = [
      {
        tx_id: Id.from("tx1"),
        tx_name: "Trader Joe’s",
        tx_merchant: "Trader Joe’s",
      },
      { tx_id: Id.from("tx2"), tx_name: "Uniqlo", tx_merchant: "Uniqlo" },
      {
        tx_id: Id.from("tx3"),
        tx_name: "National Grid",
        tx_merchant: "National Grid",
      },
    ];

    console.log("=== TEST 1 — CLEARLY SEPARATED CATEGORIES ===");
    for (const t of txs) {
      const suggested = await store.suggest(llm, user, categoriesTuples, t);
      console.log(
        `Tx ${t.tx_id.toString()} | ${t.tx_name} | ${t.tx_merchant} -> ${suggested.name}`,
      );
      console.log("---");
    }
  } finally {
    // always close the client the same way your Likert example does
    await client.close();
  }
}

if (import.meta.main) await main();
```
