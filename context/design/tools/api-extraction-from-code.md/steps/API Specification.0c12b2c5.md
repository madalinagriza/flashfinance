---
timestamp: 'Tue Oct 21 2025 20:59:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_205936.f6b594f9.md]]'
content_id: 0c12b2c5d6454408f939d4b83b65af9dabc6285ab08e1380189c4dd44ff8d862
---

# API Specification: User Concept

**Purpose:** establish a unique identity for each person and control access to app functionality so that data is isolated per account

***

## API Endpoints

### POST /api/User/register

**Description:** Creates a new user with a fresh user ID, password hash derived from the password, status ACTIVE, adds the user to Users, and returns the created user.

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
  "status": "string"
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

**Description:** Authenticates a user with the given email and password, returning the user if successful.

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
  "status": "string"
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

**Description:** Sets the user's status to INACTIVE.

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

**Description:** Updates the user's password hash with the `new_password` and returns true if successful.

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

**Description:** Sets the user’s `status` to ACTIVE, updates the user’s `password_hash` with the hash of `new_password`, and returns true if successful.

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

### POST /api/User/\_all

**Description:** Retrieves all user objects.

**Requirements:**

* None.

**Effects:**

* Returns a list of all user objects.

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
