---
timestamp: 'Thu Nov 06 2025 08:34:26 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_083426.a85a139f.md]]'
content_id: ffcd11f8e0c48faec4d3207a9c3b68baab8de333b5159d1e68984f9a2a649b9f
---

# API Specification: User Concept

**<font color="red">DEPRECATED</font>**: This concept is deprecated and should not be used in new development. It is being replaced by the `UserAuthentication` concept.

**Purpose:** Establish a unique identity for each person and control access to app functionality so that data is isolated per account.

***

## API Endpoints

### POST /api/User/register

**Description:** Creates a new user account.

**Requirements:**

* The provided `email` is not already in use by an existing user.

**Effects:**

* Creates a new user with a unique `user_id`.
* Hashes the provided `password` for storage.
* Sets the new user's status to `ACTIVE`.
* Adds the user to the user database.
* Returns the newly created user object (without the password hash).

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
  "user": {
    "user_id": "string",
    "email": "string",
    "name": "string",
    "status": "string"
  }
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

**Description:** Authenticates a user with their email and password.

**Requirements:**

* A user with the given `email` must exist.
* The provided `password` must match the user's stored password hash.
* The user's status must be `ACTIVE`.

**Effects:**

* Returns the authenticated user's object if all requirements are met.

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
  "user": {
    "user_id": "string",
    "email": "string",
    "name": "string",
    "status": "string"
  }
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

* Sets the user's status to `INACTIVE`.

**Request Body:**

```json
{
  "user_id": "string"
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

**Description:** Changes an existing user's password after verifying their old password.

**Requirements:**

* A user with the specified `user_id` must exist.
* The provided `old_password` must match the user's currently stored password hash.

**Effects:**

* Updates the user's stored password hash with a hash of the `new_password`.
* Returns `true` upon successful update.

**Request Body:**

```json
{
  "user_id": "string",
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

**Description:** Reactivates a user's `INACTIVE` account with a new password.

**Requirements:**

* A user with the given `email` must exist.
* The user's current status must be `INACTIVE`.

**Effects:**

* Sets the user's status to `ACTIVE`.
* Updates the user's password hash with a hash of the `new_password`.
* Returns `true` upon successful reactivation.

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

### POST /api/User/\_all

**Description:** Retrieves a list of all user accounts.

**Requirements:**

* None.

**Effects:**

* Returns an array of all user objects in the system.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "user_id": "string",
    "email": "string",
    "name": "string",
    "status": "string"
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

### POST /api/User/\_isActive

**Description:** Checks if a user's account is currently active by authenticating their credentials.

**Requirements:**

* A user with the given `email` must exist.
* The provided `password` must match the user's stored password hash.

**Effects:**

* Returns a boolean value indicating if the authenticated user's status is `ACTIVE`.

**Request Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "isActive": "boolean"
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
