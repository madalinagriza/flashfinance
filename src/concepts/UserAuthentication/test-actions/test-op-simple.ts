import { assert, assertEquals, assertExists } from "@std/assert";
import { testDb } from "@utils/database.ts";
import UserAuthenticationConcept from "../UserAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

// Test suite for the UserAuthentication concept based on its principle.
Deno.test("UserAuthentication Concept: Operational Principle", async (t) => {
  const [db, client] = await testDb(); // Get a clean test database
  const userAuthentication = new UserAuthenticationConcept(db);

  // Clean up the collection before starting to ensure a fresh state
  await userAuthentication.users.deleteMany({});

  const testUsername = "testuser";
  const testPassword = "password123";
  let registeredUserId: ID | undefined;

  await t.step("should register a new user successfully", async () => {
    const result = await userAuthentication.register({
      username: testUsername,
      password: testPassword,
    });

    // FIX: Use a type guard to check for the error property.
    // This allows TypeScript to correctly infer the type inside the if/else blocks.
    if ("error" in result) {
      assert(false, `Registration failed unexpectedly: ${result.error}`);
    } else {
      assertExists(result.user, "Registration should return a user ID.");
      registeredUserId = result.user; // Save for subsequent steps
    }
  });

  await t.step(
    "should fail to register a user with a duplicate username",
    async () => {
      const result = await userAuthentication.register({
        username: testUsername,
        password: "anotherpassword",
      });

      // Here we expect an error
      assert(
        "error" in result,
        "Registration with a duplicate username should return an error.",
      );
      assertEquals(result.error, "Username already exists");
    },
  );

  await t.step(
    "should login an existing user with correct credentials",
    async () => {
      assertExists(
        registeredUserId,
        "Cannot run login test without a registered user ID.",
      );
      const result = await userAuthentication.login({
        username: testUsername,
        password: testPassword,
      });

      // Use the same type guard pattern for the login result
      if ("error" in result) {
        assert(false, `Login failed unexpectedly: ${result.error}`);
      } else {
        assertExists(result.user);
        assertEquals(
          result.user,
          registeredUserId,
          "Logged in user ID should match the registered user ID.",
        );
      }
    },
  );

  await t.step("should fail to login with an incorrect password", async () => {
    const result = await userAuthentication.login({
      username: testUsername,
      password: "wrongpassword",
    });

    assert(
      "error" in result,
      "Login with an incorrect password should return an error.",
    );
    assertEquals(result.error, "Invalid username or password");
  });

  await t.step(
    "should fail to login with a non-existent username",
    async () => {
      const result = await userAuthentication.login({
        username: "nonexistentuser",
        password: testPassword,
      });

      assert(
        "error" in result,
        "Login with a non-existent username should return an error.",
      );
      assertEquals(result.error, "Invalid username or password");
    },
  );

  // Clean up and close the connection after all tests are done
  await userAuthentication.users.deleteMany({});
  await client.close();
});
