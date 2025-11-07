---
timestamp: 'Tue Nov 04 2025 21:06:30 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_210630.9cc7fbc1.md]]'
content_id: 7060c680b0b5c6aceb64f83d08c688f110e4e1f60e164d6a6c8308b23f6743ca
---

# file: src/concepts/UserAuthentication/UserAuthenticationConcept.ts

```typescript
import { Collection, Db } from "mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Concept-specific generic type
type User = ID;

/**
 * a set of Users with
 *  a username String (unique)
 *  a passwordHash String
 */
interface UserDoc {
  _id: User;
  username: string;
  passwordHash: string;
}

const PREFIX = "UserAuthentication";

/**
 * @concept UserAuthentication
 * @purpose To securely verify a user's identity based on credentials.
 */
export default class UserAuthenticationConcept {
  private readonly users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection<UserDoc>(`${PREFIX}.users`);
  }

  /**
   * Hashes a password using SHA-256.
   * NOTE: In a production environment, a stronger, salted hashing algorithm
   * like Argon2 or bcrypt should be used.
   */
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * register (username: String, password: String): (user: User) | (error: String)
   *
   * **requires**: no User exists with the given `username`.
   * **effects**: creates a new User `u`; sets their `username` and a hash of their `password`; returns `u` as `user`.
   * If a user with the username already exists, it returns an error.
   */
  async register({ username, password }: { username: string; password: string }): Promise<{ user: User } | { error: string }> {
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: "Username already exists." };
    }

    const userId = freshID() as User;
    const passwordHash = await this.hashPassword(password);

    await this.users.insertOne({
      _id: userId,
      username,
      passwordHash,
    });

    return { user: userId };
  }

  /**
   * login (username: String, password: String): (user: User) | (error: String)
   *
   * **requires**: a User exists with the given `username` and the `password` matches their `passwordHash`.
   * **effects**: returns the matching User `u` as `user`.
   * If no user exists or the password does not match, it returns an error.
   */
  async login({ username, password }: { username: string; password: string }): Promise<{ user: User } | { error: string }> {
    const user = await this.users.findOne({ username });
    if (!user) {
      return { error: "Invalid username or password." };
    }

    const providedPasswordHash = await this.hashPassword(password);
    if (user.passwordHash !== providedPasswordHash) {
      return { error: "Invalid username or password." };
    }

    return { user: user._id };
  }

  /**
   * _getUserByUsername (username: String): (user: User)
   *
   * **requires**: a User with the given `username` exists.
   * **effects**: returns the corresponding User.
   */
  async _getUserByUsername({ username }: { username: string }): Promise<Array<{ user: User }>> {
    const user = await this.users.findOne({ username });
    if (!user) {
      return []; // Return empty array if user not found, as per query return type convention
    }
    return [{ user: user._id }];
  }
}
```
