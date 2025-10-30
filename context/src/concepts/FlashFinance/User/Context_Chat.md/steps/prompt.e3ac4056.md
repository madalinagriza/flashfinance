---
timestamp: 'Sat Oct 18 2025 00:34:41 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_003441.bd8c3824.md]]'
content_id: e3ac405674520e3795f5769082e291e0495b29e7a55924c1691adf0728cb48b6
---

# prompt:   Implement a testcase that verifies that a user can successfully deactivate their account, reactivate it with a new password, and then authenticate using that new password. Consult the `UserStore` implementation for correct method calls, and use `test-op-simple.ts` for structure, imports, and assertion style. The test should only demonstrate the required behavior: (1) the user registers, (2) deactivates successfully, (3) fails to authenticate while inactive, (4) reactivates with a new password, and (5) successfully authenticates with that new password. Use `await assertRejects` to confirm the authentication fails while inactive, and `assertExists` or `assertEquals` to verify the successful reactivation and authentication afterward. Do not add unrelated assertions or checks. Keep the test minimal — include only the necessary data and calls to demonstrate the deactivate–reactivate–authenticate flow. Place it as a new `Deno.test` in `test-non-popular.ts`.

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

> **reactivate**(email: String, new\_password: String): (ok: Boolean)
>
> > *requires:*\
> > a user with the given email exists and `status = INACTIVE`\
> > *effects:*\
> > sets the user’s `status` to ACTIVE; updates the user’s `password_hash` with the hash of `new_password`; returns true

**invariants:**

* email uniquely identifies a single user
* user\_id is unique and never reused
