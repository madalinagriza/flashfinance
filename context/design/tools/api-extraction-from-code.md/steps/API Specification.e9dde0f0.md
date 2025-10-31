---
timestamp: 'Mon Oct 27 2025 20:59:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251027_205959.9156f583.md]]'
content_id: e9dde0f06991c2d0c0c96f46d5a6daa85ef441f6699c96e003ab8a70a332e6fe
---

# API Specification: Label Concept

**Purpose:** record the user's assignment of a specific transaction to a specific category so that spending meaning is explicit and auditable

***

## API Endpoints

### POST /api/Label/stage

**Description:** Stages a label for a transaction, associating it with a category, without committing it immediately.

**Requirements:**

* no committed label exists for `tx_id`
* no stagedLabel with ID tx\_id.

**Effects:**

* creates a StagedLabel for this user and transaction with the provided info and category
* adds it to the stagedLabels (that are not yet commited)
* returns the created stagedLabel.

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

### POST /api/Label/discard

**Description:** Stages a label that assigns the transaction to the built-in Trash category.

**Requirements:**

* (delegates to `stage` action, same requirements apply)

**Effects:**

* creates a StagedLabel for this user and transaction with the provided info, assigned to the `TRASH_CATEGORY_ID`
* adds it to the stagedLabels
* returns the created stagedLabel.

**Request Body:**

```json
{
  "user_id": "string",
  "tx_id": "string",
  "tx_name": "string",
  "tx_merchant": "string"
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

**Description:** Commits all staged labels for a user, moving them from staged to active labels.

**Requirements:**

* for each StagedLabel belonging to the user: no committed label exists for `tx_id`

**Effects:**

* for each StagedLabel belonging to the user:
  * creates a TransactionInfo
  * creates a new Label linking `tx_id` to `category_id` and `user_id`
  * adds TransactionInfo to CategoryHistory under the chosen category
* after processing all staged labels, wipes stagedLabels for the user

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

**Description:** Cancels all staged labels for a user, deleting them without committing.

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

**Description:** Changes the category for an existing label.

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

**Description:** Reassigns the label for a transaction to the user’s built-in **Trash** category.

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

**Description:** Retrieves a specific label by user ID and transaction ID.

**Requirements:**

* none (returns null if label not found)

**Effects:**

* returns the label document if found, otherwise null

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
  "label": {
    "_id": "string",
    "user_id": "string",
    "tx_id": "string",
    "category_id": "string",
    "created_at": "YYYY-MM-DDTHH:MM:SS.sssZ"
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

### POST /api/Label/getTxInfo

**Description:** Retrieves transaction information by user ID and transaction ID.

**Requirements:**

* none (returns null if transaction info not found)

**Effects:**

* returns the transaction info document if found, otherwise null

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
  "tx_info": {
    "_id": "string",
    "tx_name": "string",
    "tx_merchant": "string"
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

### POST /api/Label/getCategoryHistory

**Description:** Retrieves a list of transaction IDs associated with a specific category for a user.

**Requirements:**

* none (returns empty array if no history found)

**Effects:**

* returns a list of `tx_id` strings

**Request Body:**

```json
{
  "user_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Action):**

```json
{
  "tx_ids": [
    "string"
  ]
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Label/get\_category\_tx

**Description:** Returns all transaction IDs for a user within a specific category (backwards-compatible helper).

**Requirements:**

* none (returns empty array if no transactions found)

**Effects:**

* returns a list of `tx_id` strings

**Request Body:**

```json
{
  "user_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Action):**

```json
{
  "tx_ids": [
    "string"
  ]
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Label/get\_tx\_in\_trash

**Description:** Returns all transaction IDs currently assigned to the Trash category for a given user.

**Requirements:**

* none (returns empty array if no transactions in trash)

**Effects:**

* returns a list of `tx_id` strings

**Request Body:**

```json
{
  "user_id": "string"
}
```

**Success Response Body (Action):**

```json
{
  "tx_ids": [
    "string"
  ]
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Label/all

**Description:** Retrieves all labels in the system.

**Requirements:**

* none

**Effects:**

* returns an array of all label documents

**Request Body:**

```json
{}
```

**Success Response Body (Action):**

```json
{
  "labels": [
    {
      "_id": "string",
      "user_id": "string",
      "tx_id": "string",
      "category_id": "string",
      "created_at": "YYYY-MM-DDTHH:MM:SS.sssZ"
    }
  ]
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Label/getStagedLabels

**Description:** Returns all staged (not-yet-committed) labels for a given user.

**Requirements:**

* none (returns empty array if no staged labels)

**Effects:**

* returns an array of staged label documents

**Request Body:**

```json
{
  "user_id": "string"
}
```

**Success Response Body (Action):**

```json
{
  "staged_labels": [
    {
      "_id": "string",
      "user_id": "string",
      "category_id": "string",
      "tx_id": "string",
      "tx_name": "string",
      "tx_merchant": "string",
      "staged_at": "YYYY-MM-DDTHH:MM:SS.sssZ"
    }
  ]
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Label/hasAnyLabelsForCategory

**Description:** Checks if a user has any labels assigned to a specific category.

**Requirements:**

* none

**Effects:**

* returns a boolean indicating whether any labels exist

**Request Body:**

```json
{
  "user_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Action):**

```json
{
  "has_labels": true
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

**Description:** Returns a best-guess category ID for a transaction based on AI suggestions.

**Requirements:**

* user has ≥ 1 category

**Effects:**

* returns a best-guess category\_id from the user’s existing categories for this `tx_id`, highlighted in the UI
* suggested by AI and does **not** alter Labels state

**Request Body:**

```json
{
  "user_id": "string",
  "allCategories": [
    [
      "string",
      "string"
    ]
  ],
  "txInfo": {
    "tx_id": "string",
    "tx_name": "string",
    "tx_merchant": "string"
  }
}
```

**Success Response Body (Action):**

```json
{
  "id": "string",
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
