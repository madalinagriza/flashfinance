---
timestamp: 'Tue Nov 04 2025 21:11:39 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_211139.80c4ae61.md]]'
content_id: 12ac53f519c72e5c4a39fb77a4102cb582eb30e8be4b145cb9f2e5189ee43e55
---

# file: src/utils/database.ts

```typescript
import { MongoClient, Db } from "mongodb";
import { ID } from "./types.ts";
import { v7 } from "@std/uuid/unstable-v7";

// In a real app, this would be loaded from environment variables.
const MONGO_URI = Deno.env.get("MONGO_URI") || "mongodb://localhost:27017";
const DB_NAME = Deno.env.get("DB_NAME") || "concept-db-test";

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Initializes and returns a connection to the MongoDB database.
 * Caches the connection to avoid reconnecting on every call.
 */
export async function getDb(): Promise<{ db: Db; client: MongoClient }> {
  if (db && client && client.topology?.isConnected()) {
    return { db, client };
  }

  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);

  return { db, client };
}

/**
 * Generates a fresh, unique ID for use in collections.
 */
export function freshID(): ID {
  return v7() as ID;
}
```
