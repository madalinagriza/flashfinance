---
timestamp: 'Tue Oct 21 2025 20:40:27 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_204027.a009af03.md]]'
content_id: 8e484379b91fe4a1ab7a8542859ce281409ee3bd1d6d860a730fba691490e11d
---

# API Specification: Label Concept

**Purpose:** record the user's assignment of a specific transaction to a specific category so that spending meaning is explicit and auditable

***

## API Endpoints

### POST /api/Label/stage

**Description:** Stages a new label for a transaction for later finalization.

**Requirements:**

* no committed label exists for `tx_id`
* no stagedLabel with ID tx\_id.

**Effects:**

* creates a StagedLabel for this user and transaction with the provided info and category. Adds it to the stagedLabels (that are not yet commited). Returns the created stagedLabel.

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

**Description:** Commits all staged labels for a user, creating permanent labels and updating history.

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

**Description:** Updates the category of an existing label for a transaction.

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

**Description:** Reassigns a transaction's label to the built-in Trash category.

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
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
