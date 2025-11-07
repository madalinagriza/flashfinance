---
timestamp: 'Tue Nov 04 2025 21:11:39 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_211139.80c4ae61.md]]'
content_id: bdcb9a460eaf9a91a0460ca7ed5d5b40561818c8a00f9c1d5a1024eb813ba9d7
---

# file: src/concepts/UserAuthentication/UserAuthenticationConcept.ts

```typescript
import { Collection, Db } from "mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Note: In a real application, use a proper password hashing library like bcrypt.
// For this example, we'll simulate hashing for demonstration purposes.
async function hashPassword(password: string): Promise<string> {
  // This is NOT a secure hash. For demonstration purposes only.
  return Promise.resolve(`${password}-hashed`);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  const newHash = await hashPassword(password);
  return newHash === hash;
}

const PREFIX = "UserAuthentication" + ".";

// Generic type parameter from the spec
type User = ID;

/**
 * state:
 *   a set of `User`s with
 *     a `username` String (unique)
 *     a `passwordHash` String
 */
interface UserDoc {
  _id: User;
  username: string;
  passwordHash: string;
}

/**
 * concept: UserAuthentication [User]
 * purpose: To securely verify a user's identity based on credentials.
 */
export default class UserAuthenticationConcept {
  users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    // Ensure username is unique as per the state requirements
    this.users.createIndex({ username: 1 }, { unique: true });
  }

  /**
   * register (username: String, password: String): (user: User) | (error: String)
   *
   * requires: no User exists with the given `username`.
   * effects: creates a new User `u`; sets their `username` and a hash of their `password`; returns `u` as `user`.
   * ---
   * requires: a User already exists with the given `username`.
   * effects: returns an error message.
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Precondition check for existing username
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: "Username already taken" };
    }

    // Effects
    const passwordHash = await hashPassword(password);
    const newUser: UserDoc = {
      _id: freshID() as User,
      username,
      passwordHash,
    };

    await this.users.insertOne(newUser);
    return { user: newUser._id };
  }

  /**
   * login (username: String, password: String): (user: User) | (error: String)
   *
   * requires: a User exists with the given `username` and the `password` matches their `passwordHash`.
   * effects: returns the matching User `u` as `user`.
   * ---
   * requires: no User exists with the given `username` or the `password` does not match.
   * effects: returns an error message.
   */
  async login(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    const user = await this.users.findOne({ username });

    if (!user) {
      return { error: "Invalid username or password" };
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);
    if (!passwordMatches) {
      return { error: "Invalid username or password" };
    }

    return { user: user._id };
  }

  /**
   * _getUserByUsername (username: String): (user: User)
   *
   * requires: a User with the given `username` exists.
   * effects: returns the corresponding User.
   */
  async _getUserByUsername({ username }: { username: string }): Promise<Array<{ user: User }>> {
    const user = await this.users.findOne({ username });
    if (user) {
      return [{ user: user._id }];
    }
    return []; // Return empty array if not found, as per query return type requirement
  }
}
```
