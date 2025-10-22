---
timestamp: 'Mon Oct 20 2025 17:49:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_174909.325c24a9.md]]'
content_id: 984f5f45c49a742bf518ab5448a4f01f997516d32788a5edb6ae16603e6bad37
---

# API Specification: Category Concept

**Purpose:** allow users to define and manage meaningful groupings of their transactions

***

## API Endpoints

### POST /api/Category/create

**Description:** Creates a new category for a given user with a specified name.

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

**Description:** Renames an existing category for a given user.

**Requirements:**

* category exists and category.owner\_id = owner\_id
* for the same owner\_id, no existing category with same new\_name

**Effects:**

* updates category.name to new\_name
* returns updated category

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

**Description:** Deletes a category and its associated metrics, provided it's safe to delete.

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

### POST /api/Category/setMetricTotal

**Description:** Creates or updates a category metric's total for a specific period.

**Requirements:**

* owner and category exist
* total ≥ 0

**Effects:**

* creates or updates the metric for (owner, category, period) with current\_total = total

**Request Body:**

```json
{
  "owner_id": "string",
  "category_id": "string",
  "period": "string (ISO Date__ISO Date)",
  "total": "number"
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

**Description:** Retrieves a list of all category names and their owners.

**Requirements:**

* true (implicitly)

**Effects:**

* returns list of all category names and their owners

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
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

### POST /api/Category/getMetric

**Description:** Retrieves a specific category metric document for a given owner, category, and period.

**Requirements:**

* true (implicitly)

**Effects:**

* Retrieves a specific CategoryMetric document.

**Request Body:**

```json
{
  "owner_id": "string",
  "category_id": "string",
  "period": "string (ISO Date__ISO Date)"
}
```

**Success Response Body (Query):**

```json
[
  {
    "owner_id": "string",
    "category_id": "string",
    "period_start": "string (ISO Date)",
    "period_end": "string (ISO Date)",
    "current_total": "number"
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

### POST /api/Category/listMetrics

**Description:** Lists all category metrics for a given owner and category, sorted by period start date.

**Requirements:**

* true (implicitly)

**Effects:**

* Lists all CategoryMetrics for a given owner and category, sorted by period\_start ascending.

**Request Body:**

```json
{
  "owner_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "owner_id": "string",
    "category_id": "string",
    "period_start": "string (ISO Date)",
    "period_end": "string (ISO Date)",
    "current_total": "number"
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
