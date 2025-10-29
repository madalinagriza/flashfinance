---
timestamp: 'Tue Oct 28 2025 20:59:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251028_205932.95ca8de5.md]]'
content_id: afc93f4fdbd0da6d98f91b26d7b1fc2b17843b92f2e8e2f34525e2cf3c03df4a
---

# API Specification: Label Concept

**Purpose:** record the user's assignment of a specific transaction to a specific category so that spending meaning is explicit and auditable

***

## API Endpoints

### POST /api/Label/stage

**Description:** Creates a temporary, "staged" label for a transaction before it is permanently saved.

**Requirements:**

* No committed label can exist for the given `tx_id` and `user_id`.
* No other staged label can exist for the given `tx_id` and `user_id`.

**Effects:**

* A new `StagedLabel` record is created for the user, associating the transaction info with the specified category.
* The `tx_id` is returned to confirm staging.

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

**Description:** Creates a staged label that assigns a transaction to the built-in "Trash" category.

**Requirements:**

* No committed label can exist for the given `tx_id` and `user_id`.
* No other staged label can exist for the given `tx_id` and `user_id`.

**Effects:**

* Creates a `StagedLabel` record for the user, associating the transaction with the built-in Trash category.
* The `tx_id` is returned to confirm staging for discard.

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

**Description:** Commits all staged labels for a user, making them permanent.

**Requirements:**

* For every staged label belonging to the user, no committed label can already exist for its `tx_id`.

**Effects:**

* For each staged label: a permanent `Label` is created, `TransactionInfo` is saved, and `CategoryHistory` is updated.
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

* None. This action can always be performed.

**Effects:**

* All `StagedLabel` records for the specified `user_id` are permanently deleted.
* No changes are made to committed labels or transaction history.

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

**Description:** Changes the category of an existing, committed label.

**Requirements:**

* A committed label for the `tx_id` must exist and belong to the `user_id`.
* The `new_category_id` must be a valid category that also belongs to the `user_id`.

**Effects:**

* The label's `category_id` is updated to `new_category_id`.
* The `created_at` timestamp of the label is updated to the current time.
* The transaction's entry in `CategoryHistory` is moved to the new category.
* The `tx_id` of the updated label is returned.

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

**Description:** Reassigns an existing transaction label to the user's built-in "Trash" category.

**Requirements:**

* A committed label for the `tx_id` must exist and belong to the `user_id`.

**Effects:**

* The label's `category_id` is updated to the Trash category ID.
* The transaction's entry in `CategoryHistory` is moved to the Trash category.
* The `tx_id` of the updated label is returned.

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
