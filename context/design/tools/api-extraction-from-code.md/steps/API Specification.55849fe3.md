---
timestamp: 'Tue Oct 21 2025 20:59:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_205936.f6b594f9.md]]'
content_id: 55849fe3d71a59207e6afd3085c5c1581b3d03b5fdc7906c2c5f7dd24a9c8676
---

# API Specification: Category Concept

**Purpose:** allow users to define and manage meaningful groupings of their transactions

***

## API Endpoints

### POST /api/Category/create

**Description:** Generates a new category ID, creates and stores a category under `owner_id` associated with `name`, and returns the created category's ID.

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

**Description:** Updates the category's name to `new_name` and returns the updated category's ID.

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

**Description:** Removes the category (and its CategoryMetrics) if `can_delete` is true, returning true; otherwise leaves state unchanged and returns false.

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

### POST /api/Category/set\_metric\_total

**Description:** Creates or updates the metric for a given owner, category, and period with the specified total.

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
  "period": {
    "startDate": "string (ISO 8601)",
    "endDate": "string (ISO 8601)"
  },
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

### POST /api/Category/\_getCategoryNamesAndOwners

**Description:** Retrieves all category IDs, names, and owner IDs across all categories.

**Requirements:**

* None.

**Effects:**

* Returns a list of all category IDs, names, and owner IDs.

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

### POST /api/Category/\_getCategoryNameById

**Description:** Returns the name of a category given its owner ID and category ID.

**Requirements:**

* owner\_id is required
* category is found for that owner

**Effects:**

* Returns the name of the specified category.

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

### POST /api/Category/\_getMetric

**Description:** Retrieves a specific category metric document for a given owner, category, and period.

**Requirements:**

* None.

**Effects:**

* Returns the document or null if not found.

**Request Body:**

```json
{
  "owner_id": "string",
  "category_id": "string",
  "period": {
    "startDate": "string (ISO 8601)",
    "endDate": "string (ISO 8601)"
  }
}
```

**Success Response Body (Query):**

```json
[
  {
    "owner_id": "string",
    "category_id": "string",
    "period_start": "string (ISO 8601)",
    "period_end": "string (ISO 8601)",
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

### POST /api/Category/\_listMetrics

**Description:** Lists all category metrics for a given owner and category, sorted by period start date ascending.

**Requirements:**

* None.

**Effects:**

* Returns all CategoryMetrics for a given owner and category, sorted by period\_start ascending.

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
    "period_start": "string (ISO 8601)",
    "period_end": "string (ISO 8601)",
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
