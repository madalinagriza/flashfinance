---
timestamp: 'Sat Oct 18 2025 00:16:34 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_001634.8c1f88bc.md]]'
content_id: 06375c2baf2e9dc323be6537f6c17b100bb4dcb5a2f22db48854e32ed6d0ce10
---

# response:

To implement the email normalization, I will first modify the `UserStore.register` and `UserStore.authenticate` methods in `src/concepts/FlashFinance/User/user.ts` to apply `trim().toLowerCase()` to the email address. This ensures that all email comparisons and storage are done using a normalized form, preventing duplicates based on case or surrounding whitespace.

Next, I will create a new test file `src/concepts/FlashFinance/User/test-actions/test-non-popular.ts` and add a new test case there. This test will:

1. Register a user with an email using mixed casing.
2. Attempt to register a second user with the same email but different casing. It should be rejected due to duplication.
3. Attempt to register a third user with the same email but with leading/trailing whitespace. It should also be rejected due to duplication.
4. Verify that no additional users are added to the system after the rejected attempts.
5. Optionally, verify that authentication works correctly regardless of casing or whitespace in the input email.

### `src/concepts/FlashFinance/User/user.ts` (Modified)

```typescript
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
    // The index ensures uniqueness on the *stored* email.
    // We will store normalized emails.
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
    // Normalize email before checking and storing to enforce case-insensitivity and trim whitespace.
    const normalizedEmail = email.trim().toLowerCase();

    // requires: email is not used by any existing user
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
      email: newUserDoc.email, // Return the stored (normalized) email
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
    // Normalize email before lookup to match the stored normalized email.
    const normalizedEmail = email.trim().toLowerCase();

    // requires: there exists a user with the given email
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

### `src/concepts/FlashFinance/User/test-actions/test-non-popular.ts` (New File)

```typescript
// @utils/database.ts (MOCK IMPLEMENTATION FOR TESTING)
import { testDb } from "@utils/database.ts";
import { assert, assertEquals, assertRejects } from "jsr:@std/assert";
import { User, UserStore } from "../user.ts"; // Assuming user.ts is in the same directory

Deno.test("UserStore: Email normalization prevents duplicate registrations (case-insensitivity, whitespace)", async () => {
  const [db, client] = await testDb(); // Get a clean test database
  const userStore = new UserStore(db);

  try {
    const originalEmailCasing = "TestUser@example.com";
    const lowercaseEmail = "testuser@example.com";
    const trimmedSpacedEmail = " testuser@example.com "; // Lowercase with spaces

    // 1. Register the initial user with mixed-casing email
    console.log(
      `Attempting to register user with email: ${originalEmailCasing}`,
    );
    const registeredUser: User = await userStore.register(
      originalEmailCasing,
      "Original User",
      "password123",
    );

    // Verify the email stored is normalized (lowercase, no extra spaces)
    assertEquals(
      registeredUser.email,
      originalEmailCasing.toLowerCase().trim(),
      "Stored email should be normalized (lowercase and trimmed).",
    );
    console.log(
      `✅ User registered successfully. Stored email: ${registeredUser.email}`,
    );

    // Verify initial user count
    let allUsers = await userStore.all();
    assertEquals(
      allUsers.length,
      1,
      "There should be 1 user after the first registration.",
    );

    // 2. Attempt to register again with different casing (should reject)
    console.log(
      `Attempting to register user with same email, different casing: ${lowercaseEmail}`,
    );
    await assertRejects(
      async () => {
        await userStore.register(
          lowercaseEmail,
          "Attempted Lowercase User",
          "password123",
        );
      },
      Error, // Expect an Error to be thrown
      "Email is already registered.", // Expect the specific error message
      "Registration with different casing should be rejected due to normalization.",
    );
    console.log("✅ Registration with different casing rejected as expected.");

    // Verify no new user was added after the failed registration attempt
    allUsers = await userStore.all();
    assertEquals(
      allUsers.length,
      1,
      "No new user should be added after a failed duplicate (casing) registration.",
    );

    // 3. Attempt to register again with surrounding whitespace (should reject)
    console.log(
      `Attempting to register user with same email, surrounding whitespace: "${trimmedSpacedEmail}"`,
    );
    await assertRejects(
      async () => {
        await userStore.register(
          trimmedSpacedEmail,
          "Attempted Spaced User",
          "password123",
        );
      },
      Error, // Expect an Error to be thrown
      "Email is already registered.", // Expect the specific error message
      "Registration with surrounding whitespace should be rejected due to normalization.",
    );
    console.log(
      "✅ Registration with surrounding whitespace rejected as expected.",
    );

    // Verify no new user was added after the second failed registration attempt
    allUsers = await userStore.all();
    assertEquals(
      allUsers.length,
      1,
      "No new user should be added after a failed duplicate (whitespace) registration.",
    );

    // --- Optional: Verify authentication also works with normalized emails ---

    console.log("Verifying authentication with original casing email...");
    const auth1 = await userStore.authenticate(
      originalEmailCasing,
      "password123",
    );
    assertEquals(
      auth1.user_id.toString(),
      registeredUser.user_id.toString(),
      "Should authenticate successfully with original casing email.",
    );
    console.log("✅ Authenticated successfully with original casing email.");

    console.log("Verifying authentication with lowercase email...");
    const auth2 = await userStore.authenticate(lowercaseEmail, "password123");
    assertEquals(
      auth2.user_id.toString(),
      registeredUser.user_id.toString(),
      "Should authenticate successfully with lowercase email.",
    );
    console.log("✅ Authenticated successfully with lowercase email.");

    console.log("Verifying authentication with trimmed spaced email...");
    const auth3 = await userStore.authenticate(
      trimmedSpacedEmail,
      "password123",
    );
    assertEquals(
      auth3.user_id.toString(),
      registeredUser.user_id.toString(),
      "Should authenticate successfully with trimmed spaced email.",
    );
    console.log(
      "✅ Authenticated successfully with trimmed spaced email.",
    );

    console.log(
      "\nAll 'Email normalization for duplicate registration' tests completed successfully.",
    );
  } finally {
    await client.close(); // Ensure the database client is closed
  }
});

```
