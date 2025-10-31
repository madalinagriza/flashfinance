[@api-extraction-from-spec](api-extraction-from-spec.md)

# API Specification: Category Concept

**Purpose:** allow users to define and manage meaningful groupings of their transactions

---

## API Endpoints

### POST /api/Category/create

**Description:** Generates a new category ID, creates and stores a category under `owner_id` associated with `name`, and returns the created category's ID.

**Requirements:**
- user owner\_id exists
- for the same owner\_id, no existing category with same name

**Effects:**
- generated a new category\_id
- creates and stores a category under owner\_id associated with name
- returns it

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

**Description:** Updates the category's name to `new_name` and returns the updated category's ID.

**Requirements:**
- category exists and category.owner\_id = owner\_id
- for the same owner\_id, no existing category with same new\_name

**Effects:**
- updates category.name to new\_name
- returns updated category

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

### POST /api/Category/delete

**Description:** Removes the category (and its CategoryMetrics) if `can_delete` is true, returning true; otherwise leaves state unchanged and returns false.

**Requirements:**
- category exists and category.owner\_id = owner\_id
- can\_delete = true (only called by the sync which gets result from label's)

**Effects:**
- removes the category (and its CategoryMetrics) and returns true
- otherwise leaves state unchanged and returns false

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
---

### POST /api/Category/set_metric_total

**Description:** Creates or updates the metric for a given owner, category, and period with the specified total.

**Requirements:**
- owner and category exist
- total ≥ 0

**Effects:**
- creates or updates the metric for (owner, category, period) with current\_total = total

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
---

### POST /api/Category/_getCategoryNamesAndOwners

**Description:** Retrieves all category IDs, names, and owner IDs across all categories.

**Requirements:**
- None.

**Effects:**
- Returns a list of all category IDs, names, and owner IDs.

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
---

### POST /api/Category/_getCategoryNameById

**Description:** Returns the name of a category given its owner ID and category ID.

**Requirements:**
- owner_id is required
- category is found for that owner

**Effects:**
- Returns the name of the specified category.

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
---

### POST /api/Category/_getMetric

**Description:** Retrieves a specific category metric document for a given owner, category, and period.

**Requirements:**
- None.

**Effects:**
- Returns the document or null if not found.

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
---

### POST /api/Category/_listMetrics

**Description:** Lists all category metrics for a given owner and category, sorted by period start date ascending.

**Requirements:**
- None.

**Effects:**
- Returns all CategoryMetrics for a given owner and category, sorted by period\_start ascending.

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
---

# API Specification: Label Concept

**Purpose:** record the user's assignment of a specific transaction to a specific category so that spending meaning is explicit and auditable

---

## API Endpoints

### POST /api/Label/stage

**Description:** Creates a StagedLabel for the user and transaction with the provided info and category, adds it to the staged labels, and returns the transaction ID of the created staged label.

**Requirements:**
- no committed label exists for `tx_id`
- no stagedLabel with ID tx\_id.

**Effects:**
- creates a StagedLabel for this user and transaction with the provided info and category
- Adds it to the stagedLabels (that are not yet commited)
- Returns the created stagedLabel.

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
---

### POST /api/Label/finalize

**Description:** For each StagedLabel belonging to the user, creates a TransactionInfo, creates a new Label linking `tx_id` to `category_id` and `user_id`, adds TransactionInfo to CategoryHistory under the chosen category, and then wipes stagedLabels for the user.

**Requirements:**
- for each StagedLabel belonging to the user: no committed label exists for `tx_id`

**Effects:**
- for each StagedLabel belonging to the user
- creates a TransactionInfo
- creates a new Label linking `tx_id` to `category_id` and `user_id`
- adds TransactionInfo to CategoryHistory under the chosen category
- after processing all staged labels, wipes stagedLabels

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
---

### POST /api/Label/cancel

**Description:** Deletes all StagedLabels for that user without committing them.

**Requirements:**
- true (a user may cancel a pending session at any time)

**Effects:**
- deletes all StagedLabels for that user
- no modifications to Labels or CategoryHistory

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
---

### POST /api/Label/update

**Description:** Updates CategoryHistory, associating TransactionInfo with the new category, replaces the label’s `category_id` with `new_category_id`, updates `created_at` to now, and returns the updated label's transaction ID.

**Requirements:**
- a label for `tx_id` exists
- `transaction.owner_id = user_id`
- `new_category_id` exists and `owner_id = user_id`
- TransactionInfo exists with `transactionInfo.id = tx_id`

**Effects:**
- updates CategoryHistory, associating TransactionInfo with the new category
- replaces the label’s `category_id` with `new_category_id`
- updates `created_at` to now
- returns updated label

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
---

### POST /api/Label/remove

**Description:** Reassigns the transaction’s label to the user’s built-in **Trash** category and updates CategoryHistory.

**Requirements:**
- a label for `tx_id` exists
- `transaction.owner_id = user_id`

**Effects:**
- reassigns the transaction’s label to the user’s built-in **Trash** category
- updates CategoryHistory, associating the transaction with the trash category

**Request Body:**
```json
{
  "user_id": "string",
  "tx_id": "string"
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
---

### POST /api/Label/_getLabel

**Description:** Retrieves a specific label document for a given user and transaction ID.

**Requirements:**
- None.

**Effects:**
- Returns the label document or null if not found.

**Request Body:**
```json
{
  "user_id": "string",
  "tx_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "user_id": "string",
    "tx_id": "string",
    "category_id": "string",
    "created_at": "string (ISO 8601)"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Label/_getTxInfo

**Description:** Retrieves transaction information for a given user and transaction ID.

**Requirements:**
- None.

**Effects:**
- Returns the transaction info document or null if not found.

**Request Body:**
```json
{
  "user_id": "string",
  "tx_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "tx_id": "string",
    "tx_name": "string",
    "tx_merchant": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Label/_getCategoryHistory

**Description:** Retrieves the transaction IDs associated with a specific category for a given user.

**Requirements:**
- None.

**Effects:**
- Returns a list of transaction IDs (strings).

**Request Body:**
```json
{
  "user_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  "string"
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Label/_all

**Description:** Retrieves all label documents.

**Requirements:**
- None.

**Effects:**
- Returns a list of all label documents.

**Request Body:**
```json
{}
```

**Success Response Body (Query):**
```json
[
  {
    "user_id": "string",
    "tx_id": "string",
    "category_id": "string",
    "created_at": "string (ISO 8601)"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Label/_hasAnyLabelsForCategory

**Description:** Checks if a given category has any associated labels for a specific user.

**Requirements:**
- None.

**Effects:**
- Returns true if the category has any labels for the user, false otherwise.

**Request Body:**
```json
{
  "user_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "hasLabels": "boolean"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

# API Specification: Transaction Concept

**Purpose:** represent each imported bank record that a user will label

---

## API Endpoints

### POST /api/Transaction/importTransactions

**Description:** Parses the provided file content, converts rows into Transactions owned by `owner_id` with status UNLABELED, generates new `tx_ids` for each transaction, and adds them to the state.

**Requirements:**
- owner exists
- file id is valid

**Effects:**
- parses the files and converts rows into Transactions owned by owner\_id with status UNLABELED
- generates new tx\_ids for each transaction
- adds them to state
- returns the created list

**Request Body:**
```json
{
  "owner_id": "string",
  "fileContent": "string"
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

### POST /api/Transaction/mark_labeled

**Description:** Sets the transaction's status to LABELED.

**Requirements:**
- transaction tx\_id exists
- requester\_id = transaction.owner\_id

**Effects:**
- sets transaction.status to LABELED

**Request Body:**
```json
{
  "tx_id": "string",
  "requester_id": "string"
}
```

**Success Response Body (Action):**
```json
{
  "tx_id": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Transaction/_getTransaction

**Description:** Retrieves a single transaction document by its ID and owner.

**Requirements:**
- None.

**Effects:**
- Returns the TransactionDoc.

**Request Body:**
```json
{
  "owner_id": "string",
  "tx_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "tx_id": "string",
    "owner_id": "string",
    "date": "string (ISO 8601)",
    "merchant_text": "string",
    "amount": "number",
    "status": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Transaction/_list_all

**Description:** Retrieves all transaction documents.

**Requirements:**
- None.

**Effects:**
- Returns a list of all transaction documents.

**Request Body:**
```json
{}
```

**Success Response Body (Query):**
```json
[
  {
    "tx_id": "string",
    "owner_id": "string",
    "date": "string (ISO 8601)",
    "merchant_text": "string",
    "amount": "number",
    "status": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Transaction/_get_unlabeled_transactions

**Description:** Retrieves all unlabeled transactions belonging to a specific owner ID.

**Requirements:**
- None.

**Effects:**
- Returns an array of unlabeled TransactionDoc objects.

**Request Body:**
```json
{
  "owner_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "tx_id": "string",
    "owner_id": "string",
    "date": "string (ISO 8601)",
    "merchant_text": "string",
    "amount": "number",
    "status": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Transaction/_get_labeled_transactions

**Description:** Retrieves all labeled transactions belonging to a specific owner ID.

**Requirements:**
- None.

**Effects:**
- Returns an array of labeled TransactionDoc objects.

**Request Body:**
```json
{
  "owner_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "tx_id": "string",
    "owner_id": "string",
    "date": "string (ISO 8601)",
    "merchant_text": "string",
    "amount": "number",
    "status": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

# API Specification: User Concept

**Purpose:** establish a unique identity for each person and control access to app functionality so that data is isolated per account

---

## API Endpoints

### POST /api/User/register

**Description:** Creates a new user with a fresh user ID, password hash derived from the password, status ACTIVE, adds the user to Users, and returns the created user.

**Requirements:**
- email is not used by any existing user

**Effects:**
- creates a new user with a fresh user\_id, password\_hash derived from password, status ACTIVE
- adds the user to Users
- returns the created user

**Request Body:**
```json
{
  "email": "string",
  "name": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user_id": "string",
  "email": "string",
  "name": "string",
  "status": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/User/authenticate

**Description:** Authenticates a user with the given email and password, returning the user if successful.

**Requirements:**
- there exists a user with the given email whose password\_hash matches password and whose status is ACTIVE

**Effects:**
- returns that user

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user_id": "string",
  "email": "string",
  "name": "string",
  "status": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/User/deactivate

**Description:** Sets the user's status to INACTIVE.

**Requirements:**
- a user with user\_id exists

**Effects:**
- sets the user's status to INACTIVE

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
---

### POST /api/User/changePassword

**Description:** Updates the user's password hash with the `new_password` and returns true if successful.

**Requirements:**
- a user with user\_id exists and old\_password matches the stored password\_hash

**Effects:**
- updates password\_hash with new\_password
- returns true

**Request Body:**
```json
{
  "user_id": "string",
  "old_password": "string",
  "new_password": "string"
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

### POST /api/User/reactivate

**Description:** Sets the user’s `status` to ACTIVE, updates the user’s `password_hash` with the hash of `new_password`, and returns true if successful.

**Requirements:**
- a user with the given email exists and `status = INACTIVE`

**Effects:**
- sets the user’s `status` to ACTIVE
- updates the user’s `password_hash` with the hash of `new_password`
- returns true

**Request Body:**
```json
{
  "email": "string",
  "new_password": "string"
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

### POST /api/User/_all

**Description:** Retrieves all user objects.

**Requirements:**
- None.

**Effects:**
- Returns a list of all user objects.

**Request Body:**
```json
{}
```

**Success Response Body (Query):**
```json
[
  {
    "user_id": "string",
    "email": "string",
    "name": "string",
    "status": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
	---