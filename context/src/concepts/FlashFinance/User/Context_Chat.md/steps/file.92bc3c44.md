---
timestamp: 'Fri Oct 17 2025 23:49:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_234921.34f2a726.md]]'
content_id: 92bc3c442e2e91d5805fae20aa497aec339b653b868c39a0021b04067c0937c4
---

# file: src/concepts/FlashFinance/User/test-actions/test-op-simple.ts

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
    await userStore.deactivate(inactiveUser.user_id); // Deactivate this user
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

Deno.test("UserStore: Change Password functionality", async () => {
  const [db, client] = await testDb();
  const userStore = new UserStore(db);

  try {
    // --- Setup: Register a user for password changes ---
    const email = "change_pass_user@example.com";
    const name = "ChangePass User";
    const initialPassword = "InitialPassword123";
    const newPassword = "NewSecurePassword456";
    const anotherNewPassword = "AnotherNewPassword789";

    console.log("Setup: Registering user for password change tests...");
    const user: User = await userStore.register(email, name, initialPassword);
    console.log(`Setup: User registered: ${user.email}`);

    // --- Test 1: Successful password change ---
    console.log("Attempting successful password change...");
    const changeResult1 = await userStore.changePassword(
      user.user_id,
      initialPassword,
      newPassword,
    );
    assert(changeResult1, "changePassword should return true on success.");
    console.log(`✅ Password successfully changed for ${user.email}`);

    // Verify authentication with new password
    console.log("Verifying authentication with new password...");
    const authenticatedWithNew = await userStore.authenticate(
      email,
      newPassword,
    );
    assertEquals(
      authenticatedWithNew.user_id.toString(),
      user.user_id.toString(),
      "Should authenticate with the new password.",
    );
    console.log("✅ Authenticated successfully with new password.");

    // Verify authentication with old password fails
    console.log("Verifying authentication with old password fails...");
    await assertRejects(
      async () => {
        await userStore.authenticate(email, initialPassword);
      },
      Error,
      "Authentication failed: Incorrect password.",
      "Should not authenticate with the old password after change.",
    );
    console.log("✅ Old password no longer works as expected.");

    // --- Test 2: Attempt to change password for a non-existent user ---
    console.log("Attempting to change password for a non-existent user...");
    const nonExistentId = Id.from(crypto.randomUUID()); //;
    await assertRejects(
      async () => {
        await userStore.changePassword(
          nonExistentId,
          "any_password",
          "another_password",
        );
      },
      Error,
      "Change password failed: User not found.",
      "Changing password for non-existent user should reject with 'User not found'.",
    );
    console.log("✅ Change password rejected for non-existent user.");

    // --- Test 3: Attempt to change password with incorrect old password ---
    console.log("Attempting to change password with incorrect old password...");
    await assertRejects(
      async () => {
        await userStore.changePassword(
          user.user_id,
          "WrongOldPassword", // Incorrect old password
          anotherNewPassword,
        );
      },
      Error,
      "Change password failed: Incorrect old password.",
      "Changing password with incorrect old password should reject.",
    );
    console.log("✅ Change password rejected for incorrect old password.");

    // Verify the password is still `newPassword` (not `anotherNewPassword`) after failed attempt
    console.log("Verifying password remains unchanged after failed attempt...");
    const stillAuthenticated = await userStore.authenticate(
      email,
      newPassword,
    );
    assertEquals(
      stillAuthenticated.user_id.toString(),
      user.user_id.toString(),
      "User should still authenticate with previous new password after a failed change attempt.",
    );
    console.log("✅ Previous password still works after failed attempt.");

    // --- Test 4: Change password to the same password (should still return true) ---
    console.log("Attempting to change password to the same password...");
    const changeToSameResult = await userStore.changePassword(
      user.user_id,
      newPassword, // current password
      newPassword, // same new password
    );
    assert(
      changeToSameResult,
      "Changing password to the same password should still return true.",
    );
    console.log("✅ Change password to same value returned true.");

    // Verify authentication still works with the (unchanged) password
    const authAfterSameChange = await userStore.authenticate(
      email,
      newPassword,
    );
    assertEquals(
      authAfterSameChange.user_id.toString(),
      user.user_id.toString(),
      "Should still authenticate with the (same) new password after changing to itself.",
    );
    console.log(
      "✅ Still authenticated with password after changing to itself.",
    );

    console.log("\nAll 'Change Password' tests completed successfully.");
  } finally {
    await client.close();
  }
});

```
