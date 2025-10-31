---
timestamp: 'Mon Oct 27 2025 20:59:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251027_205959.9156f583.md]]'
content_id: 3070bfdbb6fa0c3f67e1737ff97123e8cc0ad98535b236869103d3cf9d2d3d57
---

# API Specification: Category Concept

**Purpose:** allow users to define and manage meaningful groupings of their transactions

***

## API Endpoints

### POST /api/Category/create

**Description:** Creates a new category for a given owner with a specified name.

**Requirements:**

* user owner\_id exists
* for the same owner\_id, no existing category with same name

**Effects:**

* generated a new category\_id
* creates and stores a category under owner\_id associated with name
* returns it

**Request Body:**

```json
{
  "owner_id": "string",
  "name": "string"
}
```

**Success Response Body (Action):**

```json
{
  "category_id": "string"
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

**Description:** Renames an existing category for a given owner.

**Requirements:**

* category exists and category.owner\_id = owner\_id
* for the same owner\_id, no existing category with same new\_name

**Effects:**

* updates category.name to new\_name
* returns updated category\_id

**Request Body:**

```json
{
  "owner_id": "string",
  "category_id": "string",
  "new_name": "string"
}
```

**Success Response Body (Action):**

```json
{
  "category_id": "string"
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

**Description:** Deletes a category and its associated metrics for a given owner.

**Requirements:**

* category exists and category.owner\_id = owner\_id
* can\_delete = true (only called by the sync which gets result from label's)

**Effects:**

* removes the category (and its CategoryMetrics) and returns true
* otherwise leaves state unchanged and returns false

**Request Body:**

```json
{
  "owner_id": "string",
  "category_id": "string",
  "can_delete": true
}
```

**Success Response Body (Action):**

```json
{
  "ok": true
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

**Description:** Retrieves a list of all category IDs, names, and their owners.

**Requirements:**

* none (implicitly, categories must exist)

**Effects:**

* returns an array of objects, each containing category\_id, name, and owner\_id

**Request Body:**

```json
{}
```

**Success Response Body (Action):**

```json
{
  "categories": [
    {
      "category_id": "string",
      "name": "string",
      "owner_id": "string"
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

### POST /api/Category/getCategoryNameById

**Description:** Retrieves the name of a specific category for a given owner and category ID.

**Requirements:**

* category exists for the specified owner\_id and category\_id

**Effects:**

* returns the name of the category

**Request Body:**

```json
{
  "owner_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Action):**

```json
{
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

### POST /api/Category/addTransaction

**Description:** Adds a transaction record to a category's metric bucket.

**Requirements:**

* owner and category exist
* total ≥ 0 (impl checks amount >= 0)

**Effects:**

* creates or updates the metric for (owner, category) with the transaction details

**Request Body:**

```json
{
  "owner_id": "string",
  "category_id": "string",
  "tx_id": "string",
  "amount": 100.00,
  "tx_date": "YYYY-MM-DDTHH:MM:SS.sssZ"
}
```

**Success Response Body (Action):**

```json
{
  "ok": true
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

**Description:** Removes a transaction record from a category's metric bucket.

**Requirements:**

* metric bucket exists for the owner and category
* transaction with tx\_id exists within the metric bucket

**Effects:**

* removes the specified transaction entry from the category's metric
* returns true if successful

**Request Body:**

```json
{
  "owner_id": "string",
  "category_id": "string",
  "tx_id": "string"
}
```

**Success Response Body (Action):**

```json
{
  "ok": true
}
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

* none (returns empty array if metric bucket or transactions not found)

**Effects:**

* returns an array of transaction records (tx\_id, amount, tx\_date)

**Request Body:**

```json
{
  "owner_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Action):**

```json
{
  "transactions": [
    {
      "tx_id": "string",
      "amount": 100.00,
      "tx_date": "YYYY-MM-DDTHH:MM:SS.sssZ"
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

### POST /api/Category/getMetricStats

**Description:** Computes total amount, transaction count, average per day, and days for transactions within a specified period for a category.

**Requirements:**

* none (returns zeros if no relevant transactions)

**Effects:**

* returns an object containing total\_amount, transaction\_count, average\_per\_day, and days

**Request Body:**

```json
{
  "owner_id": "string",
  "category_id": "string",
  "period": "YYYY-MM-DDTHH:MM:SS.sssZ__YYYY-MM-DDTHH:MM:SS.sssZ"
}
```

**Success Response Body (Action):**

```json
{
  "total_amount": 100.00,
  "transaction_count": 5,
  "average_per_day": 10.00,
  "days": 10
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Category/deleteMetricsForCategory

**Description:** Deletes all category metrics associated with a specific category for an owner.

**Requirements:**

* none (will attempt to delete even if no metrics exist)

**Effects:**

* removes all CategoryMetrics documents for the specified owner and category
* returns the number of deleted metrics

**Request Body:**

```json
{
  "owner_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Action):**

```json
{
  "deleted_count": 0
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
