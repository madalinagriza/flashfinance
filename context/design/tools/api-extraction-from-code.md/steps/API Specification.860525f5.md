---
timestamp: 'Mon Oct 27 2025 21:52:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251027_215214.3f022557.md]]'
content_id: 860525f50b9dada2e1381cb3cf2a36fc31e7bb84b95c9bc727fe7370c522f4f7
---

# API Specification: Label Concept

**Purpose:** record the user's assignment of a specific transaction to a specific category so that spending meaning is explicit and auditable

***

## API Endpoints

### POST /api/Label/stage

**Description:** Creates a temporary, "staged" label for a transaction that can be finalized later.

**Requirements:**

* No committed label can already exist for the given `tx_id`.
* No other staged label can already exist for the given `tx_id`.

**Effects:**

* A new `StagedLabel` record is created for the user and transaction with the provided information.
* The transaction ID is returned.

**Request Body:**

```json
{
  "user_id": "ID",
  "tx_id": "ID",
  "tx_name": "String",
  "tx_merchant": "String",
  "category_id": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "label_tx_id": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Label/finalize

**Description:** Commits all of a user's staged labels, making them permanent.

**Requirements:**

* For each staged label belonging to the user, no committed label can already exist for its `tx_id`.

**Effects:**

* For each staged label: a permanent `Label` is created, `TransactionInfo` is stored, and `CategoryHistory` is updated.
* All of the user's staged labels are deleted after processing.

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

### POST /api/Label/cancel

**Description:** Deletes all of a user's staged labels without committing them.

**Requirements:**

* None. A user can cancel a pending session at any time.

**Effects:**

* All `StagedLabel` records for the specified `user_id` are deleted.
* No changes are made to permanent `Label` or `CategoryHistory` records.

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

### POST /api/Label/update

**Description:** Changes the category of an existing, committed label for a transaction.

**Requirements:**

* A committed label for the given `tx_id` must exist and belong to the `user_id`.
* The `new_category_id` must exist and belong to the `user_id`.

**Effects:**

* The label's `category_id` is replaced with `new_category_id`.
* The label's `created_at` timestamp is updated to the current time.
* The `CategoryHistory` is updated to reflect the change.
* The updated transaction ID is returned.

**Request Body:**

```json
{
  "user_id": "ID",
  "tx_id": "ID",
  "new_category_id": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "label_tx_id": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Label/remove

**Description:** Reassigns a transaction's label to the user's built-in "Trash" category.

**Requirements:**

* A committed label for the given `tx_id` must exist and belong to the `user_id`.

**Effects:**

* The transaction's label is updated to point to the built-in `TRASH_CATEGORY_ID`.
* The `CategoryHistory` is updated to reflect the move to the trash category.

**Request Body:**

```json
{
  "user_id": "ID",
  "tx_id": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "label_tx_id": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Label/suggest

**Description:** Uses an AI model to suggest a category for an unlabeled transaction based on user history.

**Requirements:**

* The user must have at least one category defined.

**Effects:**

* Returns a best-guess `category_id` and `name` from the user’s existing categories.
* This action does not alter any state.

**Request Body:**

```json
{
  "user_id": "ID",
  "allCategories": "[ [\"String\", \"ID\"] ]",
  "txInfo": {
    "tx_id": "ID",
    "tx_name": "String",
    "tx_merchant": "String"
  }
}
```

**Success Response Body (Action):**

```json
{
  "id": "ID",
  "name": "String"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Label/\_getCategoryHistory

**Description:** Retrieves all transaction IDs associated with a specific user and category.

**Requirements:**

* The user and category must exist.

**Effects:**

* Returns an array of objects, each containing a `tx_id` labeled with the specified category.

**Request Body:**

```json
{
  "user_id": "ID",
  "category_id": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "tx_id": "string"
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

### POST /api/Label/\_hasAnyLabelsForCategory

**Description:** Checks if a user has any transactions labeled with a specific category.

**Requirements:**

* The user and category must exist.

**Effects:**

* Returns an array with a single object containing a boolean indicating if any labels exist for the category.

**Request Body:**

```json
{
  "user_id": "ID",
  "category_id": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "result": "Boolean"
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
