---
timestamp: 'Tue Oct 28 2025 21:12:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251028_211259.af66c5de.md]]'
content_id: 70a3928cc66c731858f244538aa165febf8afcb9980dd45c89a6a62daad63393
---

# API Specification: Label Concept

**Purpose:** record the user's assignment of a specific transaction to a specific category so that spending meaning is explicit and auditable

***

## API Endpoints

### POST /api/Label/stage

**Description:** Creates a temporary, uncommitted label for a transaction.

**Requirements:**

* no committed label exists for `tx_id`; no stagedLabel with ID tx\_id.

**Effects:**

* creates a StagedLabel for this user and transaction with the provided info and category. Adds it to the stagedLabels (that are not yet commited). Returns the created stagedLabel.

**Request Body:**

```json
{
  "user_id": "ID",
  "tx_id": "ID",
  "tx_name": "string",
  "tx_merchant": "string",
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

### POST /api/Label/discard

**Description:** Stages a transaction to be moved to the built-in Trash category.

**Requirements:**

* no committed label exists for `tx_id`; no stagedLabel with ID tx\_id.

**Effects:**

* creates a StagedLabel for this user and transaction, assigning it to the built-in **Trash** category.

**Request Body:**

```json
{
  "user_id": "ID",
  "tx_id": "ID",
  "tx_name": "string",
  "tx_merchant": "string"
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

**Description:** Commits all of a user's currently staged labels, making them permanent.

**Requirements:**

* for each StagedLabel belonging to the user: no committed label exists for `tx_id`

**Effects:**

* for each StagedLabel belonging to the user
  * creates a TransactionInfo
  * creates a new Label linking `tx_id` to `category_id` and `user_id`;
  * adds TransactionInfo to CategoryHistory under the chosen category;
  * after processing all staged labels, wipes stagedLabels

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

* true (a user may cancel a pending session at any time)

**Effects:**

* deletes all StagedLabels for that user;
* no modifications to Labels or CategoryHistory

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

**Description:** Changes the category of an already-labeled transaction.

**Requirements:**

* a label for `tx_id` exists; `transaction.owner_id = user_id`;
* `new_category_id` exists and `owner_id = user_id`;
* TransactionInfo exists with `transactionInfo.id = tx_id`

**Effects:**

* updates CategoryHistory, associating TransactionInfo with the new category;
* replaces the label’s `category_id` with `new_category_id`;
* updates `created_at` to now; returns updated label

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

**Description:** Moves a labeled transaction to the built-in Trash category.

**Requirements:**

* a label for `tx_id` exists; `transaction.owner_id = user_id`

**Effects:**

* reassigns the transaction’s label to the user’s built-in **Trash** category;
* updates CategoryHistory, associating the transaction with the trash category

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

**Description:** Provides an AI-powered suggestion for categorizing a transaction.

**Requirements:**

* user has ≥ 1 category

**Effects:**

* returns a best-guess category\_id from the user’s existing categories for this `tx_id`, highlighted in the UI;
* suggested by AI and does **not** alter Labels state

**Request Body:**

```json
{
  "user_id": "ID",
  "allCategories": "[[\"string\", \"ID\"]]",
  "txInfo": {
    "tx_id": "ID",
    "tx_name": "string",
    "tx_merchant": "string"
  }
}
```

**Success Response Body (Action):**

```json
{
  "id": "ID",
  "name": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Label/getLabel

**Description:** Retrieves a single committed label for a specific user and transaction.

**Requirements:**

* A committed label must exist for the given `user_id` and `tx_id`.

**Effects:**

* Returns an array containing the full label document if found.

**Request Body:**

```json
{
  "user_id": "ID",
  "tx_id": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "user_id": "ID",
    "tx_id": "ID",
    "category_id": "ID",
    "created_at": "Date"
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

### POST /api/Label/getCategoryHistory

**Description:** Retrieves the spending history (all transaction IDs) for a category.

**Requirements:**

* The `user_id` and `category_id` must exist.

**Effects:**

* Returns an array of objects, each containing a `tx_id` associated with the specified category.

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
    "tx_id": "ID"
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

### POST /api/Label/get\_category\_tx

**Description:** Retrieves all transaction IDs associated with a specific category for a user.

**Requirements:**

* The `user_id` and `category_id` must exist.

**Effects:**

* Returns an array of objects, each containing a `tx_id` associated with the specified category.

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
    "tx_id": "ID"
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

### POST /api/Label/get\_tx\_in\_trash

**Description:** Retrieves all transaction IDs that have been moved to the trash for a user.

**Requirements:**

* The `user_id` must exist.

**Effects:**

* Returns an array of objects, each containing a `tx_id` associated with the built-in Trash category.

**Request Body:**

```json
{
  "user_id": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "tx_id": "ID"
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

### POST /api/Label/getStagedLabels

**Description:** Retrieves all currently staged (uncommitted) labels for a user.

**Requirements:**

* The `user_id` must exist.

**Effects:**

* Returns an array containing all staged label documents for the user.

**Request Body:**

```json
{
  "user_id": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "user_id": "ID",
    "category_id": "ID",
    "tx_id": "ID",
    "tx_name": "string",
    "tx_merchant": "string",
    "staged_at": "Date"
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

### POST /api/Label/hasAnyLabelsForCategory

**Description:** Checks if a category is referenced by any of a user's labels.

**Requirements:**

* The `user_id` and `category_id` must exist.

**Effects:**

* Returns a boolean indicating if any transactions are labeled with the specified category.

**Request Body:**

```json
{
  "user_id": "ID",
  "category_id": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "result": "boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
