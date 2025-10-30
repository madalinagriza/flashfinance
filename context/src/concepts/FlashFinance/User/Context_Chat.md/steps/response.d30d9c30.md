---
timestamp: 'Sat Oct 18 2025 00:34:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_003450.45b3b62a.md]]'
content_id: d30d9c3086ebe680888d182c983756a665e536def5f613a14fc8cccadb467f1f
---

# response:

```typescript
import { testDb } from "@utils/database.ts";
import { assert, assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { User, UserStatus, UserStore } from "../user.ts"; // Assuming user.ts is in the same directory

// Add a new Deno.test for the deactivate-reactivate-authenticate flow
Deno.test("UserStore: Deactivate, Reactivate with new password, and Authenticate flow", async () => {
  const [db, client] = await testDb(); // Get a clean test database
  const userStore = new UserStore(db);

  const userEmail = "flow_test_user@example.com";
  const userName = "Flow Test User";
  const initialPassword = "InitialSecurePassword123";
  const newReactivationPassword = "NewReactivationPassword456";

  let registeredUser: User; // Declare registeredUser outside to be accessible in finally

  try {
    // (1) The user registers
    console.log("1. Registering a new user...");
    registeredUser = await userStore.register(
      userEmail,
      userName,
      initialPassword,
    );
    assertExists(registeredUser, "User should be successfully registered.");
    assertEquals(
      registeredUser.status,
      UserStatus.ACTIVE,
      "User status should be ACTIVE after registration.",
    );
    console.log(`✅ User registered: ${registeredUser.email}`);

    // (2) Deactivates successfully
    console.log("2. Deactivating the user's account...");
    await userStore.deactivate(registeredUser.user_id);
    console.log(`✅ User deactivated: ${registeredUser.email}`);

    // (3) Fails to authenticate while inactive
    console.log("3. Attempting to authenticate with the inactive account (should fail)...");
    await assertRejects(
      async () => {
        await userStore.authenticate(userEmail, initialPassword);
      },
      Error,
      "Authentication failed: User account is inactive.",
      "Authentication for an inactive user should throw 'User account is inactive' error.",
    );
    console.log("✅ Authentication failed for inactive user as expected.");

    // (4) Reactivates with a new password
    console.log("4. Reactivating the user's account with a new password...");
    const reactivationResult = await userStore.reactivate(
      userEmail,
      newReactivationPassword,
    );
    assert(
      reactivationResult,
      "Reactivation with new password should return true.",
    );
    console.log("✅ User reactivated with new password.");

    // (5) Successfully authenticates with that new password
    console.log("5. Attempting to authenticate with the new password (should succeed)...");
    const authenticatedUser = await userStore.authenticate(
      userEmail,
      newReactivationPassword,
    );
    assertExists(
      authenticatedUser,
      "Authenticated user object should be returned.",
    );
    assertEquals(
      authenticatedUser.user_id.toString(),
      registeredUser.user_id.toString(),
      "Authenticated user ID should match the original user.",
    );
    assertEquals(
      authenticatedUser.email,
      userEmail,
      "Authenticated user email should match.",
    );
    assertEquals(
      authenticatedUser.status,
      UserStatus.ACTIVE,
      "Authenticated user status should be ACTIVE after reactivation.",
    );
    console.log("✅ Successfully authenticated with the new password.");

    // Optional but good check: Verify old password no longer works after reactivation
    console.log("6. Verifying old password no longer works after reactivation...");
    await assertRejects(
      async () => {
        await userStore.authenticate(userEmail, initialPassword);
      },
      Error,
      "Authentication failed: Incorrect password.",
      "Old password should not work after reactivation with a new password.",
    );
    console.log("✅ Old password correctly rejected after reactivation.");

    console.log(
      "\nAll 'Deactivate, Reactivate, Authenticate' flow tests completed successfully.",
    );
  } finally {
    await client.close(); // Ensure the database client is closed
  }
});
```
