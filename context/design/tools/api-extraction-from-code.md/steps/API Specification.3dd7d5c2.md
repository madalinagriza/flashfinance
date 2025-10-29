---
timestamp: 'Mon Oct 27 2025 21:52:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251027_215214.3f022557.md]]'
content_id: 3dd7d5c27a01a3943a9b9e106620c15f5359c398dbc90cebb021c4be1d1bbcd8
---

# API Specification: User Concept

**Purpose:** establish a unique identity for each person and control access to app functionality so that data is isolated per account

***

## API Endpoints

### POST /api/User/register

**Description:** Creates a new user account in the system.

**Requirements:**

* The provided `email` must not be used by any existing user.

**Effects:**

* A new user is created with a unique `user_id`.
* The provided password is hashed and stored.
* The user's status is set to `ACTIVE`.
* The new user object is returned.

**Request Body:**

```json
{
  "email": "String",
  "name": "String",
  "password": "String"
}
```

**Success Response Body (Action):**

```json
{
  "user_id": "ID",
  "email": "String",
  "name": "String",
  "status": "String"
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

**Description:** Verifies a user's credentials and grants access.

**Requirements:**

* A user must exist with the given `email`.
* The provided `password` must match the user's stored password hash.
* The user's status must be `ACTIVE`.

**Effects:**

* Returns the authenticated user's information.

**Request Body:**

```json
{
  "email": "String",
  "password": "String"
}
```

**Success Response Body (Action):**

```json
{
  "user_id": "ID",
  "email": "String",
  "name": "String",
  "status": "String"
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

**Description:** Deactivates a user's account, preventing them from authenticating.

**Requirements:**

* A user with the specified `user_id` must exist.

**Effects:**

* Sets the user's `status` to `INACTIVE`.

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

**Description:** Changes the password for an existing user.

**Requirements:**

* A user with the specified `user_id` must exist.
* The `old_password` must match the user's currently stored password.

**Effects:**

* The user's stored password hash is updated with a hash of the `new_password`.
* Returns `true` on success.

**Request Body:**

```json
{
  "user_id": "ID",
  "old_password": "String",
  "new_password": "String"
}
```

**Success Response Body (Action):**

```json
{
  "ok": "Boolean"
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

**Description:** Reactivates an inactive user account with a new password.

**Requirements:**

* A user with the given `email` must exist.
* The user's current `status` must be `INACTIVE`.

**Effects:**

* Sets the user's `status` to `ACTIVE`.
* Updates the user's password hash with the hash of the `new_password`.
* Returns `true` on success.

**Request Body:**

```json
{
  "email": "String",
  "new_password": "String"
}
```

**Success Response Body (Action):**

```json
{
  "ok": "Boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
