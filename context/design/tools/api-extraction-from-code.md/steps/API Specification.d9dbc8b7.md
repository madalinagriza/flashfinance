---
timestamp: 'Tue Oct 28 2025 20:59:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251028_205932.95ca8de5.md]]'
content_id: d9dbc8b72c34cc7ad1d6e1f554d312e2a082b4c815568c54274001acacfd83b4
---

# API Specification: Transaction Concept

**Purpose:** represent each imported bank record that a user will label

***

## API Endpoints

### POST /api/Transaction/import\_transactions

**Description:** Parses a CSV file and creates new, unlabeled transaction records for a user.

**Requirements:**

* The `owner_id` must correspond to an existing user.
* The `fileContent` must be a string in a valid CSV format.

**Effects:**

* The CSV data is parsed to extract transaction details (date, merchant, amount).
* For each valid row, a new `Transaction` record is created with a unique `tx_id` and `UNLABELED` status.
* The new transactions are saved to the database.

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

***

### POST /api/Transaction/mark\_labeled

**Description:** Updates the status of a transaction from UNLABELED to LABELED.

**Requirements:**

* The transaction specified by `tx_id` must exist.
* The `requester_id` must match the `owner_id` of the transaction.

**Effects:**

* The specified transaction's `status` field is set to `LABELED`.
* The `tx_id` is returned on success.

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

***

### POST /api/Transaction/get\_unlabeled\_transactions

**Description:** Retrieves all transactions for a user that have a status of UNLABELED.

**Requirements:**

* The `owner_id` must correspond to an existing user.

**Effects:**

* Returns an array of transaction documents that are owned by the user and have not yet been labeled.

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
    "tx_id": "string",
    "owner_id": "string",
    "date": "string (ISO 8601)",
    "merchant_text": "string",
    "amount": "number",
    "status": "UNLABELED"
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
