---
timestamp: 'Tue Oct 28 2025 21:12:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251028_211259.af66c5de.md]]'
content_id: 35c9ff36f49e7a28cfd94ab40156031b780058ce3f2428c5cd91ba03d5511e4e
---

# API Specification: User Concept

**Purpose:** establish a unique identity for each person and control access to app functionality so that data is isolated per account

***

## API Endpoints

### POST /api/User/register

**Description:** Creates a new user account.

**Requirements:**

* email is not used by any existing user

**Effects:**

* creates a new user with a fresh user\_id, password\_hash derived from password, status ACTIVE; adds the user to Users; returns the created user

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
    "user_id": "ID",
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

**Description:** Authenticates a user and provides their user object upon success.

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
    "user_id": "ID",
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

**Description:** Deactivates a user's account, preventing future logins.

**Requirements:**

* a user with user\_id exists

**Effects:**

* sets the user's status to INACTIVE

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

**Description:** Changes the password for an existing user account.

**Requirements:**

* a user with user\_id exists and old\_password matches the stored password\_hash

**Effects:**

* updates password\_hash with new\_password; returns true

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

**Description:** Reactivates an inactive user account with a new password.

**Requirements:**

* a user with the given email exists and `status = INACTIVE`

**Effects:**

* sets the user’s `status` to ACTIVE; updates the user’s `password_hash` with the hash of `new_password`; returns true

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

**Description:** Retrieves a list of all users in the system.

**Requirements:**

* (None, typically requires admin privileges not specified in the concept).

**Effects:**

* Returns an array of all user objects.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "user_id": "ID",
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
