---
timestamp: 'Fri Oct 17 2025 22:45:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_224550.ec9a8a62.md]]'
content_id: c0c681467bfd0a4ecd44f1f64653ae98d71fb7be2d171e01cecb64018fbc870b
---

# response:

To implement the `register` action, we need to add a method to the `UserStore` class. This method will handle checking for existing emails, generating a unique user ID, hashing the provided password, and inserting the new user into the database with an 'ACTIVE' status.

We'll also introduce:

1. A helper function `hashPassword` to securely derive the `password_hash`. For minimalism and using Deno's built-in capabilities, we'll use `crypto.subtle.digest` with SHA-256. *Note: In a production application, a stronger, salted, adaptive password hashing algorithm like bcrypt or Argon2 should be used.*
2. A public `User` interface to represent the user object returned by the `register` action, translating the internal `_id` to `user_id: Id`.
3. A unique index on the `email` field in the MongoDB collection to enforce the `email uniquely identifies a single user` invariant and support the `register` action's `requires` clause efficiently.

Here's the updated `user.ts` file:

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
}
```
