---
timestamp: 'Thu Nov 06 2025 08:53:44 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_085344.63318da3.md]]'
content_id: 6f7a5890988b34db5dc9e216a0db5672c20f659cc9949a765a10ef08e63e2485
---

# API Specification: FileUploading Concept

**Purpose:** To allow users to upload files and associate metadata with them for later retrieval.

***

## API Endpoints

### POST /api/FileUploading/uploadFile

**Description:** Creates a new file record with associated metadata and content.

**Requirements:**

* The `fileName` must not be an empty string.
* The `size` must be a positive number.
* The `owner` must be a valid User.

**Effects:**

* A new `File` entity is created in the system.
* The new file's metadata (`owner`, `fileName`, `contentType`, `size`, `uploadDate`) is stored.
* A reference to the file's content is stored.
* The ID of the newly created `File` is returned.

**Request Body:**

```json
{
  "owner": "User",
  "fileName": "string",
  "contentType": "string",
  "size": "number",
  "content": "FileContent"
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

**Description:** Permanently removes a file and its content from the system.

**Requirements:**

* The `file` must exist.
* The user performing the action must be the `owner` of the `file`.

**Effects:**

* The specified `File` record and its associated metadata are deleted.
* The stored content for the file is deleted.

**Request Body:**

```json
{
  "owner": "User",
  "file": "File"
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

### POST /api/FileUploading/updateFileName

**Description:** Updates the name of an existing file.

**Requirements:**

* The `file` must exist.
* The user performing the action must be the `owner` of the `file`.
* The `newName` must not be an empty string.
* No other file owned by the same user can have the same `newName`.

**Effects:**

* The `fileName` property of the specified `file` is updated to `newName`.
* The ID of the updated `File` is returned.

**Request Body:**

```json
{
  "owner": "User",
  "file": "File",
  "newName": "string"
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

### POST /api/FileUploading/\_getFilesForUser

**Description:** Retrieves a list of all files and their metadata for a given user.

**Requirements:**

* The `owner` user must exist.

**Effects:**

* Returns a list containing metadata for every file associated with the specified `owner`.

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
    "fileName": "string",
    "contentType": "string",
    "size": "number",
    "uploadDate": "Date"
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

### POST /api/FileUploading/\_getFileDetails

**Description:** Retrieves the detailed metadata for a single specified file.

**Requirements:**

* The `file` must exist.

**Effects:**

* Returns a list containing the detailed metadata for the single specified `file`.

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
    "file": "File",
    "owner": "User",
    "fileName": "string",
    "contentType": "string",
    "size": "number",
    "uploadDate": "Date"
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
