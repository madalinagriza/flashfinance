---
timestamp: 'Sat Oct 18 2025 00:03:10 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_000310.749a11bd.md]]'
content_id: df0ce9fb4d550efc943b7aabf5d3e61fc7bab7acf858df7057da65175ebcda96
---

# prompt:  # Implement a testcase that verifies that a user can re-register with the same email after their previous account has been deactivated. Consult the User spec and implementation for the correct method calls, and use `test-op-simple.ts` for structure, imports, and assertion style. The test should only demonstrate the required behavior: (1) registering a user, (2) deactivating that user, (3) re-registering with the same email should succeed and return a new `user_id`, and (4) the old deactivated account remains inactive. Do not add unrelated assertions or database queries. Use only the public methods from `UserStore` (`register`, `deactivate`, `authenticate`, `all`) to verify expected state. Keep the test minimal and focused on this single behavior. The new test will be added to `test-non-popular.ts`, so make all necessary imports.

**concept:** User\[ID]

**purpose:**\
establish a unique identity for each person and control access to app functionality so that data is isolated per account

**principle:**\
when a user chooses a category for a transaction, they create a label linking that transaction to the chosen category, making its purpose explicit in their records.
if the user stages labels and then finalizes, each transaction gains exactly one active label reflecting that choice; if the user cancels, no labels are applied.
suggestions may inform staging but never change state until finalized.\
**state:**

> a set of Users with
>
> > a user\_id ID\
> > an email String\
> > a name String\
> > a password\_hash String\
> > a status {ACTIVE | INACTIVE}

**actions:**

> register(email: String, name: String, password: String): (user: User)
>
> > *requires:*\
> > email is not used by any existing user\
> > *effects:*\
> > creates a new user with a fresh user\_id, password\_hash derived from password, status ACTIVE; adds the user to Users; returns the created user

> authenticate(email: String, password: String): (user: User)
>
> > *requires:*\
> > there exists a user with the given email whose password\_hash matches password and whose status is ACTIVE\
> > *effects:*\
> > returns that user

> deactivate(user\_id: ID)
>
> > *requires:*\
> > a user with user\_id exists\
> > *effects:*\
> > sets the user's status to INACTIVE

> changePassword(user\_id: ID, old\_password: String, new\_password: String): (ok: Boolean)
>
> > *requires:*\
> > a user with user\_id exists and old\_password matches the stored password\_hash\
> > *effects:*\
> > updates password\_hash with new\_password; returns true

**invariants:**

* email uniquely identifies a single user
* user\_id is unique and never reused
