---
timestamp: 'Fri Oct 17 2025 23:30:01 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_233001.b1e598c9.md]]'
content_id: 0a0d520de3ec7b68805cb1a9bef9304f6c63ba4f10f0b571c09013cfe9e72d75
---

# response:

```typescript
// file: src/concepts/FlashFinance/User/user.ts
// deno-lint-ignore no-unversioned-import
import { Collection, Db } from "npm:mongodb";

/**
 * Represents a unique identifier.
 * This class is copied directly from label.ts as per the "don't interleave but follow structure" instruction,
 * to ensure consistent ID handling without directly importing a class from another concept's file.
 */
export class Id {
  private constructor(private value: string) {}

  static from(value: string): Id {
    return new Id(value);
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Defines the possible status states for a user.
 */
export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

/**
 * Represents the structure of a User document stored in MongoDB.
 *
 * @property _id - The unique identifier for the user, corresponding to `user_id`.
 * @property email - The user's email address.
 * @property name - The user's display name.
 * @property password_hash - The hashed password for the user.
 * @property status - The current status of the user account.
 */
type UserDoc = {
  _id: string; // Corresponds to user_id, used as primary key in MongoDB
  email: string;
  name: string;
  password_hash: string;
  status: UserStatus;
};

/**
 * Public interface for a User, as returned by actions.
 * Masks the internal MongoDB `_id` as `user_id`.
 */
export interface User {
  user_id: Id;
  email: string;
  name: string;
  status: UserStatus;
}

const PREFIX = "User" + "."; // Prefix for MongoDB collection names, following label.ts pattern

/**
 * Helper function to hash a password using SHA-256.
 * NOTE: For a production application, a stronger, salted, adaptive password hashing
 * algorithm like bcrypt or Argon2 should be used. This is a minimal implementation
 * for demonstration purposes.
 * @param password The plain-text password to hash.
 * @returns A promise that resolves to the hexadecimal string representation of the hash.
 */
async function hashPassword(password: string): Promise<string> {
  const textEncoder = new TextEncoder();
  const data = textEncoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data); // Hash the password
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // Convert buffer to byte array
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
    "",
  ); // Convert bytes to hex string
  return hashHex;
}

/**
 * Manages the state and persistence of User concepts in the database.
 */
export class UserStore {
  // The MongoDB collection for storing User documents
  private users: Collection<UserDoc>;

  /**
   * Constructs a new UserStore instance.
   *
   * @param db The MongoDB database instance to connect to.
   */
  constructor(private readonly db: Db) {
    // Initialize the 'users' collection with the defined prefix.
    this.users = db.collection(PREFIX + "users");
    // Ensure email is unique for each user, enforcing an invariant and
    // optimizing the 'register' action's email uniqueness check.
    this.users.createIndex({ email: 1 }, { unique: true });
  }

  /**
   * Registers a new user in the system.
   *
   * @param email The user's email address (must be unique).
   * @param name The user's display name.
   * @param password The plain-text password for the user.
   * @returns A promise that resolves to the newly created User object.
   * @throws Error if the email is already registered by an existing user.
   */
  async register(email: string, name: string, password: string): Promise<User> {
    // requires: email is not used by any existing user
    const existingUser = await this.users.findOne({ email: email });
    if (existingUser) {
      throw new Error("Email is already registered.");
    }

    // effects: creates a new user with a fresh user_id
    const newUserId = Id.from(crypto.randomUUID()); // Generate a fresh UUID for user_id

    // effects: password_hash derived from password
    const passwordHash = await hashPassword(password);

    // effects: status ACTIVE
    const newUserDoc: UserDoc = {
      _id: newUserId.toString(), // Use the generated UUID as the document's primary key
      email: email,
      name: name,
      password_hash: passwordHash,
      status: UserStatus.ACTIVE,
    };

    // effects: adds the user to Users
    await this.users.insertOne(newUserDoc);

    // effects: returns the created user
    return {
      user_id: newUserId,
      email: newUserDoc.email,
      name: newUserDoc.name,
      status: newUserDoc.status,
    };
  }
  async all(): Promise<User[]> {
    const userDocs = await this.users.find().toArray();
    return userDocs.map((doc) => ({
      user_id: Id.from(doc._id),
      email: doc.email,
      name: doc.name,
      status: doc.status,
    }));
  }
  async authenticate(email: string, password: string): Promise<User> {
    // requires: there exists a user with the given email
    const userDoc = await this.users.findOne({ email: email });
    if (!userDoc) {
      // In a production system, this error message might be more generic
      // (e.g., "Invalid credentials") to prevent user enumeration attacks.
      throw new Error("Authentication failed: User not found.");
    }

    // requires: whose password_hash matches password
    const hashedPassword = await hashPassword(password);
    if (userDoc.password_hash !== hashedPassword) {
      // Similarly, a generic error might be used here.
      throw new Error("Authentication failed: Incorrect password.");
    }

    // requires: and whose status is ACTIVE
    if (userDoc.status !== UserStatus.ACTIVE) {
      throw new Error("Authentication failed: User account is inactive.");
    }

    // effects: returns that user
    return {
      user_id: Id.from(userDoc._id),
      email: userDoc.email,
      name: userDoc.name,
      status: userDoc.status,
    };
  }

  async deactivate(user_id: Id): Promise<void> {
    // requires: a user with user_id exists
    const userExists = await this.users.findOne({ _id: user_id.toString() });
    if (!userExists) {
      // This error message is for internal validation; not a primary concern for the prompt.
      throw new Error(`Deactivation failed: User with ID ${user_id.toString()} not found.`);
    }

    // effects: sets the user's status to INACTIVE
    await this.users.updateOne(
      { _id: user_id.toString() },
      { $set: { status: UserStatus.INACTIVE } },
    );
  }

  // NOTE: changePassword action is not implemented as per the prompt's focus
}

```

```typescript
// file: src/concepts/FlashFinance/User/test-actions/test-op-simple.ts
// @utils/database.ts (MOCK IMPLEMENTATION FOR TESTING)
// In a real Deno project, this would be a separate, more robust utility
// that connects to a dedicated test MongoDB instance (e.g., using Docker or an in-memory server).
import { testDb } from "@utils/database.ts";
import {
  assert,
  assertEquals,
  assertExists,
  assertRejects,
} from "jsr:@std/assert";
import { User, UserStatus, UserStore } from "../user.ts"; // Assuming user.ts is in the same directory

Deno.test("UserStore: Register and All functionality", async () => {
  const [db, client] = await testDb(); // Get a clean test database
  const userStore = new UserStore(db);

  try {
    // --- Test `register` functionality ---

    console.log("Attempting to register user 1...");
    const user1_email = "test1@example.com";
    const user1_name = "Test User One";
    const user1_password = "password123";

    const registeredUser1: User = await userStore.register(
      user1_email,
      user1_name,
      user1_password,
    );

    // Verify the returned User object for user 1
    assertExists(
      registeredUser1.user_id,
      "User ID should be generated for registered user 1.",
    );
    assertEquals(
      registeredUser1.email,
      user1_email,
      "Email should match for registered user 1.",
    );
    assertEquals(
      registeredUser1.name,
      user1_name,
      "Name should match for registered user 1.",
    );
    assertEquals(
      registeredUser1.status,
      UserStatus.ACTIVE,
      "Status should be ACTIVE for registered user 1.",
    );
    console.log(`✅ User 1 registered: ${registeredUser1.email}`);

    // --- Test `all` getter after one registration ---

    console.log("Fetching all users after registering user 1...");
    let allUsers: User[] = await userStore.all();

    // Verify that `all()` returns exactly one user, and it's user 1
    assertEquals(
      allUsers.length,
      1,
      "There should be 1 user after the first registration.",
    );
    assertEquals(
      allUsers[0].user_id.toString(),
      registeredUser1.user_id.toString(),
      "The first user in 'all' should be user 1.",
    );
    assertEquals(
      allUsers[0].email,
      user1_email,
      "Email of retrieved user 1 should match.",
    );
    console.log("✅ `all()` returned user 1 correctly.");

    // --- Register a second user ---

    console.log("Attempting to register user 2...");
    const user2_email = "test2@example.com";
    const user2_name = "Test User Two";
    const user2_password = "password456";

    const registeredUser2: User = await userStore.register(
      user2_email,
      user2_name,
      user2_password,
    );

    // Verify the returned User object for user 2
    assertExists(
      registeredUser2.user_id,
      "User ID should be generated for registered user 2.",
    );
    assertEquals(
      registeredUser2.email,
      user2_email,
      "Email should match for registered user 2.",
    );
    assertEquals(
      registeredUser2.name,
      user2_name,
      "Name should match for registered user 2.",
    );
    assertEquals(
      registeredUser2.status,
      UserStatus.ACTIVE,
      "Status should be ACTIVE for registered user 2.",
    );
    console.log(`✅ User 2 registered: ${registeredUser2.email}`);

    // --- Test `all` getter after two registrations ---

    console.log("Fetching all users after registering user 2...");
    allUsers = await userStore.all();

    // Verify that `all()` returns exactly two users
    assertEquals(
      allUsers.length,
      2,
      "There should be 2 users after the second registration.",
    );

    // Verify both registered users are present in the list
    const userIds = allUsers.map((u) => u.user_id.toString());
    assert(
      userIds.includes(registeredUser1.user_id.toString()),
      "User 1's ID should be in the list of all users.",
    );
    assert(
      userIds.includes(registeredUser2.user_id.toString()),
      "User 2's ID should be in the list of all users.",
    );
    console.log("✅ `all()` returned both users correctly.");

    // --- Test `register` with duplicate email (requires condition) ---

    console.log("Attempting to register user with duplicate email...");
    const duplicate_email = user1_email;
    const duplicate_name = "Duplicate User";
    const duplicate_password = "duplicate_pass";

    await assertRejects(
      async () => {
        await userStore.register(
          duplicate_email,
          duplicate_name,
          duplicate_password,
        );
      },
      Error, // Expect an Error to be thrown
      "Email is already registered.", // Expect the specific error message
      "Registering with a duplicate email should throw an error.",
    );
    console.log("✅ Registration with duplicate email rejected as expected.");

    // Verify no new user was added after the failed registration attempt
    allUsers = await userStore.all();
    assertEquals(
      allUsers.length,
      2,
      "No new user should be added after a failed registration.",
    );
    console.log(
      "✅ No new user added after failed duplicate email registration.",
    );

    console.log("\nAll 'Register' and 'All' tests completed successfully.");
  } finally {
    await client.close(); // Ensure the database client is closed
  }
});

Deno.test("UserStore: Authenticate functionality", async () => {
  const [db, client] = await testDb();
  const userStore = new UserStore(db);

  try {
    const email1 = "auth1@example.com";
    const name1 = "Auth User 1";
    const password1_correct = "pass1_correct";
    const password1_incorrect = "pass1_wrong";

    const email2_inactive = "auth2_inactive@example.com";
    const name2_inactive = "Auth User 2 Inactive";
    const password2_correct = "pass2_correct";

    // --- Setup for tests using existing actions (`register` and `deactivate`) ---
    console.log("Setting up users for authentication tests...");
    const user1 = await userStore.register(email1, name1, password1_correct);
    console.log(`User 1 registered: ${user1.email}`);

    const user2 = await userStore.register(
      email2_inactive,
      name2_inactive,
      password2_correct,
    );
    // Use the `deactivate` action to set up the state for an inactive user test
    await userStore.deactivate(user2.user_id); 
    console.log(`User 2 registered and deactivated: ${user2.email}`);
    console.log("Setup complete.\n");

    // --- Test 1: Successful authentication ---
    console.log("Attempting successful authentication...");
    const authenticatedUser = await userStore.authenticate(
      email1,
      password1_correct,
    );
    assertExists(authenticatedUser, "Authenticated user should be returned.");
    assertEquals(authenticatedUser.user_id.toString(), user1.user_id.toString(), "Authenticated user ID should match.");
    assertEquals(authenticatedUser.email, email1, "Authenticated user email should match.");
    assertEquals(authenticatedUser.name, name1, "Authenticated user name should match.");
    assertEquals(authenticatedUser.status, UserStatus.ACTIVE, "Authenticated user status should be ACTIVE.");
    console.log("✅ Successful authentication passed.");

    // --- Test 2: Unsuccessful authentication - User not found ---
    console.log("Attempting authentication with non-existent email...");
    const nonExistentEmail = "nonexistent@example.com";
    await assertRejects(
      async () => {
        await userStore.authenticate(nonExistentEmail, "anypassword");
      },
      Error,
      "Authentication failed: User not found.",
      "Authentication with non-existent email should reject with 'User not found'.",
    );
    console.log("✅ Unsuccessful authentication (user not found) passed.");

    // --- Test 3: Unsuccessful authentication - Incorrect password ---
    console.log("Attempting authentication with incorrect password...");
    await assertRejects(
      async () => {
        await userStore.authenticate(email1, password1_incorrect);
      },
      Error,
      "Authentication failed: Incorrect password.",
      "Authentication with incorrect password should reject with 'Incorrect password'.",
    );
    console.log("✅ Unsuccessful authentication (incorrect password) passed.");

    // --- Test 4: Unsuccessful authentication - Inactive user ---
    console.log("Attempting authentication with inactive user...");
    await assertRejects(
      async () => {
        await userStore.authenticate(email2_inactive, password2_correct);
      },
      Error,
      "Authentication failed: User account is inactive.",
      "Authentication with inactive user should reject with 'User account is inactive'.",
    );
    console.log("✅ Unsuccessful authentication (inactive user) passed.");

    console.log("\nAll 'Authenticate' tests completed successfully.");
  } finally {
    await client.close();
  }
});
```

```typescript
// file: src/concepts/FlashFinance/Label/label.ts
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
  ): Promise<{ label_tx_id: Id }> {
    // requires: no committed label exists for `tx_id`; no stagedLabel with ID tx_id.
    const txIdStr = tx_id.toString();
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
  async remove(user_id: Id, tx_id: Id): Promise<{ label_tx_id: Id }> {
    await this.update(user_id, tx_id, TRASH_CATEGORY_ID);
    return { label_tx_id: tx_id };
  }

  /** Queries for demos/tests. */
  async getLabel(user_id: Id, tx_id: Id) {
    return await this.labels.findOne({
      _id: this.makeTxUserId(user_id, tx_id),
    });
  }

  async getTxInfo(user_id: Id, tx_id: Id) {
    return await this.txInfos.findOne({
      _id: this.makeTxUserId(user_id, tx_id),
    });
  }

  async getCategoryHistory(user_id: Id, category_id: Id): Promise<string[]> {
    const rows = await this.catTx.find({
      category_id: category_id.toString(),
      user_id: user_id.toString(),
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

```typescript
// file: src/concepts/FlashFinance/Label/test-actions/test-op-simple.ts
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
    const trashHistory = await store.getCategoryHistory(
      user,
      TRASH_CATEGORY_ID,
    );
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
    // UserA finalizes their batch. Under per-user semantics this should SUCCEED even if userB
    // already committed the same tx_id, because conflicts are scoped to the same user.
    await store.finalize(userA);
    console.log(
      "   ✅ 'finalize' succeeded as expected under per-user semantics.",
    );

    // Verify userA's staged items are now committed
    const committedA_tx2 = await store.getLabel(userA, tx2_id);
    assertExists(
      committedA_tx2,
      "Tx2 should be committed for userA after finalize.",
    );
    assertEquals(committedA_tx2.user_id, userA.toString());

    const committedA_tx3 = await store.getLabel(userA, tx3_id);
    assertExists(
      committedA_tx3,
      "Tx3 should be committed for userA after finalize.",
    );
    assertEquals(committedA_tx3.user_id, userA.toString());

    // Verify userB's previously committed tx2 remains committed and untouched
    const committedB_tx2 = await store.getLabel(userB, tx2_id);
    assertExists(committedB_tx2, "Tx2 should remain committed for userB.");
    assertEquals(committedB_tx2.user_id, userB.toString());

    // Verify per-user category histories
    const groceriesA = await store.getCategoryHistory(userA, catGroceries);
    assertEquals(
      groceriesA.filter((tx) => tx === tx2_id.toString()).length,
      1,
      "UserA's Groceries should contain tx2 after finalize.",
    );

    const diningA = await store.getCategoryHistory(userA, catDining);
    assertEquals(
      diningA.filter((tx) => tx === tx3_id.toString()).length,
      1,
      "UserA's Dining should contain tx3 after finalize.",
    );

    const groceriesB = await store.getCategoryHistory(userB, catGroceries);
    assertEquals(
      groceriesB.filter((tx) => tx === tx2_id.toString()).length,
      1,
      "UserB's Groceries should still contain tx2.",
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
Deno.test("LabelStore: Stage → Cancel → Re-Stage → Finalize sequence clears state", async () => {
  const [db, client] = await testDb();
  const store = new LabelStore(db);

  const user = Id.from("user_reset_test");
  const txId = Id.from("tx_reset_sequence");
  const txName = "Reset Test Tx";
  const txMerchant = "Reset Merchant";
  const categoryId1 = Id.from("category_initial");
  const categoryId2 = Id.from("category_final");

  try {
    // 1. Initial state: No label exists for the (user, tx_id)
    console.log("Step 1: Verifying initial state (no label)...");
    let currentLabel = await store.getLabel(user, txId);
    assertEquals(
      currentLabel,
      null,
      "Initially, no label should exist for the (user, tx_id).",
    );
    console.log("   ✅ Initial state verified.");

    // 2. First stage: Stage a label for the transaction.
    console.log("Step 2: Staging the initial label...");
    await store.stage(user, txId, txName, txMerchant, categoryId1);
    console.log("   ✅ Initial label staged.");

    // 3. Verify: After staging, the label is not yet committed.
    currentLabel = await store.getLabel(user, txId);
    assertEquals(
      currentLabel,
      null,
      "Label should not be committed immediately after staging.",
    );
    console.log("   ✅ Verified: Label remains uncommitted after first stage.");

    // 4. Cancel: Cancel the staged label.
    console.log("Step 3: Cancelling the staged label...");
    await store.cancel(user);
    console.log("   ✅ Staged label cancelled.");

    // 5. Verify: Cancelling should clear any pending staged labels.
    // We can't directly inspect staged labels via public API, but subsequent `getLabel`
    // and `getTxInfo` should reflect that nothing was committed.
    currentLabel = await store.getLabel(user, txId);
    assertEquals(
      currentLabel,
      null,
      "No committed label should exist after cancelling staged label.",
    );

    let txInfo = await store.getTxInfo(user, txId);
    assertEquals(
      txInfo,
      null,
      "No transaction info should exist after cancelling staged label.",
    );

    const initialCategoryHistory = await store.getCategoryHistory(
      user,
      categoryId1,
    );
    assertEquals(
      initialCategoryHistory.length,
      0,
      "Category history should be empty after cancelling.",
    );
    console.log(
      "   ✅ Verified: Cancel operation cleared pending staged labels.",
    );

    // 6. Re-stage: Stage a new label for the same (user, tx_id) with a different category.
    console.log("Step 4: Re-staging the label with a new category...");
    await store.stage(user, txId, txName, txMerchant, categoryId2);
    console.log("   ✅ Label re-staged.");

    // 7. Verify: After re-staging, the label is still not committed.
    currentLabel = await store.getLabel(user, txId);
    assertEquals(
      currentLabel,
      null,
      "Label should not be committed immediately after re-staging.",
    );
    console.log("   ✅ Verified: Label remains uncommitted after re-stage.");

    // 8. Finalize: Finalize the re-staged label.
    console.log("Step 5: Finalizing the re-staged label...");
    await store.finalize(user);
    console.log("   ✅ Label finalized.");

    // 9. Verify: The finalize operation should have successfully committed the label.
    currentLabel = await store.getLabel(user, txId);
    assertExists(
      currentLabel,
      "A committed label should exist after finalize.",
    );
    assertEquals(
      currentLabel.user_id,
      user.toString(),
      "Committed label should have the correct user ID.",
    );
    assertEquals(
      currentLabel.tx_id,
      txId.toString(),
      "Committed label should have the correct transaction ID.",
    );
    assertEquals(
      currentLabel.category_id,
      categoryId2.toString(),
      "Committed label should have the correct category ID.",
    );
    console.log(
      "   ✅ Verified: Label successfully committed with correct details.",
    );

    // 10. Verify: Transaction info and category history reflect the single committed label.
    txInfo = await store.getTxInfo(user, txId);
    assertExists(txInfo, "Transaction info should exist after finalize.");
    assertEquals(
      txInfo.tx_name,
      txName,
      "Transaction info should have the correct name.",
    );
    assertEquals(
      txInfo.tx_merchant,
      txMerchant,
      "Transaction info should have the correct merchant.",
    );
    console.log("   ✅ Verified: Transaction info correctly recorded.");

    const finalCategoryHistory = await store.getCategoryHistory(
      user,
      categoryId2,
    );
    assertEquals(
      finalCategoryHistory.length,
      1,
      "Category history should contain one entry for the finalized label.",
    );
    assertEquals(
      finalCategoryHistory[0],
      txId.toString(),
      "Category history should contain the correct transaction ID.",
    );

    const initialCategoryHistoryAfterFinalize = await store.getCategoryHistory(
      user,
      categoryId1,
    );
    assertEquals(
      initialCategoryHistoryAfterFinalize.length,
      0,
      "The initial category should not have any history after the re-labeling.",
    );
    console.log(
      "   ✅ Verified: Category history reflects the single, final committed label.",
    );

    console.log(
      "\n✅ 'Stage → Cancel → Re-Stage → Finalize' sequence verified successfully.",
    );
  } finally {
    await client.close();
  }
});
```
