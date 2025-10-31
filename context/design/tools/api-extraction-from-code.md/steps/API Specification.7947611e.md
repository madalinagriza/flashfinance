---
timestamp: 'Mon Oct 27 2025 21:52:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251027_215214.3f022557.md]]'
content_id: 7947611e2269df824cfab551902874a10a4df8f726493e0c83c80d1cb4e0b0ab
---

# API Specification: Category Concept

**Purpose:** allow users to define and manage meaningful groupings of their transactions

***

## API Endpoints

### POST /api/Category/create

**Description:** Creates a new, unique category for a user.

**Requirements:**

* The user specified by `owner_id` must exist.
* No category with the same `name` can already exist for this `owner_id`.

**Effects:**

* A new, unique `category_id` is generated.
* A new category record is created and stored, associated with the `owner_id` and `name`.
* The new `category_id` is returned.

**Request Body:**

```json
{
  "owner_id": "ID",
  "name": "String"
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

**Description:** Renames an existing category for a user.

**Requirements:**

* The category specified by `category_id` must exist and belong to the `owner_id`.
* No other category belonging to the `owner_id` can have the `new_name`.

**Effects:**

* The specified category's name is updated to `new_name`.
* The updated category's ID is returned.

**Request Body:**

```json
{
  "owner_id": "ID",
  "category_id": "ID",
  "new_name": "String"
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

**Description:** Deletes a category and its associated metrics, provided it is not in use.

**Requirements:**

* The category specified by `category_id` must exist and belong to the `owner_id`.
* The `can_delete` flag must be `true`, indicating no labels are currently referencing this category.

**Effects:**

* The specified category and all its associated metric data are permanently removed.
* Returns `true` upon successful deletion.

**Request Body:**

```json
{
  "owner_id": "ID",
  "category_id": "ID",
  "can_delete": "Boolean"
}
```

**Success Response Body (Action):**

```json
{
  "ok": "Boolean"
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

**Description:** Records a transaction's financial data against a specific category for metric tracking.

**Requirements:**

* The specified `owner_id` and `category_id` must exist.
* The transaction amount must be a non-negative number.
* The `tx_id` must not already be recorded for this category.

**Effects:**

* A new transaction entry is added to the category's metric data.
* The category metric's `updated_at` timestamp is set to the current time.

**Request Body:**

```json
{
  "owner_id": "ID",
  "category_id": "ID",
  "tx_id": "ID",
  "amount": "Number",
  "tx_date": "Date"
}
```

**Success Response Body (Action):**

```json
{
  "ok": "Boolean"
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

**Description:** Removes a transaction's financial data from a category's metric tracking.

**Requirements:**

* The metric bucket for the `owner_id` and `category_id` must exist.
* The `tx_id` must be present in the category's metric data.

**Effects:**

* The specified transaction entry is removed from the category's metric data.
* The category metric's `updated_at` timestamp is set to the current time.

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
  "ok": "Boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Category/\_getCategoryNamesAndOwners

**Description:** Retrieves a list of all categories with their names and owner IDs.

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

### POST /api/Category/\_getCategoriesFromOwner

**Description:** Retrieves all category IDs belonging to a specific user.

**Requirements:**

* The user specified by `owner_id` must exist.

**Effects:**

* Returns an array of objects, each containing a `category_id` owned by the user.

**Request Body:**

```json
{
  "owner_id": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "category_id": "ID"
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

### POST /api/Category/\_listTransactions

**Description:** Retrieves all transaction entries recorded for a specific user and category.

**Requirements:**

* The user and category must exist.

**Effects:**

* Returns an array of transaction metric entries associated with the user and category.

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
    "amount": "Number",
    "tx_date": "Date"
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

### POST /api/Category/\_getMetricStats

**Description:** Computes spending statistics for a category within a given time period.

**Requirements:**

* The user and category must exist.
* The `period` must be a valid time range.

**Effects:**

* Returns an array with a single object containing the total amount, transaction count, average spending per day, and number of days for the period.

**Request Body:**

```json
{
  "owner_id": "ID",
  "category_id": "ID",
  "period": {
    "startDate": "Date",
    "endDate": "Date"
  }
}
```

**Success Response Body (Query):**

```json
[
  {
    "total_amount": "Number",
    "transaction_count": "Number",
    "average_per_day": "Number",
    "days": "Number"
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
