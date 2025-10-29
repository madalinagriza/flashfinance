---
timestamp: 'Tue Oct 28 2025 20:59:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251028_205932.95ca8de5.md]]'
content_id: a179c0d5eaf603cbcc5f2ba398365c7990d5cfc5688f4117d895250bd5641d45
---

# API Specification: User Concept

**Purpose:** establish a unique identity for each person and control access to app functionality so that data is isolated per account

***

## API Endpoints

### POST /api/User/register

**Description:** Creates a new user account.

**Requirements:**

* The provided `email` must not already be in use by an existing user.

**Effects:**

* A new user record is created with a unique `user_id`.
* The provided password is hashed and stored.
* The user's status is set to `ACTIVE`.
* The newly created user object (without password hash) is returned.

**Request Body:**

```json
{
  "email": "string",
  "name": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user_id": "ID",
  "email": "string",
  "name": "string",
  "status": "ACTIVE"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/User/authenticate

**Description:** Verifies a user's credentials and logs them in.

**Requirements:**

* A user with the given `email` must exist.
* The provided `password` must match the user's stored password hash.
* The user's status must be `ACTIVE`.

**Effects:**

* If credentials are valid, the corresponding user object is returned.

**Request Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user_id": "ID",
  "email": "string",
  "name": "string",
  "status": "ACTIVE"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/User/deactivate

**Description:** Deactivates a user's account, preventing them from logging in.

**Requirements:**

* A user with the specified `user_id` must exist.

**Effects:**

* The user's `status` is set to `INACTIVE`.

**Request Body:**

```json
{
  "user_id": "ID"
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

### POST /api/User/changePassword

**Description:** Updates the password for an existing user.

**Requirements:**

* A user with the specified `user_id` must exist.
* The `old_password` must match the user's current password hash.

**Effects:**

* The user's stored `password_hash` is updated with the hash of the `new_password`.
* A success status is returned.

**Request Body:**

```json
{
  "user_id": "ID",
  "old_password": "string",
  "new_password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "ok": "boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/User/reactivate

**Description:** Reactivates an inactive user account and sets a new password.

**Requirements:**

* A user with the given `email` must exist.
* The user's current `status` must be `INACTIVE`.

**Effects:**

* The user's `status` is set to `ACTIVE`.
* The user's `password_hash` is updated with the hash of the `new_password`.
* A success status is returned.

**Request Body:**

```json
{
  "email": "string",
  "new_password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "ok": "boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
