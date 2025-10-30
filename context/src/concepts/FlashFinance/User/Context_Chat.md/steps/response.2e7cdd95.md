---
timestamp: 'Fri Oct 17 2025 23:31:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_233123.667ae2f2.md]]'
content_id: 2e7cdd95206ff9b33dd8bc2520c1aa4276da1291037c3dfec5e1e32e1ac6bbac
---

# response:

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
    await userStore.deactivate(inactiveUser.user_id); // Deactivate this user
    console.log(`Setup: Registered and deactivated user: ${inactiveUser.email}`);

    // --- Test 1: Successful authentication ---
    console.log("Attempting successful authentication...");
    const authenticatedUser = await userStore.authenticate(
      active_email,
      active_password,
    );

    assertExists(authenticatedUser, "Authenticated user object should be returned.");
    assertEquals(authenticatedUser.user_id.toString(), activeUser.user_id.toString(), "Authenticated user ID should match.");
    assertEquals(authenticatedUser.email, active_email, "Authenticated user email should match.");
    assertEquals(authenticatedUser.status, UserStatus.ACTIVE, "Authenticated user status should be ACTIVE.");
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
    console.log(`✅ Authentication rejected for non-existent email: ${nonExistentEmail}`);

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
    console.log(`✅ Authentication rejected for incorrect password for ${active_email}`);

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
    console.log(`✅ Authentication rejected for inactive user: ${inactive_email}`);

    console.log("\nAll 'Authenticate' tests completed successfully.");
  } finally {
    await client.close(); // Ensure the database client is closed
  }
});
```
