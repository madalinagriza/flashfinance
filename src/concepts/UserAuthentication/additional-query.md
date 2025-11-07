[@concept-background](../../../design/tools/concept-background.md)

[@UserAuthentication](UserAuthentication.md)

[@test-op-simple.ts](test-actions/test-op-simple.ts)


# make a test for UserAuthentication:
fix the following error I get in test-op-simple:
Property 'error' does not exist on type '{ user: ID; } | { error: string; }'.
  Property 'error' does not exist on type '{ user: ID; }'.deno-ts(2339)
any

# response:

# solution:

The error `Property 'error' does not exist on type '{ user: ID; } | { error:string; }'` occurs because TypeScript cannot guarantee which part of the union type (`{ user: ID }` or `{ error: string }`) a result variable holds. To fix this, we use a type guard to check for the presence of the `error` property. This narrows the type within the `if/else` block, allowing safe access to either `result.error` or `result.user`.

The following files provide a complete implementation of the `UserAuthentication` concept and a test suite that correctly handles the potential error states, thus resolving the TypeScript error.

# file: src/utils/types.ts

```typescript
/**
 * A branded type for IDs. This is structurally a string, but TypeScript
 * treats it as a distinct type, preventing accidental assignment of
 * regular strings to ID fields.
 */
export type ID = string & { readonly brand: unique symbol };

/**
 * Represents an empty record, typically returned by actions that have
 * no specific output on success.
 */
export type Empty = Record<PropertyKey, never>;
```

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

# file: src/concepts/UserAuthentication/UserAuthenticationConcept.ts

```typescript
import { Collection, Db } from "mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Note: In a real application, use a proper password hashing library like bcrypt.
// For this example, we'll simulate hashing for demonstration purposes.
async function hashPassword(password: string): Promise<string> {
  // This is NOT a secure hash. For demonstration purposes only.
  return Promise.resolve(`${password}-hashed`);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  const newHash = await hashPassword(password);
  return newHash === hash;
}

const PREFIX = "UserAuthentication" + ".";

// Generic type parameter from the spec
type User = ID;

/**
 * state:
 *   a set of `User`s with
 *     a `username` String (unique)
 *     a `passwordHash` String
 */
interface UserDoc {
  _id: User;
  username: string;
  passwordHash: string;
}

/**
 * concept: UserAuthentication [User]
 * purpose: To securely verify a user's identity based on credentials.
 */
export default class UserAuthenticationConcept {
  users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    // Ensure username is unique as per the state requirements
    this.users.createIndex({ username: 1 }, { unique: true });
  }

  /**
   * register (username: String, password: String): (user: User) | (error: String)
   *
   * requires: no User exists with the given `username`.
   * effects: creates a new User `u`; sets their `username` and a hash of their `password`; returns `u` as `user`.
   * ---
   * requires: a User already exists with the given `username`.
   * effects: returns an error message.
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Precondition check for existing username
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: "Username already taken" };
    }

    // Effects
    const passwordHash = await hashPassword(password);
    const newUser: UserDoc = {
      _id: freshID() as User,
      username,
      passwordHash,
    };

    await this.users.insertOne(newUser);
    return { user: newUser._id };
  }

  /**
   * login (username: String, password: String): (user: User) | (error: String)
   *
   * requires: a User exists with the given `username` and the `password` matches their `passwordHash`.
   * effects: returns the matching User `u` as `user`.
   * ---
   * requires: no User exists with the given `username` or the `password` does not match.
   * effects: returns an error message.
   */
  async login(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    const user = await this.users.findOne({ username });

    if (!user) {
      return { error: "Invalid username or password" };
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);
    if (!passwordMatches) {
      return { error: "Invalid username or password" };
    }

    return { user: user._id };
  }

  /**
   * _getUserByUsername (username: String): (user: User)
   *
   * requires: a User with the given `username` exists.
   * effects: returns the corresponding User.
   */
  async _getUserByUsername({ username }: { username: string }): Promise<Array<{ user: User }>> {
    const user = await this.users.findOne({ username });
    if (user) {
      return [{ user: user._id }];
    }
    return []; // Return empty array if not found, as per query return type requirement
  }
}
```

# file: src/concepts/UserAuthentication/test-actions/test-op-simple.ts

```typescript
import { assert, assertEquals, assertExists } from "@std/assert";
import { getDb } from "@utils/database.ts";
import UserAuthenticationConcept from "../UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

// Test suite for the UserAuthentication concept based on its principle.
Deno.test("UserAuthentication Concept: Operational Principle", async (t) => {
  const { db, client } = await getDb();
  const userAuthentication = new UserAuthenticationConcept(db);

  // Clean up the collection before starting to ensure a fresh state
  await userAuthentication.users.deleteMany({});

  const testUsername = "testuser";
  const testPassword = "password123";
  let registeredUserId: ID | undefined;

  await t.step("should register a new user successfully", async () => {
    const result = await userAuthentication.register({
      username: testUsername,
      password: testPassword,
    });

    // FIX: Use a type guard to check for the error property.
    // This allows TypeScript to correctly infer the type inside the if/else blocks.
    if ("error" in result) {
      assert(false, `Registration failed unexpectedly: ${result.error}`);
    } else {
      assertExists(result.user, "Registration should return a user ID.");
      registeredUserId = result.user; // Save for subsequent steps
    }
  });

  await t.step("should fail to register a user with a duplicate username", async () => {
    const result = await userAuthentication.register({
      username: testUsername,
      password: "anotherpassword",
    });

    // Here we expect an error
    assert("error" in result, "Registration with a duplicate username should return an error.");
    assertEquals(result.error, "Username already taken");
  });

  await t.step("should login an existing user with correct credentials", async () => {
    assertExists(registeredUserId, "Cannot run login test without a registered user ID.");
    const result = await userAuthentication.login({
      username: testUsername,
      password: testPassword,
    });

    // Use the same type guard pattern for the login result
    if ("error" in result) {
      assert(false, `Login failed unexpectedly: ${result.error}`);
    } else {
      assertExists(result.user);
      assertEquals(
        result.user,
        registeredUserId,
        "Logged in user ID should match the registered user ID.",
      );
    }
  });

  await t.step("should fail to login with an incorrect password", async () => {
    const result = await userAuthentication.login({
      username: testUsername,
      password: "wrongpassword",
    });

    assert("error" in result, "Login with an incorrect password should return an error.");
    assertEquals(result.error, "Invalid username or password");
  });

  await t.step("should fail to login with a non-existent username", async () => {
    const result = await userAuthentication.login({
      username: "nonexistentuser",
      password: testPassword,
    });

    assert("error" in result, "Login with a non-existent username should return an error.");
    assertEquals(result.error, "Invalid username or password");
  });

  // Clean up and close the connection after all tests are done
  await userAuthentication.users.deleteMany({});
  await client.close();
});
```