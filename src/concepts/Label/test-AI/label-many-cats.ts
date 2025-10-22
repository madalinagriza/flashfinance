import LabelConcept, { Id, TransactionInfo } from "../LabelConcept.ts";
import { Config, GeminiLLM } from "../gemini-llm.ts";
import { testDb } from "@utils/database.ts";
import rawCfg from "../../../../config.json" with { type: "json" };

const config: Config = rawCfg as Config;

type TxInfo = { tx_id: Id; tx_name: string; tx_merchant: string };

export async function main() {
  const [db, client] = await testDb();
  const store = new LabelConcept(db);
  const llm = new GeminiLLM(config);

  try {
    const user = Id.from("u3");
    const catGroceries = Id.from("cat_groceries");
    const catHousehold = Id.from("cat_household");
    const catHomeImprove = Id.from("cat_homeImprove");
    const catTransit = Id.from("cat_transit");
    const catHealth = Id.from("cat_health");
    const catEntertain = Id.from("cat_entertain");
    const catMisc = Id.from("cat_misc");

    const categoriesTuples: [string, Id][] = [
      ["Groceries", catGroceries],
      ["HouseHold Supplies", catHousehold],
      ["Home Improvement", catHomeImprove],
      ["Transit", catTransit],
      ["Health & Pharmacy", catHealth],
      ["Entertainment", catEntertain],
      ["Miscellaneous", catMisc],
    ];

    const previous: [Id, string, string, Id][] = [
      [Id.from("tx1"), "Ibuprofen", "CVS Pharmacy", catHealth],
      [Id.from("tx2"), "Home Depot", "Home Depot", catHomeImprove],
      [Id.from("tx3"), "Wood", "Lowe’s", catHomeImprove],
      [Id.from("tx4"), "Target", "Target", catHousehold],
      [Id.from("tx5"), "Containers", "Amazon Pantry", catGroceries],
      [Id.from("tx6"), "Superman", "AMC Theatres", catEntertain],
      [Id.from("tx7"), "MTA ticket", "MTA", catTransit],
    ];
    for (const transaction of previous) {
      store.stage(
        user,
        transaction[0],
        transaction[1],
        transaction[2],
        transaction[3],
      );
    }
    await store.finalize(user);
    const txs: TransactionInfo[] = [
      {
        tx_id: Id.from("m1"),
        tx_name: "Home Depot",
        tx_merchant: "Home Depot",
      },
      { tx_id: Id.from("m2"), tx_name: "Target", tx_merchant: "Target" },
      {
        tx_id: Id.from("m3"),
        tx_name: "Ace Hardware",
        tx_merchant: "Ace Hardware",
      },
      {
        tx_id: Id.from("m4"),
        tx_name: "Lyft * Ride",
        tx_merchant: "Lyft * Ride",
      },
      {
        tx_id: Id.from("m5"),
        tx_name: "Steam Purchase",
        tx_merchant: "Steam Purchase",
      },
      {
        tx_id: Id.from("m6"),
        tx_name: "Walmart Supercenter",
        tx_merchant: "Walmart Supercenter",
      },
      { tx_id: Id.from("m7"), tx_name: "Walgreens", tx_merchant: "Walgreens" },
    ];

    console.log("=== TEST 3 — MANY CATEGORIES + NEAR-COLLISIONS ===");
    for (const t of txs) {
      const suggested = await store.suggest(llm, user, categoriesTuples, t);
      console.log(
        `Tx ${t.tx_id.toString()} | ${t.tx_name} | ${t.tx_merchant} -> ${suggested.name}`,
      );
      console.log("---\n");
    }
  } finally {
    // always close the client the same way your Likert example does
    await client.close();
  }
}
main();
