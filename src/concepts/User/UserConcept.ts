import { Collection, Db } from "mongodb";
import { Id } from "../../utils/Id.ts";

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

const PREFIX = "User" + "."; // Prefix for MongoDB collection names, following LabelConcept.ts pattern

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
export default class UserConcept {
  // The MongoDB collection for storing User documents
  private users: Collection<UserDoc>;

  /**
   * Constructs a new UserConcept instance.
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

  async register(email: string, name: string, password: string): Promise<User>;
  async register(
    payload: { email: string; name: string; password: string },
  ): Promise<User>;
  async register(
    a: string | { email: unknown; name: unknown; password: unknown },
    b?: string,
    c?: string,
  ): Promise<User> {
    // narrow both styles
    const email = typeof a === "object" ? String(a.email) : a;
    const name = typeof a === "object" ? String(a.name) : String(b);
    const password = typeof a === "object" ? String(a.password) : String(c);
    if (
      typeof email !== "string" ||
      typeof name !== "string" ||
      typeof password !== "string"
    ) {
      throw new Error(
        "Invalid types: email, name, and password must be strings.",
      );
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.users.findOne({ email: normalizedEmail });
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
      email: normalizedEmail,
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
  async authenticate(email: string, password: string): Promise<User>;
  async authenticate(
    payload: { email: string; password: string },
  ): Promise<User>;
  async authenticate(
    a: string | { email: unknown; password: unknown },
    b?: string,
  ): Promise<User> {
    // narrow both styles
    const email = typeof a === "object" ? String(a.email) : a;
    const password = typeof a === "object" ? String(a.password) : String(b);

    // requires: there exists a user with the given email
    const normalizedEmail = email.trim().toLowerCase();
    const userDoc = await this.users.findOne({ email: normalizedEmail });
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

  async deactivate(user_id: Id): Promise<void>;
  async deactivate(payload: { user_id: string }): Promise<void>;
  async deactivate(a: Id | { user_id: string }): Promise<void> {
    // narrow both styles
    const user_id = a instanceof Id ? a : Id.from(a.user_id);

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

  async changePassword(
    user_id: Id,
    old_password: string,
    new_password: string,
  ): Promise<boolean>;
  async changePassword(
    payload: { user_id: string; old_password: string; new_password: string },
  ): Promise<boolean>;
  async changePassword(
    a: Id | { user_id: string; old_password: unknown; new_password: unknown },
    b?: string,
    c?: string,
  ): Promise<boolean> {
    // narrow both styles
    const user_id = a instanceof Id ? a : Id.from(a.user_id);
    const old_password = a instanceof Id ? String(b) : String(a.old_password);
    const new_password = a instanceof Id ? String(c) : String(a.new_password);

    // requires: a user with user_id exists
    const userDoc = await this.users.findOne({ _id: user_id.toString() });
    if (!userDoc) {
      throw new Error("Change password failed: User not found.");
    }

    // requires: and old_password matches the stored password_hash
    const hashedOldPassword = await hashPassword(old_password);
    if (userDoc.password_hash !== hashedOldPassword) {
      throw new Error("Change password failed: Incorrect old password.");
    }

    // effects: updates password_hash with new_password
    const hashedNewPassword = await hashPassword(new_password);

    const result = await this.users.updateOne(
      { _id: user_id.toString() },
      { $set: { password_hash: hashedNewPassword } },
    );

    // effects: returns true
    // If matchedCount is 1, the user was found. Even if new_password is the same as
    // old_password, the action conceptually "updates" it to that value, and returns true.
    return result.matchedCount === 1;
  }

  async reactivate(email: string, new_password: string): Promise<boolean>;
  async reactivate(
    payload: { email: string; new_password: string },
  ): Promise<boolean>;
  async reactivate(
    a: string | { email: unknown; new_password: unknown },
    b?: string,
  ): Promise<boolean> {
    // narrow both styles
    const email = typeof a === "object" ? String(a.email) : a;
    const new_password = typeof a === "object"
      ? String(a.new_password)
      : String(b);

    // requires: a user with this email exists and status = INACTIVE
    const normalizedEmail = email.trim().toLowerCase();
    const userDoc = await this.users.findOne({ email: normalizedEmail });

    if (!userDoc) {
      throw new Error("Reactivation failed: User not found.");
    }
    if (userDoc.status !== UserStatus.INACTIVE) {
      throw new Error("Reactivation failed: User is already active.");
    }

    // effects: set status = ACTIVE and update password_hash
    const newPasswordHash = await hashPassword(new_password);
    const result = await this.users.updateOne(
      { _id: userDoc._id },
      {
        $set: {
          status: UserStatus.ACTIVE,
          password_hash: newPasswordHash,
        },
      },
    );

    // returns true if reactivation succeeded
    return result.matchedCount === 1;
  }
}
