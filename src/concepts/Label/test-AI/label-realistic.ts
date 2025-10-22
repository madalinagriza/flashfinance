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
    const catTransit = Id.from("cat_transit");
    const catHealth = Id.from("cat_health");
    const catMisc = Id.from("cat_misc");
    const catCoffee = Id.from("cat_coffee");
    const catRestaurants = Id.from("cat_restaurants");
    const catTakeout = Id.from("cat_takeout");

    const categoriesTuples: [string, Id][] = [
      ["Groceries", catGroceries],
      ["Coffee Shops", catCoffee],
      ["Restaurants", catRestaurants],
      ["Takeout / Delivery", catTakeout],
      ["Transit", catTransit],
      ["Health & Pharmacy", catHealth],
      ["Miscellaneous", catMisc],
    ];

    const previous: [Id, string, string, Id][] = [
      [Id.from("tx1"), "CHIPOTLE MEX GR ONLINE", "TEAM-BANKING@CA", catHealth],
      [
        Id.from("tx2"),
        "TUFTS DENTAL CLINICS ",
        "TUFTS DENTAL CLINICS",
        catHealth,
      ],
      [Id.from("tx3"), "Time Out Market Boston", "Boston MA", catRestaurants],
      [Id.from("tx4"), "LYFT *RIDE SAT 5PM ", "LYFT.COM", catTransit],
      [
        Id.from("tx5"),
        " SQ *PRALINE FRENCH PATISS",
        "PATISSCambridge",
        catCoffee,
      ],
      [Id.from("tx6"), "SQ *BLUE BOTTLE COFFEE", "gosq.com", catCoffee],
      [Id.from("tx7"), " DD *SOBOL", "DOORDASH.COM", catTakeout],
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
        tx_name: "SQ *PEPITA COFFEE CO.",
        tx_merchant: "*PEPITA COFFEE CO",
      },
      { tx_id: Id.from("m2"), tx_name: "Target", tx_merchant: "Target" },
      {
        tx_id: Id.from("m3"),
        tx_name: "MBTA-550008588372 ",
        tx_merchant: "MBTA Boston",
      },
      {
        tx_id: Id.from("m4"),
        tx_name: "Lyft * Ride",
        tx_merchant: "Lyft * Ride",
      },
      {
        tx_id: Id.from("m5"),
        tx_name: "TST* TATTE BAKERY",
        tx_merchant: "BACK BABOSTON",
      },
      {
        tx_id: Id.from("m6"),
        tx_name: "RICHDALE FOOD SHOP",
        tx_merchant: "RICHDALE FOOD SHOP",
      },
      {
        tx_id: Id.from("m7"),
        tx_name: "NESPRESSO USA",
        tx_merchant: "NESPRESSO.COMNY",
      },
    ];

    console.log("=== TEST 4 — REALISTIC CATEGORIES FROM BANK STATEMENTS ===");
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

if (import.meta.main) await main();
