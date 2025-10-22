---
timestamp: 'Mon Oct 20 2025 17:49:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_174909.325c24a9.md]]'
content_id: 93924a4e2dff3cb27e74adf2199bd73e3c239130ceac555e5002e6cb1066d688
---

# API Specification: Label Concept

**Purpose:** record the user's assignment of a specific transaction to a specific category so that spending meaning is explicit and auditable

***

## API Endpoints

### POST /api/Label/stage

**Description:** Creates a StagedLabel for a user and transaction, preparing it for finalization.

**Requirements:**

* no committed label exists for `tx_id`
* no stagedLabel with ID tx\_id.

**Effects:**

* creates a StagedLabel for this user and transaction with the provided info and category.
* Adds it to the stagedLabels (that are not yet commited).
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

**Description:** Commits all staged labels for a user, turning them into permanent labels and history records.

**Requirements:**

* for each StagedLabel belonging to the user: no committed label exists for `tx_id`

**Effects:**

* for each StagedLabel belonging to the user:
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

**Description:** Deletes all staged labels for a user without committing them.

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

**Description:** Changes the category of an existing label for a specific transaction.

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

**Description:** Reassigns a transaction's label to the user's built-in Trash category.

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

### POST /api/Label/getLabel

**Description:** Returns the label document for the given user and transaction.

**Requirements:**

* true (implicitly)

**Effects:**

* Returns the label document for the given user and transaction.

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
    "_id": "string",
    "user_id": "string",
    "tx_id": "string",
    "category_id": "string",
    "created_at": "string (ISO Date)"
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

### POST /api/Label/getTxInfo

**Description:** Returns the transaction info document for the given user and transaction.

**Requirements:**

* true (implicitly)

**Effects:**

* Returns the transaction info document for the given user and transaction.

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
    "_id": "string",
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

### POST /api/Label/getCategoryHistory

**Description:** Returns a list of transaction IDs associated with a specific category for a user.

**Requirements:**

* true (implicitly)

**Effects:**

* Returns a list of transaction IDs associated with a specific category for a user.

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

### POST /api/Label/all

**Description:** Returns all label documents.

**Requirements:**

* true (implicitly)

**Effects:**

* Returns all label documents.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "user_id": "string",
    "tx_id": "string",
    "category_id": "string",
    "created_at": "string (ISO Date)"
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

**Description:** Returns true if any labels exist for the given user and category, false otherwise.

**Requirements:**

* true (implicitly)

**Effects:**

* Returns true if any labels exist for the given user and category, false otherwise.

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
    "has_labels": "boolean"
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
