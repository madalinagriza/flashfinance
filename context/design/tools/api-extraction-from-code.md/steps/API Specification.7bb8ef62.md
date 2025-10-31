---
timestamp: 'Tue Oct 28 2025 20:59:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251028_205932.95ca8de5.md]]'
content_id: 7bb8ef621560cc0607b799eb4f799d997e2d11f50f417d7e1ade163c5aaf143b
---

# API Specification: Category Concept

**Purpose:** allow users to define and manage meaningful groupings of their transactions

***

## API Endpoints

### POST /api/Category/create

**Description:** Creates a new, unique category for a user.

**Requirements:**

* The specified `owner_id` must exist.
* A category with the same `name` must not already exist for this `owner_id`.

**Effects:**

* A new unique `category_id` is generated.
* A new category record is created and stored, linking the `name` to the `owner_id`.
* The new `category_id` is returned.

**Request Body:**

```json
{
  "owner_id": "ID",
  "name": "string"
}
```

**Success Response Body (Action):**

```json
{
  "category_id": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Category/rename

**Description:** Changes the name of an existing category.

**Requirements:**

* The category specified by `category_id` must exist and belong to the `owner_id`.
* No other category belonging to the `owner_id` can have the `new_name`.

**Effects:**

* The name of the specified category is updated to `new_name`.
* The `category_id` of the updated category is returned.

**Request Body:**

```json
{
  "owner_id": "ID",
  "category_id": "ID",
  "new_name": "string"
}
```

**Success Response Body (Action):**

```json
{
  "category_id": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Category/delete

**Description:** Deletes a category and its associated transaction metrics.

**Requirements:**

* The category specified by `category_id` must exist and belong to the `owner_id`.
* `can_delete` must be `true`, indicating that no labels currently reference this category.

**Effects:**

* The specified category record is removed.
* All associated category metric data is removed.
* A success status is returned.

**Request Body:**

```json
{
  "owner_id": "ID",
  "category_id": "ID",
  "can_delete": "boolean"
}
```

**Success Response Body (Action):**

```json
{
  "ok": "boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Category/addTransaction

**Description:** Adds a transaction record to a category's metrics for tracking.

**Requirements:**

* The specified `owner_id` and `category_id` must exist.
* The `amount` must be a non-negative number.
* A transaction with the same `tx_id` must not already be recorded for this category.

**Effects:**

* The transaction details are added to the list of transactions for the specified owner and category.
* A success status is returned.

**Request Body:**

```json
{
  "owner_id": "ID",
  "category_id": "ID",
  "tx_id": "ID",
  "amount": "number",
  "tx_date": "string (ISO 8601)"
}
```

**Success Response Body (Action):**

```json
{
  "ok": "boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Category/removeTransaction

**Description:** Removes a specific transaction record from a category's metrics.

**Requirements:**

* The specified `owner_id` and `category_id` must exist.
* A transaction with the given `tx_id` must be recorded for this category.

**Effects:**

* The specified transaction record is removed from the category's metrics.
* A success status is returned.

**Request Body:**

```json
{
  "owner_id": "ID",
  "category_id": "ID",
  "tx_id": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "ok": "boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Category/getCategoryNamesAndOwners

**Description:** Retrieves a list of all categories, including their names and owner IDs.

**Requirements:**

* None.

**Effects:**

* Returns an array of objects, each containing a category's ID, name, and owner ID.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "category_id": "string",
    "name": "string",
    "owner_id": "string"
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

### POST /api/Category/listTransactions

**Description:** Lists all transaction entries recorded for a specific user and category.

**Requirements:**

* The specified `owner_id` and `category_id` must correspond to an existing metric document.

**Effects:**

* Returns an array of transaction records associated with the specified category. Returns an empty array if the category has no transactions.

**Request Body:**

```json
{
  "owner_id": "ID",
  "category_id": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "tx_id": "string",
    "amount": "number",
    "tx_date": "string (ISO 8601)"
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
