---
timestamp: 'Fri Oct 17 2025 22:50:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_225032.0b7867c1.md]]'
content_id: 8433e07c0000c3407f8f272546d4c8cdd7584c4db541fd96da985adbe0c89e76
---

# prompt:  setup a very minimal test for user.ts that tests the functionality of the register action and the getter all. consult test-op-simple of the label concept to see how to use deno functions, what to import etc. Use only the public functions you've written in user.ts .

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
