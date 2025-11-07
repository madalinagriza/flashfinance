---
timestamp: 'Thu Nov 06 2025 11:04:43 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_110443.9705e3ee.md]]'
content_id: 06dc6a7ad0f71170d698eae19f60e4b58674659a3156a3ed96f9408871aa8c43
---

# response:

The trace indicates that your user registration was **successful**, but the subsequent login request **failed due to a timeout**.

Let's break down the trace:

## Successful Registration

1. **Request received:** `[Requesting] Received request for path: /UserAuthentication/register`
2. **Requesting action fired:** `Requesting.request { username: 'ploua', password: 'plouapicpic', path: '/UserAuthentication/register' } => { request: '019a59e4-bc9e-7a42-a21d-8cb5a77f06eb' }`
3. **UserAuthentication.register action fired & successful:** `UserAuthentication.register { username: 'ploua', password: 'plouapicpic' } => { user: '019a59e4-bcc6-7361-9605-468247d73229' }`
   * This confirms your `UserAuthenticationConcept.register` method correctly created a user and returned their ID.
4. **Response sent:** `Requesting.respond { request: '019a59e4-bc9e-7a42-a21d-8cb5a77f06eb', user: '019a59e4-bcc6-7361-9605-468247d73229' } => { request: '019a59e4-bc9e-7a42-a21d-8cb5a77f06eb' }`
   * This confirms the `RegisterResponseSuccess` sync in `auth.sync.ts` fired and sent the user ID back to the client.

Everything looks correct for the registration process.

## Failed Login

1. **Request received:** `[Requesting] Received request for path: /UserAuthentication/login`
2. **Requesting action fired:** `Requesting.request { username: 'ploua', password: 'plouapicpic', path: '/UserAuthentication/login' } => { request: '019a59e5-0dda-774f-a177-9faf57abee62' }`
3. **Timeout:** `[Requesting] Error processing request: Request 019a59e5-0dda-774f-a177-9faf57abee62 timed out after 10000ms`

**The critical observation here is that after `Requesting.request` for the login path, *no further concept actions are logged*.** This means the synchronizations intended to handle the login request never fired.

## Why it failed: Mismatch in Synchronization Pattern

Looking at your `src\syncs\auth.sync.ts` for login:

```typescript
//-- User Login & Session Creation --//
export const LoginRequest: Sync = ({ request, username, password }) => ({
  when: actions([Requesting.request, { path: "/login", username, password }, { // <--- PROBLEM HERE
    request,
  }]),
  then: actions([UserAuthentication.login, { username, password }]),
});
```

The `LoginRequest` synchronization is set to trigger when `Requesting.request` has a `path` of `"/login"`.

However, the trace shows the incoming request path as `/UserAuthentication/login`.

**The problem is that the `path` in your `LoginRequest` sync's `when` clause (`"/login"`) does not match the actual `path` received from the HTTP request (`"/UserAuthentication/login"`).**

Because the `when` condition didn't match, the `LoginRequest` sync never fired, meaning `UserAuthentication.login` was never called, and the request hung until it timed out.

## Backend Problem? Yes, a Synchronization Mismatch.

This is a backend problem, specifically a configuration issue in your synchronizations, not a bug in the `UserAuthenticationConcept` itself (which seemed to work fine for registration).

## Solution

You have two main ways to fix this:

### Option 1: Adjust the Synchronization to Match the Passthrough Route (Recommended for now)

The `Requesting` concept has "passthrough routes" which automatically map HTTP requests like `/api/UserAuthentication/login` to a `Requesting.request` action with `path: "/UserAuthentication/login"`.

To make your `LoginRequest` sync react to this:

**Modify `src\syncs\auth.sync.ts`:**

```typescript
//-- User Login & Session Creation --//
export const LoginRequest: Sync = ({ request, username, password }) => ({
  when: actions([Requesting.request, {
    path: "/UserAuthentication/login", // <--- CHANGE THIS LINE
    username,
    password,
  }, {
    request,
  }]),
  then: actions([UserAuthentication.login, { username, password }]),
});
```

**Reasoning for change:** Your `RegisterRequest` sync uses `path: "/UserAuthentication/register"`, which is why it worked. You're likely trying to use the automatically generated passthrough route for `UserAuthentication.login` as well, so your sync should match that path.

### Option 2: Disable Passthrough for `UserAuthentication/login` and Use a Custom `/login` Route

If you *intended* for `/login` to be your custom API endpoint and didn't want the passthrough route for `UserAuthentication.login` to be active, you would:

1. **Exclude the passthrough route:**
   **Modify `src/concepts/Requesting/passthrough.ts`** (or create it if it doesn't exist yet, as per the documentation):
   ```typescript
   export const exclusions = [
     // ... other exclusions
     "/api/UserAuthentication/login", // Add this
   ];
   ```
2. **Ensure your client calls `/api/login` instead of `/api/UserAuthentication/login`**.
   * Your existing `LoginRequest` sync looking for `path: "/login"` would then correctly trigger when `Requesting.request` is fired for `/login`.

This option gives you more control over your API surface but requires coordinating the client-side calls and disabling the default passthrough. For getting your login working quickly with the current client behavior, **Option 1 is the most straightforward fix.**

**After making the change, remember to restart your `deno run start` process.**
