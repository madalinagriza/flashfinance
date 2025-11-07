[@api-extraction-from-spec](api-extraction-from-spec.md)

# Extracting from code

The following is an explanation of how concepts are implemented, for the purposes of understanding how to extract an API.

[@implementing-concepts](../background/implementing-concepts.md)


[@CategoryConcept.ts](../../src/concepts/Category/CategoryConcept.ts)



# prompt: 

Now, analyze the following Concept Implementation and generate the API documentation based on these instructions. 

# response:


# response:


# response:


# response:

# API Specification: Category Concept

**Purpose:** Organize transactions into user-defined categories and track associated financial metrics.

---

## API Endpoints

### POST /api/Category/create

**Description:** Creates a new category for a given owner with a specified name.

**Requirements:**
- No category with the given `name` already exists for the `owner_id`.

**Effects:**
- A new category is created.
- The new category has a unique `category_id`.
- The category is associated with `owner_id` and `name`.
- Returns the generated `category_id`.

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

---

### POST /api/Category/rename

**Description:** Renames an existing category owned by a specific user.

**Requirements:**
- The category identified by `category_id` exists for the given `owner_id`.
- No other category for the same `owner_id` has `new_name`.

**Effects:**
- The name of the specified category is updated to `new_name`.
- Returns the `category_id` of the renamed category.

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

---

### POST /api/Category/getCategoryNamesAndOwners

**Description:** Retrieves a list of all category IDs, names, and their owners across the system.

**Requirements:**
- true

**Effects:**
- Returns a list of objects, each containing `category_id`, `name`, and `owner_id`.

**Request Body:**
```json
{}
```

**Success Response Body (Action):**
```json
{
  "items": [
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

---

### POST /api/Category/getCategoryNameById

**Description:** Return the category name for a given owner_id and category_id.

**Requirements:**
- Category exists for the given owner.

**Effects:**
- Returns the name of the category.

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

---

### POST /api/Category/getCategoriesFromOwner

**Description:** Retrieves all categories (ID and name) for a specified owner.

**Requirements:**
- true

**Effects:**
- Returns a list of objects, each containing `category_id` and `name` for the specified owner.

**Request Body:**
```json
{
  "owner_id": "string"
}
```

**Success Response Body (Action):**
```json
{
  "items": [
    {
      "category_id": "string",
      "name": "string"
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

---

### POST /api/Category/addTransaction

**Description:** Adds a transaction entry to a specified category's metrics for an owner.

**Requirements:**
- Transaction amount must be a nonnegative finite number.
- Transaction date is required and valid.
- The category must exist for the owner.
- The `tx_id` must not already be recorded for that category.

**Effects:**
- A new transaction entry is added to the category's metrics.
- The `updated_at` timestamp for the metric document is updated.
- Returns `{ok: true}` on success.

**Request Body:**
```json
{
  "owner_id": "string",
  "category_id": "string",
  "tx_id": "string",
  "amount": "number",
  "tx_date": "string (ISO Date)"
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

---

### POST /api/Category/bulk_add_transaction

**Description:** Adds multiple transaction metrics to their respective categories in a bulk operation.

**Requirements:**
- Each individual transaction entry must meet the requirements of `addTransaction`.

**Effects:**
- Multiple transaction entries are added to their respective categories.
- Returns an empty object `{}` on success.

**Request Body:**
```json
{
  "owner_id": "string",
  "transactions": [
    {
      "category_id": "string",
      "tx_id": "string",
      "amount": "number",
      "tx_date": "string (ISO Date)"
    }
  ]
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

---

### POST /api/Category/removeTransaction

**Description:** Removes a specific transaction entry from a category's metrics for an owner.

**Requirements:**
- The metric bucket for the category must exist.
- The transaction `tx_id` must be recorded for the specified category.

**Effects:**
- The specified transaction entry is removed from the category's metrics.
- The `updated_at` timestamp for the metric document is updated.
- Returns `{ok: true}` on success.

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
  "ok": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Category/updateTransaction

**Description:** Moves a transaction from one category to another for a given owner.

**Requirements:**
- The transaction must exist in the `old_category_id`.
- The `new_category_id` must exist.

**Effects:**
- The transaction is removed from the `old_category_id`'s metrics.
- The transaction is added to the `new_category_id`'s metrics.
- Returns `{ok: true}` on success.

**Request Body:**
```json
{
  "owner_id": "string",
  "tx_id": "string",
  "old_category_id": "string",
  "new_category_id": "string"
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

---

### POST /api/Category/moveTransactionToTrash

**Description:** Moves a specific transaction from its current category to a special "Trash" category for an owner.

**Requirements:**
- The transaction must exist in the `from_category_id`.

**Effects:**
- The transaction is removed from `from_category_id`.
- The transaction is added to the `TRASH_CATEGORY_ID` (created if it doesn't exist).
- Returns `{ok: true}` on success.

**Request Body:**
```json
{
  "owner_id": "string",
  "from_category_id": "string",
  "tx_id": "string"
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

---

### POST /api/Category/listTransactions

**Description:** Retrieves all transaction entries for a specific category and owner.

**Requirements:**
- true

**Effects:**
- Returns a list of all transactions within the specified category, or an empty list if none exist.

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
  "items": [
    {
      "tx_id": "string",
      "amount": "number",
      "tx_date": "string (ISO Date)"
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

---

### POST /api/Category/getMetricStats

**Description:** Computes aggregate statistics for transactions within a specified category and time period for an owner.

**Requirements:**
- A valid `period` (start and end date) must be provided.

**Effects:**
- Returns an object containing `total_amount`, `transaction_count`, `average_per_day`, and `days` for the relevant transactions.

**Request Body:**
```json
{
  "owner_id": "string",
  "category_id": "string",
  "period": {
    "startDate": "string (ISO Date)",
    "endDate": "string (ISO Date)"
  }
}
```

**Success Response Body (Action):**
```json
{
  "total_amount": "number",
  "transaction_count": "number",
  "average_per_day": "number",
  "days": "number"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Category/getMetric

**Description:** Retrieves a specific `CategoryMetric` document for a given owner, category, and period.

**Requirements:**
- true

**Effects:**
- Returns an array containing the `CategoryMetricDoc` if found, or an empty array.

**Request Body:**
```json
{
  "owner_id": "string",
  "category_id": "string",
  "period": {
    "startDate": "string (ISO Date)",
    "endDate": "string (ISO Date)"
  }
}
```

**Success Response Body (Action):**
```json
{
  "items": [
    {
      "_id": "string",
      "owner_id": "string",
      "category_id": "string",
      "transactions": [
        {
          "tx_id": "string",
          "amount": "number",
          "tx_date": "string (ISO Date)"
        }
      ],
      "updated_at": "string (ISO Date)"
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

---

### POST /api/Category/listMetrics

**Description:** Lists all `CategoryMetrics` for a given owner and category, sorted by period.

**Requirements:**
- true

**Effects:**
- Returns an array of `CategoryMetricDoc` objects for the specified owner and category.

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
  "items": [
    {
      "_id": "string",
      "owner_id": "string",
      "category_id": "string",
      "transactions": [
        {
          "tx_id": "string",
          "amount": "number",
          "tx_date": "string (ISO Date)"
        }
      ],
      "updated_at": "string (ISO Date)"
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

---

### POST /api/Category/deleteMetricsForCategory

**Description:** Deletes all category metrics associated with a specific category for an owner.

**Requirements:**
- true

**Effects:**
- Returns the number of metric documents deleted.

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
  "deleted_count": "number"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Category/delete

**Description:** Deletes a category for a given owner, along with its associated metrics.

**Requirements:**
- The category identified by `category_id` exists for the given `owner_id`.
- The category must not contain any transactions.

**Effects:**
- The category document is removed.
- All associated category metrics are removed.
- Returns `{ok: true}` on success.

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
  "ok": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```