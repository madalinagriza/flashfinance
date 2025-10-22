---
timestamp: 'Mon Oct 20 2025 17:49:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_174909.325c24a9.md]]'
content_id: 9c9d1f74e3fd2db0ddbdad9b3850d0d43fd568187e3136e04b84f45cf4ebecfe
---

# API Specification: User Concept

**Purpose:** establish a unique identity for each person and control access to app functionality so that data is isolated per account

***

## API Endpoints

### POST /api/User/register

**Description:** Registers a new user with a unique email, name, and password.

**Requirements:**

* email is not used by any existing user

**Effects:**

* creates a new user with a fresh user\_id, password\_hash derived from password, status ACTIVE
* adds the user to Users
* returns the created user

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
  "user_id": "string",
  "email": "string",
  "name": "string",
  "status": "string (ACTIVE|INACTIVE)"
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

* there exists a user with the given email whose password\_hash matches password and whose status is ACTIVE

**Effects:**

* returns that user

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
  "user_id": "string",
  "email": "string",
  "name": "string",
  "status": "string (ACTIVE|INACTIVE)"
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

**Description:** Sets a user's account status to INACTIVE.

**Requirements:**

* a user with user\_id exists

**Effects:**

* sets the user's status to INACTIVE

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

**Description:** Changes a user's password after verifying the old password.

**Requirements:**

* a user with user\_id exists and old\_password matches the stored password\_hash

**Effects:**

* updates password\_hash with new\_password
* returns true

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

**Description:** Reactivates an inactive user account and updates their password.

**Requirements:**

* a user with the given email exists and `status = INACTIVE`

**Effects:**

* sets the user’s `status` to ACTIVE
* updates the user’s `password_hash` with the hash of `new_password`
* returns true

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

### POST /api/User/all

**Description:** Returns all user documents in the system.

**Requirements:**

* true (implicitly)

**Effects:**

* Returns all user documents.

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
    "status": "string (ACTIVE|INACTIVE)"
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
