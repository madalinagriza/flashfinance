---
timestamp: 'Sat Oct 18 2025 00:34:41 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_003441.bd8c3824.md]]'
content_id: 124bd34f5f5ffd6e3b8f8aab18cd9a6f5e22f4913978df9b34a34a61efa11ad4
---

# file: src/concepts/FlashFinance/User/test-actions/test-non-popular.ts

```typescript
import { testDb } from "@utils/database.ts";
import { assertEquals, assertRejects } from "jsr:@std/assert";
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
