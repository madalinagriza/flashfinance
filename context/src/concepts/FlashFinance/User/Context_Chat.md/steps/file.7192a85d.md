---
timestamp: 'Fri Oct 17 2025 23:12:16 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_231216.a3c8ef26.md]]'
content_id: 7192a85da3fe803d366d620bd3700be45fc1a39c10f84759e0c9fea9c8b33328
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

```
