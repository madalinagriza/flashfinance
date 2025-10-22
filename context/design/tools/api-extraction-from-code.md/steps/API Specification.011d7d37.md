---
timestamp: 'Tue Oct 21 2025 20:40:27 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_204027.a009af03.md]]'
content_id: 011d7d3737b4ab221be85ab753e59d1cc956625f351de59b3a8b3c46c9e53e9c
---

# API Specification: User Concept

**Purpose:** establish a unique identity for each person and control access to app functionality so that data is isolated per account

***

## API Endpoints

### POST /api/User/register

**Description:** Registers a new user account with a unique email, name, and password.

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

**Description:** Authenticates a user with their email and password, returning user details if successful.

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

**Description:** Sets a user's account status to INACTIVE, disabling their access.

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

**Description:** Reactivates an inactive user account and sets a new password.

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
