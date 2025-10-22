import { testDb } from "@utils/database.ts";
import {
  assert,
  assertEquals,
  assertExists,
  assertRejects,
} from "jsr:@std/assert";
import UserConcept, { User, UserStatus } from "../UserConcept.ts"; // Assuming userConcept.ts is in the same directory

Deno.test("UserConcept: Email normalization prevents duplicate registrations (case-insensitivity, whitespace)", async () => {
  const [db, client] = await testDb(); // Get a clean test database
  const userConcept = new UserConcept(db);

  try {
    const originalEmailCasing = "TestUser@example.com";
    const lowercaseEmail = "testuser@example.com";
    const trimmedSpacedEmail = " testuser@example.com "; // Lowercase with spaces

    // 1. Register the initial user with mixed-casing email
    console.log(
      `Attempting to register user with email: ${originalEmailCasing}`,
    );
    const registeredUser: User = await userConcept.register(
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
    let allUsers = await userConcept.all();
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
        await userConcept.register(
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
    allUsers = await userConcept.all();
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
        await userConcept.register(
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
    allUsers = await userConcept.all();
    assertEquals(
      allUsers.length,
      1,
      "No new user should be added after a failed duplicate (whitespace) registration.",
    );

    // --- Optional: Verify authentication also works with normalized emails ---

    console.log("Verifying authentication with original casing email...");
    const auth1 = await userConcept.authenticate(
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
    const auth2 = await userConcept.authenticate(lowercaseEmail, "password123");
    assertEquals(
      auth2.user_id.toString(),
      registeredUser.user_id.toString(),
      "Should authenticate successfully with lowercase email.",
    );
    console.log("✅ Authenticated successfully with lowercase email.");

    console.log("Verifying authentication with trimmed spaced email...");
    const auth3 = await userConcept.authenticate(
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

Deno.test("UserConcept: Deactivate, Reactivate with new password, and Authenticate flow", async () => {
  const [db, client] = await testDb(); // Get a clean test database
  const userConcept = new UserConcept(db);

  const userEmail = "flow_test_user@example.com";
  const userName = "Flow Test User";
  const initialPassword = "InitialSecurePassword123";
  const newReactivationPassword = "NewReactivationPassword456";

  let registeredUser: User; // Declare registeredUser outside to be accessible in finally

  try {
    // (1) The user registers
    console.log("1. Registering a new user...");
    registeredUser = await userConcept.register(
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
    await userConcept.deactivate(registeredUser.user_id);
    console.log(`✅ User deactivated: ${registeredUser.email}`);

    // (3) Fails to authenticate while inactive
    console.log(
      "3. Attempting to authenticate with the inactive account (should fail)...",
    );
    await assertRejects(
      async () => {
        await userConcept.authenticate(userEmail, initialPassword);
      },
      Error,
      "Authentication failed: User account is inactive.",
      "Authentication for an inactive user should throw 'User account is inactive' error.",
    );
    console.log("✅ Authentication failed for inactive user as expected.");

    // (4) Reactivates with a new password
    console.log("4. Reactivating the user's account with a new password...");
    const reactivationResult = await userConcept.reactivate(
      userEmail,
      newReactivationPassword,
    );
    assert(
      reactivationResult,
      "Reactivation with new password should return true.",
    );
    console.log("✅ User reactivated with new password.");

    // (5) Successfully authenticates with that new password
    console.log(
      "5. Attempting to authenticate with the new password (should succeed)...",
    );
    const authenticatedUser = await userConcept.authenticate(
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
    console.log(
      "6. Verifying old password no longer works after reactivation...",
    );
    await assertRejects(
      async () => {
        await userConcept.authenticate(userEmail, initialPassword);
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
