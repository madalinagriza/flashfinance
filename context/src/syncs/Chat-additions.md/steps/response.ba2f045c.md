---
timestamp: 'Thu Nov 06 2025 09:04:52 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_090452.221101e2.md]]'
content_id: ba2f045c7f404a95d5d1c145b7a04de02a4e0b6ead99b24229332dab9661c1e9
---

# response:

Based on the provided synchronization files, here are all the API entry points defined for your application. Each entry point is triggered by a `Requesting.request` action and corresponds to a specific path.

### Authentication API (`auth.sync.ts`)

* **`/UserAuthentication/register`**: Handles new user registration.
* **`/login`**: Manages user login and creates a new session.
* **`/logout`**: Logs a user out by deleting their session.

### Category API (`category.sync.ts`)

* **`/Category/create`**: Creates a new category for a user.
* **`/Category/rename`**: Renames an existing category.
* **`/Category/delete`**: Deletes a category.
* **`/Category/updateTransaction`**: Changes the category assigned to a transaction.
* **`/Category/moveTransactionToTrash`**: Moves a specific transaction from its category to the trash.
* **`/Category/getCategoriesFromOwner`**: Retrieves all categories belonging to the logged-in user.
* **`/Category/getMetric`**: Fetches a calculated metric (e.g., total spending) for a category within a specified date range.

### File Uploading API (`files.sync.ts`)

* **`/FileUploading/requestUploadURL`**: Requests a presigned URL for a client to upload a file to storage.
* **`/FileUploading/confirmUpload`**: Confirms that a file has been successfully uploaded, making it available for processing.
* **`/FileUploading/myFiles`**: Lists all files owned by the currently authenticated user.

### Labeling API (`label.sync.ts`)

* **`/Label/stage`**: Stages a category label for a transaction before finalization.
* **`/Label/discardUnstagedToTrash`**: Discards an unlabeled transaction, moving it to the trash category.
* **`/Label/finalize`**: Finalizes all currently staged labels for the user, applying them in bulk.
* **`/Label/suggest`**: Suggests a category for a given transaction based on its details.
* **`/Label/cancelSession`**: Cancels the user's current labeling session, discarding any staged labels.
* **`/Label/removeCommittedLabel`**: Removes a previously finalized label from a transaction.
* **`/Label/getLabel`**: Retrieves the committed label for a specific transaction.

### Transaction API (`transaction.sync.ts`)

* **`/Transaction/importTransactions`**: Kicks off the process to import transactions from provided file content.
