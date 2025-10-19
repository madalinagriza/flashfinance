---
timestamp: 'Thu Oct 16 2025 22:41:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_224137.c2a3e6b2.md]]'
content_id: e1dd932f0ace8fb2c73596ee4ff55766668364da96144f3726c341cfac1a6d22
---

# file: src/concepts/FlashFinance/Label/test-AI/label-clear.ts

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

**concept:** Label\[ID, Timestamp]

**purpose:** record the user's assignment of a specific transaction to a specific category so that spending meaning is explicit and auditable

**principle:** if a user applies a label, the transaction holds exactly one active label at a time; relabeling replaces the previous one. The system’s AI may suggest labels based on transaction context, but suggestions never change state until confirmed by the user.

***

**state:**

> a set of **Labels** with
>
> > a `tx_id` : ID\
> > a `category_id` : ID\
> > a `user_id` : ID\
> > a `created_at` : Timestamp
>
> a set of **TransactionInfo** with
>
> > a `tx_id` : ID\
> > a `tx_name` : String\
> > a `tx_merchant` : String
>
> a set of **CategoryHistory** with
>
> > a `category_id` : ID\
> > a set of `transactions` : TransactionInfos

***

**actions:**

> **apply**(user\_id : ID, tx\_id : ID, tx\_name : String, tx\_merchant : String, category\_id : ID) : (label\_tx\_id : ID)
>
> > *requires:*\
> > transaction exists and `transaction.owner_id = user_id`;\
> > category exists and `category.owner_id = user_id`;\
> > no existing label for `tx_id` in Labels\
> > *effects:*\
> > creates a TransactionInfo with associated id, name, and merchant;\
> > adds TransactionInfo to the CategoryHistory;\
> > creates a label associating `tx_id` to `category_id` with `user_id` and current timestamp; adds it; returns the label

***

> **update**(user\_id : ID, tx\_id : ID, new\_category\_id : ID) : (label\_tx\_id : ID)
>
> > *requires:*\
> > a label for `tx_id` exists; `transaction.owner_id = user_id`;\
> > `new_category_id` exists and `owner_id = user_id`;\
> > TransactionInfo exists with `transactionInfo.id = tx_id`\
> > *effects:*\
> > updates CategoryHistory, associating TransactionInfo with the new category;\
> > replaces the label’s `category_id` with `new_category_id`;\
> > updates `created_at` to now; returns updated label

***

> **remove**(user\_id : ID, tx\_id : ID)
>
> > *requires:*\
> > a label for `tx_id` exists; `transaction.owner_id = user_id`\
> > *effects:*\
> > reassigns the transaction’s label to the user’s built-in **Trash** category;\
> > updates CategoryHistory, associating the transaction with the trash category

***

**invariants:**

* at most one label per tx\_id
* `label.user_id = transaction.owner_id` for the labeled transaction
* a label’s category.owner\_id = label.user\_id
* suggestions do not create or modify labels until the user explicitly applies or updates

***

**significant (non-action) function**

> **suggest**(llm : GeminiLLM, user\_id : ID, allCategories : \[(ID, String)], transactionInfo) : (suggested\_category\_id : ID)
>
> > *requires:*\
> > user has ≥ 1 category\
> > *effects:*\
> > returns a best-guess category\_id from the user’s existing categories for this `tx_id`, highlighted in the UI;\
> > suggested by AI and does **not** alter Labels state

***

**notes on suggest function:**

> suggest has its place somewhere in between the UI and Label concept. I chose to put it here since Label in majority the necessary data for the suggest.\
> In order for the AI to be trained well on good examples, I needed to keep a history of past transactions, as well as give it full info on categories, which is why the data types involved in suggest are more complex.\
> Nevertheless, since suggest doesn't update the Label's state, it's not an action. Therefore, I considered it permissable to involve a little more complexity in the function arguments. For a little more details on the records and arguments needed for suggest:
>
> > catTx is a record used for AI suggestions and later UI. Labels remain the source of truth for what’s currently assigned.  \
> > txInfos carries merchant and name fields since the AI needs them for interpreting.  \
> > txInfos must be passed into `suggest` because suggestions apply to transactions not yet labeled—there’s no existing connection from transaction id -> transaction info within the Label concept.\
> > All categories and their names must be passed in since we may not have a full record of categories through past labeling (say we never assgined to the category "Restaurants" but it's still a valid suggestion)
