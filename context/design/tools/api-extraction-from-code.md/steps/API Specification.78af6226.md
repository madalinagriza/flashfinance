---
timestamp: 'Tue Oct 28 2025 21:12:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251028_211259.af66c5de.md]]'
content_id: 78af622660e7ee3def0f2d781ff28a78439c2d3ed70259f90e65c6317ef03587
---

# API Specification: Transaction Concept

**Purpose:** represent each imported bank record that a user will label

***

## API Endpoints

### POST /api/Transaction/import\_transactions

**Description:** Imports new transactions for a user from a CSV file content.

**Requirements:**

* owner exists; file id is valid

**Effects:**

* parses the files and converts rows into Transactions owned by owner\_id with status UNLABELED; generates new tx\_ids for each transaction; adds them to state; returns the created list

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

**Description:** Marks an unlabeled transaction as labeled.

**Requirements:**

* transaction tx\_id exists; requester\_id = transaction.owner\_id

**Effects:**

* sets transaction.status to LABELED

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

### POST /api/Transaction/getTransaction

**Description:** Retrieves a single transaction document by its ID.

**Requirements:**

* A transaction with the given `tx_id` must exist and belong to the specified `owner_id`.

**Effects:**

* Returns an array containing the full transaction document if found.

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

***

### POST /api/Transaction/get\_labeled\_transactions

**Description:** Retrieves all of a user's transactions that have the status `LABELED`.

**Requirements:**

* The `owner_id` must correspond to an existing user.

**Effects:**

* Returns an array of transaction documents with a status of `LABELED`.

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

***

### POST /api/Transaction/getTxInfo

**Description:** Retrieves the parsed information (date, merchant, amount) for a single transaction.

**Requirements:**

* A transaction with the given `tx_id` must exist and belong to the specified `owner_id`.

**Effects:**

* Returns an array containing an object with the core details of the transaction.

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

***
