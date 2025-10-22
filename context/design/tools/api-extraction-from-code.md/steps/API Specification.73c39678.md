---
timestamp: 'Tue Oct 21 2025 20:40:27 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_204027.a009af03.md]]'
content_id: 73c39678160329e76090fa0d314fbbe7e41028afc482fed1302ca6171deb49ec
---

# API Specification: Category Concept

**Purpose:** allow users to define and manage meaningful groupings of their transactions

***

## API Endpoints

### POST /api/Category/create

**Description:** Creates a new category for a user with a specified name.

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

**Description:** Renames an existing category for a user.

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

**Description:** Deletes an existing category and its associated metrics, if allowed.

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

**Description:** Sets or updates the total for a category metric for a given period.

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
    "startDate": "string (ISO Date)",
    "endDate": "string (ISO Date)"
  },
  "total": "number"
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
