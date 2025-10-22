import LabelConcept, { Id, TransactionInfo } from "../LabelConcept.ts";
import { Config, GeminiLLM } from "../gemini-llm.ts";
import { testDb } from "@utils/database.ts";
import rawCfg from "../../../../config.json" with { type: "json" };

const config: Config = rawCfg as Config;

export async function main() {
  const [db, client] = await testDb();
  const store = new LabelConcept(db);
  const llm = new GeminiLLM(config);
  try {
    const user = Id.from("u2");

    // category ids
    const catGroceries = Id.from("cat_groceries");
    const catCoffee = Id.from("cat_coffee");
    const catRestaurants = Id.from("cat_restaurants");
    const catTakeout = Id.from("cat_takeout");

    // category tuples (name, id)
    const categoriesTuples: [string, Id][] = [
      ["Groceries", catGroceries],
      ["Coffee Shops", catCoffee],
      ["Restaurants", catRestaurants],
      ["Takeout / Delivery", catTakeout],
    ];

    // previously labeled transactions to seed the store
    const previous: [Id, string, string, Id][] = [
      [Id.from("p1"), "Blue Bottle Coffee", "Blue Bottle", catCoffee],
      [Id.from("p2"), "Starbucks order", "Starbucks", catCoffee],
      [Id.from("p3"), "Chipotle dine-in", "Chipotle", catRestaurants],
      [Id.from("p4"), "Trader Joe’s groceries", "Trader Joe’s", catGroceries],
      [
        Id.from("p5"),
        "DoorDash Sweetgreen",
        "DoorDash - Sweetgreen",
        catTakeout,
      ],
    ];

    // apply previous labels
    for (const [txId, txName, txMerchant, catId] of previous) {
      store.stage(user, txId, txName, txMerchant, catId);
    }
    await store.finalize(user);
    // test transactions (no amount/date; consistent with TxInfo)
    const txs: TransactionInfo[] = [
      // clear coffee
      {
        tx_id: Id.from("t1"),
        tx_name: "Starbucks #1234",
        tx_merchant: "Starbucks #1234",
      },
      // sit-down restaurant
      {
        tx_id: Id.from("t2"),
        tx_name: "Olive Garden",
        tx_merchant: "Olive Garden",
      },
      // delivery: messy platform string + merchant
      {
        tx_id: Id.from("t3"),
        tx_name: "DoorDash * Shake Shack",
        tx_merchant: "DoorDash * Shake Shack",
      },
      // groceries
      {
        tx_id: Id.from("t4"),
        tx_name: "Whole Foods Market",
        tx_merchant: "Whole Foods Market",
      },
      // ambiguous coffee counter inside grocery
      {
        tx_id: Id.from("t5"),
        tx_name: "Trader Joe’s Coffee Bar",
        tx_merchant: "Trader Joe’s Coffee Bar",
      },
    ];

    console.log("=== TEST 2 — SUBTLE FOOD DISTINCTIONS ===");
    for (const t of txs) {
      const suggested = await store.suggest(llm, user, categoriesTuples, t);
      console.log(
        `Tx ${t.tx_id.toString()} | ${t.tx_name} | ${t.tx_merchant} -> ${suggested.name}`,
      );
      console.log("---\n");
    }
  } finally {
    await client.close();
  }
}
main();
