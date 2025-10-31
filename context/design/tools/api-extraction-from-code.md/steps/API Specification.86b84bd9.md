---
timestamp: 'Tue Oct 28 2025 21:12:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251028_211259.af66c5de.md]]'
content_id: 86b84bd91db42048806ddf56108d89e6ed64994e0c556ff5ebde5bbdcffd2c43
---

# API Specification: Category Concept

**Purpose:** allow users to define and manage meaningful groupings of their transactions

***

## API Endpoints

### POST /api/Category/create

**Description:** Creates a new transaction category for a user.

**Requirements:**

* user owner\_id exists; for the same owner\_id, no existing category with same name

**Effects:**

* generates a new category\_id; creates and stores a category under owner\_id associated with name; returns it

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

**Description:** Renames an existing transaction category.

**Requirements:**

* category exists and category.owner\_id = owner\_id; for the same owner\_id, no existing category with same new\_name

**Effects:**

* updates category.name to new\_name; returns updated category\_id

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

**Description:** Deletes a transaction category if it's not in use.

**Requirements:**

* category exists and category.owner\_id = owner\_id; can\_delete = true (derived from whether any labels reference this category)

**Effects:**

* removes the category and its associated metrics; returns true

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

**Description:** Records a transaction's details against a category for metric tracking.

**Requirements:**

* owner and category exist; amount ≥ 0; transaction with tx\_id is not already recorded for this category

**Effects:**

* adds the transaction record to the metric for (owner, category); returns true

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

**Description:** Removes a transaction's details from a category's metric tracking.

**Requirements:**

* owner and category exist; transaction with tx\_id is recorded for this category

**Effects:**

* removes the transaction record from the metric for (owner, category); returns true

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

### POST /api/Category/getCategoryNameById

**Description:** Retrieves the name of a single category by its ID.

**Requirements:**

* A category with the given `category_id` must exist for the specified `owner_id`.

**Effects:**

* Returns an array containing an object with the name of the specified category.

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
    "name": "string"
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

### POST /api/Category/getCategoriesFromOwner

**Description:** Retrieves all category IDs belonging to a specific owner.

**Requirements:**

* The `owner_id` must correspond to an existing user.

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

### POST /api/Category/getMetricStats

**Description:** Computes and returns spending statistics for a category over a given period.

**Requirements:**

* The `owner_id` and `category_id` must exist.
* The `period` must contain valid start and end dates.

**Effects:**

* Returns an object containing the total amount, transaction count, average spending per day, and total days in the period.

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

**Success Response Body (Action):**

```json
{
  "total_amount": "Number",
  "transaction_count": "Number",
  "average_per_day": "Number",
  "days": "Number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
