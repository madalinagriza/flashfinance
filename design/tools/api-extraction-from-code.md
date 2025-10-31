[@api-extraction-from-spec](api-extraction-from-spec.md)

# Extracting from code

The following is an explanation of how concepts are implemented, for the purposes of understanding how to extract an API.

[@implementing-concepts](../background/implementing-concepts.md)

# prompt: 

Now, analyze the following Concept Implementation and generate the API documentation based on these instructions. In your previous calls you missed including some APIs, missing_apis.md is the list of APIs that also need included. It is an absolute rule.

[@missing_apis](../../missing_apis.md)
## Category Concept

Specification:

[@Spec](../../src/concepts/Category/Spec.md)

Implementation:

[@CategoryConcept.ts](/src/concepts/Category/CategoryConcept.ts)


## Label Concept

Specification:

[@Spec](../../src/concepts/Label/Spec.md)

Implementation:

[@CategoryConcept.ts](/src/concepts/Label/LabelConcept.ts)



## Transaction Concept

Specification:

[@Spec](../../src/concepts/Transaction/Spec.md)

Implementation:

[@TransactionConcept.ts](/src/concepts/Transaction/TransactionConcept.ts)


## User Concept

Specification:

[@Spec](../../src/concepts/User/Spec.md)

Implementation:

[@CategoryConcept.ts](/src/concepts/User/UserConcept.ts)



# response:

# API Specification: Category Concept

**Purpose:** allow users to define and manage meaningful groupings of their transactions

---

## API Endpoints

### POST /api/Category/create

**Description:** Creates a new transaction category for a user.

**Requirements:**
- user owner_id exists; for the same owner_id, no existing category with same name

**Effects:**
- generates a new category_id; creates and stores a category under owner_id associated with name; returns it

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
---
### POST /api/Category/rename

**Description:** Renames an existing transaction category.

**Requirements:**
- category exists and category.owner_id = owner_id; for the same owner_id, no existing category with same new_name

**Effects:**
- updates category.name to new_name; returns updated category_id

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
---
### POST /api/Category/delete

**Description:** Deletes a transaction category if it's not in use.

**Requirements:**
- category exists and category.owner_id = owner_id; can_delete = true (derived from whether any labels reference this category)

**Effects:**
- removes the category and its associated metrics; returns true

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
---
### POST /api/Category/addTransaction

**Description:** Records a transaction's details against a category for metric tracking.

**Requirements:**
- owner and category exist; amount ≥ 0; transaction with tx_id is not already recorded for this category

**Effects:**
- adds the transaction record to the metric for (owner, category); returns true

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
---
### POST /api/Category/removeTransaction

**Description:** Removes a transaction's details from a category's metric tracking.

**Requirements:**
- owner and category exist; transaction with tx_id is recorded for this category

**Effects:**
- removes the transaction record from the metric for (owner, category); returns true

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
---
### POST /api/Category/getCategoryNameById

**Description:** Retrieves the name of a single category by its ID.

**Requirements:**
- A category with the given `category_id` must exist for the specified `owner_id`.

**Effects:**
- Returns an array containing an object with the name of the specified category.

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
---
### POST /api/Category/getCategoriesFromOwner

**Description:** Retrieves all category IDs belonging to a specific owner.

**Requirements:**
- The `owner_id` must correspond to an existing user.

**Effects:**
- Returns an array of objects, each containing a `category_id` owned by the user.

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
---
### POST /api/Category/getMetricStats

**Description:** Computes and returns spending statistics for a category over a given period.

**Requirements:**
- The `owner_id` and `category_id` must exist.
- The `period` must contain valid start and end dates.

**Effects:**
- Returns an object containing the total amount, transaction count, average spending per day, and total days in the period.

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
---
# API Specification: Label Concept

**Purpose:** record the user's assignment of a specific transaction to a specific category so that spending meaning is explicit and auditable

---

## API Endpoints

### POST /api/Label/stage

**Description:** Creates a temporary, uncommitted label for a transaction.

**Requirements:**
- no committed label exists for `tx_id`; no stagedLabel with ID tx_id.

**Effects:**
- creates a StagedLabel for this user and transaction with the provided info and category. Adds it to the stagedLabels (that are not yet commited). Returns the created stagedLabel.

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
---
### POST /api/Label/discard

**Description:** Stages a transaction to be moved to the built-in Trash category.

**Requirements:**
- no committed label exists for `tx_id`; no stagedLabel with ID tx_id.

**Effects:**
- creates a StagedLabel for this user and transaction, assigning it to the built-in **Trash** category.

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
---
### POST /api/Label/finalize

**Description:** Commits all of a user's currently staged labels, making them permanent.

**Requirements:**
- for each StagedLabel belonging to the user: no committed label exists for `tx_id`

**Effects:**
- for each StagedLabel belonging to the user
  - creates a TransactionInfo
  - creates a new Label linking `tx_id` to `category_id` and `user_id`;
  - adds TransactionInfo to CategoryHistory under the chosen category;
  - after processing all staged labels, wipes stagedLabels

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
---
### POST /api/Label/cancel

**Description:** Deletes all of a user's staged labels without committing them.

**Requirements:**
- true (a user may cancel a pending session at any time)

**Effects:**
- deletes all StagedLabels for that user;
- no modifications to Labels or CategoryHistory

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
---
### POST /api/Label/update

**Description:** Changes the category of an already-labeled transaction.

**Requirements:**
- a label for `tx_id` exists; `transaction.owner_id = user_id`;
- `new_category_id` exists and `owner_id = user_id`;
- TransactionInfo exists with `transactionInfo.id = tx_id`

**Effects:**
- updates CategoryHistory, associating TransactionInfo with the new category;
- replaces the label’s `category_id` with `new_category_id`;
- updates `created_at` to now; returns updated label

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
---
### POST /api/Label/remove

**Description:** Moves a labeled transaction to the built-in Trash category.

**Requirements:**
- a label for `tx_id` exists; `transaction.owner_id = user_id`

**Effects:**
- reassigns the transaction’s label to the user’s built-in **Trash** category;
- updates CategoryHistory, associating the transaction with the trash category

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
---
### POST /api/Label/suggest

**Description:** Provides an AI-powered suggestion for categorizing a transaction.

**Requirements:**
- user has ≥ 1 category

**Effects:**
- returns a best-guess category_id from the user’s existing categories for this `tx_id`, highlighted in the UI;
- suggested by AI and does **not** alter Labels state

**Request Body:**
```json
{
  "user_id": "ID",
  "allCategories": "[[\"string\", \"ID\"]]",
  "txInfo": {
    "tx_id": "ID",
    "tx_name": "string",
    "tx_merchant": "string"
  }
}
```

**Success Response Body (Action):**
```json
{
  "id": "ID",
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
### POST /api/Label/getLabel

**Description:** Retrieves a single committed label for a specific user and transaction.

**Requirements:**
- A committed label must exist for the given `user_id` and `tx_id`.

**Effects:**
- Returns an array containing the full label document if found.

**Request Body:**
```json
{
  "user_id": "ID",
  "tx_id": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "user_id": "ID",
    "tx_id": "ID",
    "category_id": "ID",
    "created_at": "Date"
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
### POST /api/Label/getCategoryHistory

**Description:** Retrieves the spending history (all transaction IDs) for a category.

**Requirements:**
- The `user_id` and `category_id` must exist.

**Effects:**
- Returns an array of objects, each containing a `tx_id` associated with the specified category.

**Request Body:**
```json
{
  "user_id": "ID",
  "category_id": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "tx_id": "ID"
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
### POST /api/Label/get_category_tx

**Description:** Retrieves all transaction IDs associated with a specific category for a user.

**Requirements:**
- The `user_id` and `category_id` must exist.

**Effects:**
- Returns an array of objects, each containing a `tx_id` associated with the specified category.

**Request Body:**
```json
{
  "user_id": "ID",
  "category_id": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "tx_id": "ID"
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
### POST /api/Label/get_tx_in_trash

**Description:** Retrieves all transaction IDs that have been moved to the trash for a user.

**Requirements:**
- The `user_id` must exist.

**Effects:**
- Returns an array of objects, each containing a `tx_id` associated with the built-in Trash category.

**Request Body:**
```json
{
  "user_id": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "tx_id": "ID"
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
### POST /api/Label/getStagedLabels

**Description:** Retrieves all currently staged (uncommitted) labels for a user.

**Requirements:**
- The `user_id` must exist.

**Effects:**
- Returns an array containing all staged label documents for the user.

**Request Body:**
```json
{
  "user_id": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "user_id": "ID",
    "category_id": "ID",
    "tx_id": "ID",
    "tx_name": "string",
    "tx_merchant": "string",
    "staged_at": "Date"
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
### POST /api/Label/hasAnyLabelsForCategory

**Description:** Checks if a category is referenced by any of a user's labels.

**Requirements:**
- The `user_id` and `category_id` must exist.

**Effects:**
- Returns a boolean indicating if any transactions are labeled with the specified category.

**Request Body:**
```json
{
  "user_id": "ID",
  "category_id": "ID"
}
```

**Success Response Body (Action):**
```json
{
  "result": "boolean"
}
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

### POST /api/Transaction/import_transactions

**Description:** Imports new transactions for a user from a CSV file content.

**Requirements:**
- owner exists; file id is valid

**Effects:**
- parses the files and converts rows into Transactions owned by owner_id with status UNLABELED; generates new tx_ids for each transaction; adds them to state; returns the created list

**Request Body:**
```json
{
  "owner_id": "ID",
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

**Description:** Marks an unlabeled transaction as labeled.

**Requirements:**
- transaction tx_id exists; requester_id = transaction.owner_id

**Effects:**
- sets transaction.status to LABELED

**Request Body:**
```json
{
  "tx_id": "ID",
  "requester_id": "ID"
}
```

**Success Response Body (Action):**
```json
{
  "tx_id": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Transaction/getTransaction

**Description:** Retrieves a single transaction document by its ID.

**Requirements:**
- A transaction with the given `tx_id` must exist and belong to the specified `owner_id`.

**Effects:**
- Returns an array containing the full transaction document if found.

**Request Body:**
```json
{
  "owner_id": "ID",
  "tx_id": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "tx_id": "ID",
    "owner_id": "ID",
    "date": "Date",
    "merchant_text": "string",
    "amount": "Number",
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
### POST /api/Transaction/get_labeled_transactions

**Description:** Retrieves all of a user's transactions that have the status `LABELED`.

**Requirements:**
- The `owner_id` must correspond to an existing user.

**Effects:**
- Returns an array of transaction documents with a status of `LABELED`.

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
    "_id": "string",
    "tx_id": "ID",
    "owner_id": "ID",
    "date": "Date",
    "merchant_text": "string",
    "amount": "Number",
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
### POST /api/Transaction/getTxInfo

**Description:** Retrieves the parsed information (date, merchant, amount) for a single transaction.

**Requirements:**
- A transaction with the given `tx_id` must exist and belong to the specified `owner_id`.

**Effects:**
- Returns an array containing an object with the core details of the transaction.

**Request Body:**
```json
{
  "owner_id": "ID",
  "tx_id": "ID"
}
```

**Success Response Body (Query):**
```json
[
  {
    "date": "Date",
    "merchant_text": "string",
    "amount": "Number"
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

**Description:** Creates a new user account.

**Requirements:**
- email is not used by any existing user

**Effects:**
- creates a new user with a fresh user_id, password_hash derived from password, status ACTIVE; adds the user to Users; returns the created user

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
  "user": {
    "user_id": "ID",
    "email": "string",
    "name": "string",
    "status": "string"
  }
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

**Description:** Authenticates a user and provides their user object upon success.

**Requirements:**
- there exists a user with the given email whose password_hash matches password and whose status is ACTIVE

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
  "user": {
    "user_id": "ID",
    "email": "string",
    "name": "string",
    "status": "string"
  }
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

**Description:** Deactivates a user's account, preventing future logins.

**Requirements:**
- a user with user_id exists

**Effects:**
- sets the user's status to INACTIVE

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
---
### POST /api/User/changePassword

**Description:** Changes the password for an existing user account.

**Requirements:**
- a user with user_id exists and old_password matches the stored password_hash

**Effects:**
- updates password_hash with new_password; returns true

**Request Body:**
```json
{
  "user_id": "ID",
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

**Description:** Reactivates an inactive user account with a new password.

**Requirements:**
- a user with the given email exists and `status = INACTIVE`

**Effects:**
- sets the user’s `status` to ACTIVE; updates the user’s `password_hash` with the hash of `new_password`; returns true

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
### POST /api/User/all

**Description:** Retrieves a list of all users in the system.

**Requirements:**
- (None, typically requires admin privileges not specified in the concept).

**Effects:**
- Returns an array of all user objects.

**Request Body:**
```json
{}
```

**Success Response Body (Query):**
```json
[
  {
    "user_id": "ID",
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