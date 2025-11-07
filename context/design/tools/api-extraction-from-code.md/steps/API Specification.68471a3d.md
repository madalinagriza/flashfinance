---
timestamp: 'Thu Nov 06 2025 08:37:14 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_083714.01e97625.md]]'
content_id: 68471a3de0589f2d1a8f21ce9ea885a47e2ae93c6601dac2d0b8740be9c71278
---

# API Specification: UserAuthentication Concept

**Purpose:** To verify the identity of a user, enabling secure access to the system by managing user registration and login credentials.

***

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Creates a new user account with a unique username and a password.

**Requirements:**

* The provided `username` must not already be in use by an existing user.
* The `password` must meet the system's complexity requirements (e.g., minimum length).

**Effects:**

* A new `User` entity is created and stored.
* The user's `username` is set to the provided `username`.
* The user's password is securely hashed and stored.
* Returns the unique ID of the newly created `user`.

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/login

**Description:** Authenticates a user using their username and password.

**Requirements:**

* A user with the given `username` must exist.
* The provided `password` must correctly match the stored password for that user.

**Effects:**

* If authentication is successful, returns the unique ID of the authenticated `user`.

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/changePassword

**Description:** Updates the password for a specified user.

**Requirements:**

* The `user` identified by the `user` ID must exist.
* The `oldPassword` must match the user's current password.
* The `newPassword` must meet system complexity requirements.

**Effects:**

* The user's stored password hash is updated to a new hash derived from the `newPassword`.
* Returns an empty object on success.

**Request Body:**

```json
{
  "user": "ID",
  "oldPassword": "string",
  "newPassword": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/\_findUserByUsername

**Description:** Retrieves a user's information by their username.

**Requirements:**

* None. The query will simply return an empty array if no user is found.

**Effects:**

* Returns an array containing the matching `user` object if a user with the given `username` exists.

**Request Body:**

```json
{
  "username": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "user": "ID",
    "username": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/UserAuthentication/\_checkUserExists

**Description:** Checks if a user with the specified username already exists.

**Requirements:**

* None.

**Effects:**

* Returns an array containing an object with an `exists` flag set to `true` if the user is found, or `false` otherwise.

**Request Body:**

```json
{
  "username": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "exists": "boolean"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
