---
timestamp: 'Sat Oct 18 2025 00:11:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_001129.a962c2e7.md]]'
content_id: c934a91472e33278b997855480b93d8e5773d8d7a1e33ca05f79fddaf6f9ab84
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
 * Normalizes an email address by trimming whitespace and converting to lowercase.
 * This ensures consistency for uniqueness checks and lookups.
 * @param email The email address to normalize.
 * @returns The normalized email address.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
    // The normalization is handled at the application layer before storage,
    // so a standard unique index is sufficient on the normalized email.
    this.users.createIndex({ email: 1 }, { unique: true });
  }

  /**
   * Registers a new user in the system.
   * Email addresses are normalized (trimmed and lowercased) before storage and uniqueness checks.
   *
   * @param email The user's email address (must be unique after normalization).
   * @param name The user's display name.
   * @param password The plain-text password for the user.
   * @returns A promise that resolves to the newly created User object.
   * @throws Error if the email (after normalization) is already registered by an existing user.
   */
  async register(email: string, name: string, password: string): Promise<User> {
    const normalizedEmail = normalizeEmail(email);

    // requires: email is not used by any existing user (after normalization)
    const existingUser = await this.users.findOne({ email: normalizedEmail });
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
      email: normalizedEmail, // Store the normalized email
      name: name,
      password_hash: passwordHash,
      status: UserStatus.ACTIVE,
    };

    // effects: adds the user to Users
    await this.users.insertOne(newUserDoc);

    // effects: returns the created user
    return {
      user_id: newUserId,
      email: newUserDoc.email, // Return the normalized email
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
    const normalizedEmail = normalizeEmail(email);

    // requires: there exists a user with the given email (after normalization)
    const userDoc = await this.users.findOne({ email: normalizedEmail });
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
    const result = await this.users.updateOne(
      { _id: user_id.toString() },
      { $set: { status: UserStatus.INACTIVE } },
    );

    if (result.matchedCount === 0) {
      // If no user was found with the given user_id, throw an error
      // This satisfies the "requires" condition by enforcing it.
      throw new Error("Deactivation failed: User not found.");
    }

    // effects: sets the user's status to INACTIVE
    // (This is implicitly handled by the updateOne call if matchedCount > 0)
  }
  async changePassword(
    user_id: Id,
    old_password: string,
    new_password: string,
  ): Promise<boolean> {
    // requires: a user with user_id exists
    const userDoc = await this.users.findOne({ _id: user_id.toString() });
    if (!userDoc) {
      throw new Error("Change password failed: User not found.");
    }

    // requires: and old_password matches the stored password_hash
    const hashedOldPassword = await hashPassword(old_password);
    if (userDoc.password_hash !== hashedOldPassword) {
      throw new Error("Change password failed: Incorrect old password.");
    }

    // effects: updates password_hash with new_password
    const hashedNewPassword = await hashPassword(new_password);

    const result = await this.users.updateOne(
      { _id: user_id.toString() },
      { $set: { password_hash: hashedNewPassword } },
    );

    // effects: returns true
    // If matchedCount is 1, the user was found. Even if new_password is the same as
    // old_password, the action conceptually "updates" it to that value, and returns true.
    return result.matchedCount === 1;
  }
}
```

```typescript
// file: src/concepts/FlashFinance/User/test-actions/test-non-popular.ts
// @utils/database.ts (MOCK IMPLEMENTATION FOR TESTING)
import { testDb } from "@utils/database.ts";
import { assertRejects, assertEquals } from "jsr:@std/assert";
import { UserStore } from "../user.ts";

Deno.test("UserStore: Email normalization prevents duplicate registrations", async () => {
  const [db, client] = await testDb(); // Get a clean test database
  const userStore = new UserStore(db);

  try {
    const baseEmail = "testuser@example.com";
    const initialName = "Initial User";
    const password = "securepassword";

    console.log(`Registering initial user: ${baseEmail}`);
    const registeredUser = await userStore.register(
      baseEmail,
      initialName,
      password,
    );
    assertEquals(
      registeredUser.email,
      baseEmail,
      "The registered email should be stored as normalized.",
    );
    console.log(`✅ Initial user registered successfully with normalized email: ${registeredUser.email}`);

    // Case 1: Attempt to register with different casing
    const capitalizedEmail = "TestUser@example.com";
    console.log(
      `Attempting to register with capitalized email: "${capitalizedEmail}"`,
    );
    await assertRejects(
      async () => {
        await userStore.register(capitalizedEmail, "Capitalized User", password);
      },
      Error,
      "Email is already registered.",
      "Registering with different casing of the same email should be rejected.",
    );
    console.log(
      `✅ Registration with capitalized email rejected as expected.`,
    );

    // Case 2: Attempt to register with leading/trailing whitespace
    const spacedEmail = "  testuser@example.com  ";
    console.log(
      `Attempting to register with spaced email: "${spacedEmail}"`,
    );
    await assertRejects(
      async () => {
        await userStore.register(spacedEmail, "Spaced User", password);
      },
      Error,
      "Email is already registered.",
      "Registering with leading/trailing whitespace in email should be rejected.",
    );
    console.log(`✅ Registration with spaced email rejected as expected.`);

    // Case 3: Attempt to register with both casing and whitespace
    const mixedCaseSpacedEmail = "  TESTUSER@EXAMPLE.COM  ";
    console.log(
      `Attempting to register with mixed-case and spaced email: "${mixedCaseSpacedEmail}"`,
    );
    await assertRejects(
      async () => {
        await userStore.register(
          mixedCaseSpacedEmail,
          "Mixed Case Spaced User",
          password,
        );
      },
      Error,
      "Email is already registered.",
      "Registering with mixed casing and whitespace in email should be rejected.",
    );
    console.log(
      `✅ Registration with mixed-case and spaced email rejected as expected.`,
    );

    // Verify authentication also works with different casing/whitespace
    console.log("Verifying authentication with different casing...");
    const authCase = await userStore.authenticate(capitalizedEmail, password);
    assertEquals(
      authCase.user_id.toString(),
      registeredUser.user_id.toString(),
      "Authentication should succeed with different casing.",
    );
    assertEquals(
      authCase.email,
      baseEmail, // Should return the normalized stored email
      "Authenticated user's email should be the normalized version.",
    );
    console.log("✅ Authentication with different casing successful.");

    console.log("Verifying authentication with leading/trailing whitespace...");
    const authSpace = await userStore.authenticate(spacedEmail, password);
    assertEquals(
      authSpace.user_id.toString(),
      registeredUser.user_id.toString(),
      "Authentication should succeed with leading/trailing whitespace.",
    );
    assertEquals(
      authSpace.email,
      baseEmail, // Should return the normalized stored email
      "Authenticated user's email should be the normalized version.",
    );
    console.log("✅ Authentication with leading/trailing whitespace successful.");

    // Verify only one user exists in the system
    const allUsers = await userStore.all();
    assertEquals(
      allUsers.length,
      1,
      "Only one user should exist after all attempts.",
    );
    assertEquals(
      allUsers[0].email,
      baseEmail,
      "The only user's email should be the normalized base email.",
    );
    console.log("✅ Only one user found in the system, confirming normalization.");

    console.log("\nAll email normalization tests completed successfully.");
  } finally {
    await client.close(); // Ensure the database client is closed
  }
});
```
