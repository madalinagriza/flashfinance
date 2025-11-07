---
timestamp: 'Wed Nov 05 2025 13:09:00 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_130900.b1076c84.md]]'
content_id: 91c2fca6f06c1e38b90b2fbc42c38aecdb58a82b5971b9adda2975b730faf2bd
---

# response:

Excellent question. This gets to the very heart of the architectural pattern that concept design promotes.

The short answer is: **You should almost always access getters (queries) through synchronizations and explicitly disable their direct passthrough routes.**

Exposing queries directly via passthrough routes is a convenience for rapid development or for data that is genuinely public and requires no authorization. However, for most real-world application logic, it breaks key principles of the design.

Here’s a detailed breakdown of why:

***

### 1. The Core Problem: Bypassing Authorization and Business Logic

The primary reason to avoid exposing queries directly is that it bypasses the entire orchestration layer (your syncs). A query is a direct, unfiltered window into a concept's state.

* **Direct Exposure (The "Unsafe" Way):** A user can send an HTTP request directly to `/api/UserProfile/_getProfile({ user: "some_user_id" })`. The `UserProfile` concept has no inherent knowledge of who is making the request. It will dutifully retrieve the profile for *any* valid user ID it's given, potentially leaking private information.
* **Access via Sync (The "Safe" Way):** The user sends a request to a custom endpoint, like `POST /api/users/my-profile`. This triggers a `Requesting.request` action. A synchronization then:
  1. Catches this request.
  2. Uses the provided session from the request to query the `Sessioning` concept to get the *currently authenticated user's ID*.
  3. Uses *that specific, verified user ID* to query the `UserProfile` concept.
  4. Responds with the data.

In the second scenario, it's impossible for a user to request another user's profile because the logic is dictated by the sync, not the user's input.

### 2. Concrete Example: Getting a User's Email

Let's imagine a `UserProfile` concept.

```typescript
// in UserProfileConcept.ts
// ... state, etc.
/**
 * _getEmail (user: User): (email: String)
 * 
 * **requires** user exists
 * **effects** returns the email for the given user
 */
async _getEmail({ user }: { user: User }): Promise<{ email: string }[]> {
    const doc = await this.users.findOne({ _id: user });
    return doc ? [{ email: doc.email }] : [];
}
```

#### Scenario A: Unsafe Direct Exposure (Default Passthrough)

If you do nothing, the passthrough route `/api/UserProfile/_getEmail` is available. An attacker can now do this:

```bash
# Attacker knows Alice's user ID from a public post
curl -X POST http://localhost:10000/api/UserProfile/_getEmail \
     -H "Content-Type: application/json" \
     -d '{ "user": "user:Alice" }'

# Response:
# [{"email":"alice@example.com"}]
```

The attacker has just harvested Alice's private email address.

#### Scenario B: Safe Exposure via a Sync

First, you **exclude** the passthrough route in `passthrough.ts`:

```typescript
// in src/concepts/Requesting/passthrough.ts
export const exclusions = [
  "/api/UserProfile/_getEmail",
  // ... other private actions/queries
];
```

Next, you create a synchronization that defines a new, safe API endpoint.

```typescript
// in src/syncs/profile.sync.ts
import { actions, Sync } from "@engine";
import { Requesting, Sessioning, UserProfile } from "@concepts";

export const GetMyEmail: Sync = ({ request, session, user, email }) => ({
  when: actions(
    // 1. A request comes in for a custom, logical endpoint
    [Requesting.request, { path: "/profile/my-email", session }, { request }],
  ),
  where: async (frames) => {
    // 2. We use the session to securely find out who the user is
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    // 3. We use that secure user ID to get their email
    return await frames.query(UserProfile._getEmail, { user }, { email });
  },
  then: actions(
    // 4. We respond to the original request with only their own email
    [Requesting.respond, { request, email }],
  ),
});
```

Now, the only way for a user to get an email is to make this request:

```bash
# User provides their own valid session token
curl -X POST http://localhost:10000/api/profile/my-email \
     -H "Content-Type: application/json" \
     -d '{ "session": "session_token_for_alice" }'

# Response:
# {"email":"alice@example.com"}
```

If an attacker tries to get Bob's email, they can't. They would need Bob's session token, at which point they are effectively Bob. The API is secure by design.

### 3. When is it "Safe" to Expose Getters?

It is safe to expose a query via passthrough **only when the data is truly public and requires no context or authorization**.

Good examples:

* `_getPublicPosts()`: A query that returns a list of all posts marked as public.
* `_getProductName({ id })`: A query to get the name of a product from a public catalog.

Bad examples (should be handled by syncs):

* `_getPurchaseHistory({ user })`
* `_getPrivateMessages({ user })`
* `_isAdmin({ user })`

### Rule of Thumb

1. **Default to Exclusion:** Add all actions and queries to the `exclusions` list in `passthrough.ts` by default.
2. **Expose via Syncs:** Implement the application's API by writing syncs that listen for `Requesting.request` actions. This forces you to think about authorization and composition.
3. **Opt-in to Passthrough:** Only move a query route from `exclusions` to `inclusions` if you can confidently say, "This data is public, requires no authorization, and I want any client to be able to access it directly."
