---
timestamp: 'Thu Nov 06 2025 08:55:44 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_085544.6c65ae50.md]]'
content_id: 4d4412cf1f6c9ee3e0d4b94242790d682ef40f60b2928ac822b4f1284ca60bbd
---

# API Specification: FileUploading Concept

**Purpose:** manage user-uploaded files, including storage, retrieval, and deletion

***

## API Endpoints

### POST /api/FileUploading/uploadFile

**Description:** Creates a new file record with the provided content and metadata.

**Requirements:**

* `owner` exists
* `name` is a non-empty string

**Effects:**

* Creates a new File `f`.
* Sets its owner to `owner`, name to `name`, and content to `content`.
* Records the creation timestamp.
* Returns the new File ID as `file`.

**Request Body:**

```json
{
  "owner": "User",
  "name": "string",
  "content": "string"
}
```

**Success Response Body (Action):**

```json
{
  "file": "File"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FileUploading/deleteFile

**Description:** Deletes a specified file, provided the requester is the owner.

**Requirements:**

* File `file` exists
* `requester` is the owner of File `file`

**Effects:**

* Deletes the File `file` from the system.

**Request Body:**

```json
{
  "file": "File",
  "requester": "User"
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

### POST /api/FileUploading/\_getFile

**Description:** Retrieves the full details of a specific file.

**Requirements:**

* File `file` exists.

**Effects:**

* Returns the owner, name, content, and creation date of the specified file.

**Request Body:**

```json
{
  "file": "File"
}
```

**Success Response Body (Query):**

```json
[
  {
    "owner": "User",
    "name": "string",
    "content": "string",
    "createdAt": "Date"
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

### POST /api/FileUploading/\_getFilesByUser

**Description:** Lists metadata for all files owned by a specific user.

**Requirements:**

* User `owner` exists.

**Effects:**

* Returns a list of all files owned by `owner`, including each file's ID, name, and creation date.

**Request Body:**

```json
{
  "owner": "User"
}
```

**Success Response Body (Query):**

```json
[
  {
    "file": "File",
    "name": "string",
    "createdAt": "Date"
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
