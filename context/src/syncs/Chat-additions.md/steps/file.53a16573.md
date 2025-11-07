---
timestamp: 'Fri Nov 07 2025 01:10:53 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_011053.cc1698d3.md]]'
content_id: 53a16573bcbf402f8d27a35f3567d3a657d20ee67b44b386b779a4fd52bc60f2
---

# file: src\syncs\auth.sync.ts

```typescript
import { actions, Frames, Sync } from "@engine";
import { Requesting, Sessioning, UserAuthentication } from "@concepts";

//-- User Registration --//
export const RegisterRequest: Sync = ({ request, username, password }) => ({
  when: actions([Requesting.request, {
    path: "/UserAuthentication/register",
    username,
    password,
  }, { request }]),
  then: actions([UserAuthentication.register, { username, password }]),
});

export const RegisterResponseSuccess: Sync = ({ request, user }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/register" }, { request }],
    [UserAuthentication.register, {}, { user }],
  ),
  then: actions([Requesting.respond, { request, user }]),
});

export const RegisterResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/register" }, { request }],
    [UserAuthentication.register, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- User Login & Session Creation --//
export const LoginRequest: Sync = ({ request, username, password }) => ({
  when: actions([Requesting.request, { path: "/login", username, password }, {
    request,
  }]),
  then: actions([UserAuthentication.login, { username, password }]),
});

export const LoginSuccessCreatesSession: Sync = ({ user }) => ({
  when: actions([UserAuthentication.login, {}, { user }]),
  then: actions([Sessioning.create, { user }]),
});

export const LoginResponseSuccess: Sync = ({ request, user, session }) => ({
  when: actions(
    [Requesting.request, { path: "/login" }, { request }],
    [UserAuthentication.login, {}, { user }],
    [Sessioning.create, { user }, { session }],
  ),
  then: actions([Requesting.respond, { request, session }]),
});

export const LoginResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/login" }, { request }],
    [UserAuthentication.login, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- User Logout --//
export const LogoutRequest: Sync = ({ request, session, user }) => ({
  when: actions([Requesting.request, { path: "/logout", session }, {
    request,
  }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([Sessioning.delete, { session }]),
});

export const LogoutResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/logout" }, { request }],
    [Sessioning.delete, {}, {}],
  ),
  then: actions([Requesting.respond, { request, status: "logged_out" }]),
});

// -- User Change Password -- //

export const ChangePasswordRequest: Sync = (
  { request, session, user, oldPassword, newPassword, username },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/UserAuthentication/changePassword",
      session, // The client now provides a session ID
      oldPassword,
      newPassword,
    },
    { request },
  ]),
  where: async (frames) => {
    // Authenticate the session to get the user ID
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // If no user is found for the given session (e.g., invalid/expired session),
    // veto this sync by returning an empty set of frames.
    // This effectively makes the request unauthorized for this sync's path.
    if (frames.length === 0) {
      // You might also consider having a generic unauthorized response sync
      // that catches `Requesting.request` and responds with an error if no
      // other sync processes the request after session validation.
      return new Frames();
    }

    // Resolve the user ID to a username, as the UserAuthentication.changePassword
    // concept action requires a username, not a user ID directly.
    return await frames.query(UserAuthentication._getUsername, { user }, {
      username,
    });
  },
  then: actions([UserAuthentication.changePassword, {
    username,
    oldPassword,
    newPassword,
  }]),
});

// 2. Respond to successful password change (no changes needed here)
export const ChangePasswordResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changePassword" }, {
      request,
    }],
    [UserAuthentication.changePassword, {}, {}], // Matches successful return (empty object)
  ),
  then: actions([Requesting.respond, { request, status: "password_changed" }]),
});

// 3. Respond to password change error (no changes needed here)
export const ChangePasswordResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/UserAuthentication/changePassword" }, {
      request,
    }],
    [UserAuthentication.changePassword, {}, { error }], // Matches error return
  ),
  then: actions([Requesting.respond, { request, error }]),
});

```
