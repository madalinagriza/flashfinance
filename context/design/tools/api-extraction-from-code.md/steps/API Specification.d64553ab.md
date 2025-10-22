---
timestamp: 'Tue Oct 21 2025 20:59:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_205936.f6b594f9.md]]'
content_id: d64553abe014add207385f26d2a98f2c36ce115928cf8e00cfb36e951d9e5bd2
---

# API Specification: Label Concept

**Purpose:** record the user's assignment of a specific transaction to a specific category so that spending meaning is explicit and auditable

***

## API Endpoints

### POST /api/Label/stage

**Description:** Creates a StagedLabel for the user and transaction with the provided info and category, adds it to the staged labels, and returns the transaction ID of the created staged label.

**Requirements:**

* no committed label exists for `tx_id`
* no stagedLabel with ID tx\_id.

**Effects:**

* creates a StagedLabel for this user and transaction with the provided info and category
* Adds it to the stagedLabels (that are not yet commited)
* Returns the created stagedLabel.

**Request Body:**

```json
{
  "user_id": "string",
  "tx_id": "string",
  "tx_name": "string",
  "tx_merchant": "string",
  "category_id": "string"
}
```

**Success Response Body (Action):**

```json
{
  "label_tx_id": "string"
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

**Description:** For each StagedLabel belonging to the user, creates a TransactionInfo, creates a new Label linking `tx_id` to `category_id` and `user_id`, adds TransactionInfo to CategoryHistory under the chosen category, and then wipes stagedLabels for the user.

**Requirements:**

* for each StagedLabel belonging to the user: no committed label exists for `tx_id`

**Effects:**

* for each StagedLabel belonging to the user
* creates a TransactionInfo
* creates a new Label linking `tx_id` to `category_id` and `user_id`
* adds TransactionInfo to CategoryHistory under the chosen category
* after processing all staged labels, wipes stagedLabels

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

### POST /api/Label/cancel

**Description:** Deletes all StagedLabels for that user without committing them.

**Requirements:**

* true (a user may cancel a pending session at any time)

**Effects:**

* deletes all StagedLabels for that user
* no modifications to Labels or CategoryHistory

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

### POST /api/Label/update

**Description:** Updates CategoryHistory, associating TransactionInfo with the new category, replaces the label’s `category_id` with `new_category_id`, updates `created_at` to now, and returns the updated label's transaction ID.

**Requirements:**

* a label for `tx_id` exists
* `transaction.owner_id = user_id`
* `new_category_id` exists and `owner_id = user_id`
* TransactionInfo exists with `transactionInfo.id = tx_id`

**Effects:**

* updates CategoryHistory, associating TransactionInfo with the new category
* replaces the label’s `category_id` with `new_category_id`
* updates `created_at` to now
* returns updated label

**Request Body:**

```json
{
  "user_id": "string",
  "tx_id": "string",
  "new_category_id": "string"
}
```

**Success Response Body (Action):**

```json
{
  "label_tx_id": "string"
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

**Description:** Reassigns the transaction’s label to the user’s built-in **Trash** category and updates CategoryHistory.

**Requirements:**

* a label for `tx_id` exists
* `transaction.owner_id = user_id`

**Effects:**

* reassigns the transaction’s label to the user’s built-in **Trash** category
* updates CategoryHistory, associating the transaction with the trash category

**Request Body:**

```json
{
  "user_id": "string",
  "tx_id": "string"
}
```

**Success Response Body (Action):**

```json
{
  "label_tx_id": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Label/\_getLabel

**Description:** Retrieves a specific label document for a given user and transaction ID.

**Requirements:**

* None.

**Effects:**

* Returns the label document or null if not found.

**Request Body:**

```json
{
  "user_id": "string",
  "tx_id": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "user_id": "string",
    "tx_id": "string",
    "category_id": "string",
    "created_at": "string (ISO 8601)"
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

### POST /api/Label/\_getTxInfo

**Description:** Retrieves transaction information for a given user and transaction ID.

**Requirements:**

* None.

**Effects:**

* Returns the transaction info document or null if not found.

**Request Body:**

```json
{
  "user_id": "string",
  "tx_id": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "tx_id": "string",
    "tx_name": "string",
    "tx_merchant": "string"
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

### POST /api/Label/\_getCategoryHistory

**Description:** Retrieves the transaction IDs associated with a specific category for a given user.

**Requirements:**

* None.

**Effects:**

* Returns a list of transaction IDs (strings).

**Request Body:**

```json
{
  "user_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Query):**

```json
[
  "string"
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Label/\_all

**Description:** Retrieves all label documents.

**Requirements:**

* None.

**Effects:**

* Returns a list of all label documents.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "user_id": "string",
    "tx_id": "string",
    "category_id": "string",
    "created_at": "string (ISO 8601)"
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

**Description:** Checks if a given category has any associated labels for a specific user.

**Requirements:**

* None.

**Effects:**

* Returns true if the category has any labels for the user, false otherwise.

**Request Body:**

```json
{
  "user_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "hasLabels": "boolean"
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
