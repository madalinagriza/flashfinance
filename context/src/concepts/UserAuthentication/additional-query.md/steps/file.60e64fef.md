---
timestamp: 'Tue Nov 04 2025 21:06:30 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_210630.9cc7fbc1.md]]'
content_id: 60e64fef2565862e31a22bed159dc34de62d618b3abbb0de94ec8650b10fc9e5
---

# file: src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts

```typescript
import { testDb } from "@utils/database.ts";
import { assertEquals, assertExists } from "@std/assert";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("UserAuthentication Concept: Principle Scenario", async () => {
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  try {
    const username = "testuser";
    const password = "password123";

    // 1. Register with a unique username and password
    console.log("Attempting to register a new user...");
    const registerResult = await concept.register({ username, password });

    if ("error" in registerResult) {
      throw new Error(`Registration failed unexpectedly: ${registerResult.error}`);
    }
    assertExists(registerResult.user, "Registration should return a user ID.");
    const userId = registerResult.user;
    console.log(`✅ User registered successfully with ID: ${userId}`);

    // 2. Later, provide the same credentials to log in
    console.log("Attempting to log in with correct credentials...");
    const loginResult = await concept.login({ username, password });

    if ("error" in loginResult) {
      throw new Error(`Login failed unexpectedly: ${loginResult.error}`);
    }
    assertExists(loginResult.user, "Login should return a user ID.");
    console.log(`✅ Login successful for user: ${loginResult.user}`);

    // 3. You will be successfully identified as that user
    assertEquals(loginResult.user, userId, "Logged-in user ID should match the registered user ID.");
    console.log("✅ Principle scenario successful: Register and login works as expected.");
  } finally {
    await client.close();
  }
});

Deno.test("UserAuthentication Concept: Action Requirements", async () => {
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  try {
    const username = "edgecaseuser";
    const password = "password123";
    const wrongPassword = "wrongpassword";

    // Setup: Register a user to test against
    await concept.register({ username, password });

    // Test `register` with a duplicate username
    console.log("Attempting to register with a duplicate username...");
    const duplicateRegisterResult = await concept.register({ username, password: "anypassword" });
    assertExists(duplicateRegisterResult.error, "Registering with a duplicate username should return an error.");
    assertEquals(duplicateRegisterResult.error, "Username already exists.");
    console.log("✅ Correctly blocked registration with duplicate username.");

    // Test `login` with a non-existent username
    console.log("Attempting to log in with a non-existent username...");
    const nonExistentUserLogin = await concept.login({ username: "nouser", password });
    assertExists(nonExistentUserLogin.error, "Login with non-existent username should return an error.");
    assertEquals(nonExistentUserLogin.error, "Invalid username or password.");
    console.log("✅ Correctly blocked login with non-existent username.");

    // Test `login` with an incorrect password
    console.log("Attempting to log in with an incorrect password...");
    const wrongPasswordLogin = await concept.login({ username, password: wrongPassword });
    assertExists(wrongPasswordLogin.error, "Login with incorrect password should return an error.");
    assertEquals(wrongPasswordLogin.error, "Invalid username or password.");
    console.log("✅ Correctly blocked login with incorrect password.");
  } finally {
    await client.close();
  }
});

Deno.test("UserAuthentication Concept: Queries", async () => {
  const [db, client] = await testDb();
  const concept = new UserAuthenticationConcept(db);

  try {
    const username = "queryuser";
    const password = "password123";

    // Setup: Register a user
    const registerResult = await concept.register({ username, password });
    if ("error" in registerResult) throw new Error("Setup failed");
    const userId = registerResult.user;

    // Test `_getUserByUsername` successful case
    console.log("Querying for an existing user by username...");
    const foundUsers = await concept._getUserByUsername({ username });
    assertEquals(foundUsers.length, 1, "Should find exactly one user.");
    assertEquals(foundUsers[0].user, userId, "The found user ID should match the registered ID.");
    console.log("✅ Successfully found user by username.");

    // Test `_getUserByUsername` failure case
    console.log("Querying for a non-existent user by username...");
    const notFoundUsers = await concept._getUserByUsername({ username: "nonexistent" });
    assertEquals(notFoundUsers.length, 0, "Should return an empty array for a non-existent user.");
    console.log("✅ Correctly returned an empty array for a non-existent user.");
  } finally {
    await client.close();
  }
});
```
