---
timestamp: 'Fri Oct 17 2025 23:37:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_233758.bd9cd347.md]]'
content_id: e173018da3ae1167d6b64dba728850dd7ae9be3c314fb9d51ab8c16cab3ef127
---

# response:

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

  /**
   * Retrieves a user by their user_id.
   * This is a helper function to facilitate testing and other actions.
   * @param userId The ID of the user to retrieve.
   * @returns A promise that resolves to the User object if found, otherwise null.
   */
  async findUserById(userId: Id): Promise<User | null> {
    const userDoc = await this.users.findOne({ _id: userId.toString() });
    if (!userDoc) {
      return null;
    }
    return {
      user_id: Id.from(userDoc._id),
      email: userDoc.email,
      name: userDoc.name,
      status: userDoc.status,
    };
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

  /**
   * Deactivates a user account.
   *
   * @param user_id The ID of the user to deactivate.
   * @throws Error if no user with the given user_id exists.
   */
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
}

```

```typescript
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
import { Id, User, UserStatus, UserStore } from "../user.ts"; // Assuming user.ts is in the same directory

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
  const [db, client] = await testDb(); // Get a clean test database for this test block
  const userStore = new UserStore(db);

  try {
    // --- Setup: Register users for various authentication scenarios ---
    const active_email = "active@example.com";
    const active_name = "Active User";
    const active_password = "ActivePassword123";
    const activeUser: User = await userStore.register(
      active_email,
      active_name,
      active_password,
    );
    console.log(`Setup: Registered active user: ${activeUser.email}`);

    const inactive_email = "inactive@example.com";
    const inactive_name = "Inactive User";
    const inactive_password = "InactivePassword123";
    const inactiveUser: User = await userStore.register(
      inactive_email,
      inactive_name,
      inactive_password,
    );
    // Deactivate this user, making it ready for the authentication failure test
    await userStore.deactivate(inactiveUser.user_id);
    console.log(
      `Setup: Registered and deactivated user: ${inactiveUser.email}`,
    );

    // --- Test 1: Successful authentication ---
    console.log("Attempting successful authentication...");
    const authenticatedUser = await userStore.authenticate(
      active_email,
      active_password,
    );

    assertExists(
      authenticatedUser,
      "Authenticated user object should be returned.",
    );
    assertEquals(
      authenticatedUser.user_id.toString(),
      activeUser.user_id.toString(),
      "Authenticated user ID should match.",
    );
    assertEquals(
      authenticatedUser.email,
      active_email,
      "Authenticated user email should match.",
    );
    assertEquals(
      authenticatedUser.status,
      UserStatus.ACTIVE,
      "Authenticated user status should be ACTIVE.",
    );
    console.log(`✅ Successful authentication for ${active_email}`);

    // --- Test 2: Unsuccessful authentication - User not found (email doesn't exist) ---
    console.log("Attempting authentication with non-existent email...");
    const nonExistentEmail = "nonexistent@example.com";
    const anyPassword = "anyPassword";

    await assertRejects(
      async () => {
        await userStore.authenticate(nonExistentEmail, anyPassword);
      },
      Error,
      "Authentication failed: User not found.",
      "Authentication with non-existent email should throw 'User not found' error.",
    );
    console.log(
      `✅ Authentication rejected for non-existent email: ${nonExistentEmail}`,
    );

    // --- Test 3: Unsuccessful authentication - Incorrect password ---
    console.log("Attempting authentication with incorrect password...");
    const incorrectPassword = "WrongPassword";

    await assertRejects(
      async () => {
        await userStore.authenticate(active_email, incorrectPassword);
      },
      Error,
      "Authentication failed: Incorrect password.",
      "Authentication with incorrect password should throw 'Incorrect password' error.",
    );
    console.log(
      `✅ Authentication rejected for incorrect password for ${active_email}`,
    );

    // --- Test 4: Unsuccessful authentication - Inactive user ---
    console.log("Attempting authentication for inactive user...");

    await assertRejects(
      async () => {
        await userStore.authenticate(inactive_email, inactive_password);
      },
      Error,
      "Authentication failed: User account is inactive.",
      "Authentication for an inactive user should throw 'User account is inactive' error.",
    );
    console.log(
      `✅ Authentication rejected for inactive user: ${inactive_email}`,
    );

    console.log("\nAll 'Authenticate' tests completed successfully.");
  } finally {
    await client.close(); // Ensure the database client is closed
  }
});

Deno.test("UserStore: Deactivate functionality", async () => {
  const [db, client] = await testDb(); // Get a clean test database for this test block
  const userStore = new UserStore(db);

  try {
    // --- Setup: Register a user to be deactivated ---
    const userToDeactivate_email = "deactivate@example.com";
    const userToDeactivate_name = "Deactivate Test User";
    const userToDeactivate_password = "DeactivatePassword123";
    const user: User = await userStore.register(
      userToDeactivate_email,
      userToDeactivate_name,
      userToDeactivate_password,
    );
    console.log(`Setup: Registered user for deactivation: ${user.email}`);

    // Verify initial status is ACTIVE
    let fetchedUser = await userStore.findUserById(user.user_id);
    assertExists(fetchedUser, "User should exist before deactivation.");
    assertEquals(
      fetchedUser!.status,
      UserStatus.ACTIVE,
      "User status should initially be ACTIVE.",
    );
    console.log(
      `Initial status of ${user.email} is ACTIVE as expected.`,
    );

    // --- Test 1: Successful deactivation of an existing user ---
    console.log(`Attempting to deactivate user: ${user.email}`);
    await userStore.deactivate(user.user_id);
    console.log(`✅ User ${user.email} successfully deactivated.`);

    // Verify the user's status is now INACTIVE
    fetchedUser = await userStore.findUserById(user.user_id);
    assertExists(fetchedUser, "Deactivated user should still exist.");
    assertEquals(
      fetchedUser!.status,
      UserStatus.INACTIVE,
      "User status should be INACTIVE after deactivation.",
    );
    console.log(`Verified: User ${user.email} status is INACTIVE.`);

    // --- Test 2: Attempt to authenticate a deactivated user ---
    console.log(
      `Attempting to authenticate deactivated user: ${user.email}...`,
    );
    await assertRejects(
      async () => {
        await userStore.authenticate(user.email, userToDeactivate_password);
      },
      Error,
      "Authentication failed: User account is inactive.",
      "Authentication of a deactivated user should fail.",
    );
    console.log(
      `✅ Authentication rejected for deactivated user ${user.email} as expected.`,
    );

    // --- Test 3: Attempt to deactivate a non-existent user ---
    console.log("Attempting to deactivate a non-existent user...");
    const nonExistentUserId = Id.from(crypto.randomUUID()); // Generate a fresh, non-existent ID

    await assertRejects(
      async () => {
        await userStore.deactivate(nonExistentUserId);
      },
      Error,
      "Deactivation failed: User not found.",
      "Deactivating a non-existent user should throw 'User not found' error.",
    );
    console.log(
      `✅ Deactivation of non-existent user rejected as expected.`,
    );

    console.log("\nAll 'Deactivate' tests completed successfully.");
  } finally {
    await client.close(); // Ensure the database client is closed
  }
});

```
