---
timestamp: 'Wed Oct 22 2025 21:31:46 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251022_213146.451998af.md]]'
content_id: 43c92532aeb3a7d87874b0e338c1799efb7bb8bb011885ddfd231946935974d6
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

```
---
```
