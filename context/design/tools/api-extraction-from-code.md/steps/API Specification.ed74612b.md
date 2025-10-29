---
timestamp: 'Mon Oct 27 2025 20:59:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251027_205959.9156f583.md]]'
content_id: ed74612b28b255a2f3d230043e9958bba6a34aba1a97148fbc1adc72e96b27b7
---

# API Specification: User Concept

**Purpose:** establish a unique identity for each person and control access to app functionality so that data is isolated per account

***

## API Endpoints

### POST /api/User/register

**Description:** Registers a new user with the provided email, name, and password.

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

### POST /api/User/all

**Description:** Retrieves a list of all users in the system.

**Requirements:**

* none

**Effects:**

* returns an array of all user objects

**Request Body:**

```json
{}
```

**Success Response Body (Action):**

```json
{
  "users": [
    {
      "user_id": "string",
      "email": "string",
      "name": "string",
      "status": "ACTIVE"
    }
  ]
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

**Description:** Sets a user's status to INACTIVE.

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
  "ok": true
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
  "ok": true
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
