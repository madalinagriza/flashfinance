---
timestamp: 'Mon Oct 27 2025 21:52:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251027_215214.3f022557.md]]'
content_id: de3ed32151a7c9a018f2e61336caeb257b9a07c2b4fd037535f7ae022f70d910
---

# API Specification: Transaction Concept

**Purpose:** represent each imported bank record that a user will label

***

## API Endpoints

### POST /api/Transaction/import\_transactions

**Description:** Parses a CSV file of bank records and creates new, unlabeled transactions for a user.

**Requirements:**

* The user specified by `owner_id` must exist.
* The `fileContent` must be a valid CSV string.

**Effects:**

* Parses the CSV content and creates new `Transaction` records for each valid row.
* Each new transaction is assigned a unique `tx_id`, associated with the `owner_id`, and given a status of `UNLABELED`.

**Request Body:**

```json
{
  "owner_id": "ID",
  "fileContent": "String"
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

**Description:** Updates a transaction's status from UNLABELED to LABELED.

**Requirements:**

* The transaction specified by `tx_id` must exist.
* The `requester_id` must match the `owner_id` of the transaction.
* The transaction's current status must be `UNLABELED`.

**Effects:**

* Sets the specified transaction's `status` to `LABELED`.
* Returns the ID of the updated transaction.

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

### POST /api/Transaction/\_get\_unlabeled\_transactions

**Description:** Retrieves all transactions for a user that have a status of UNLABELED.

**Requirements:**

* The user specified by `owner_id` must exist.

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
    "tx_id": "string",
    "owner_id": "string",
    "date": "Date",
    "merchant_text": "string",
    "amount": "Number",
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

### POST /api/Transaction/\_get\_labeled\_transactions

**Description:** Retrieves all transactions for a user that have a status of LABELED.

**Requirements:**

* The user specified by `owner_id` must exist.

**Effects:**

* Returns an array of transaction documents that are owned by the user and have already been labeled.

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
    "tx_id": "string",
    "owner_id": "string",
    "date": "Date",
    "merchant_text": "string",
    "amount": "Number",
    "status": "LABELED"
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
