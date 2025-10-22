---
timestamp: 'Mon Oct 20 2025 17:49:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_174909.325c24a9.md]]'
content_id: 0cd871dbba7604eb23b2a7afb4c5a7fa3aeb0d6c619843d89d6bdb7332de3480
---

# API Specification: Transaction Concept

**Purpose:** represent each imported bank record that a user will label

***

## API Endpoints

### POST /api/Transaction/import\_transactions

**Description:** Parses a CSV file and converts its rows into new, unlabeled transactions owned by a user.

**Requirements:**

* owner exists
* file id is valid

**Effects:**

* parses the files and converts rows into Transactions owned by owner\_id with status UNLABELED
* generates new tx\_ids for each transaction
* adds them to state
* returns the created list

**Request Body:**

```json
{
  "owner_id": "string",
  "fileContent": "string"
}
```

**Success Response Body (Action):**

```json
[
  {
    "tx_id": "string",
    "owner_id": "string",
    "date": "string (ISO Date)",
    "merchant_text": "string",
    "amount": "number",
    "status": "string (UNLABELED|LABELED)"
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

### POST /api/Transaction/mark\_labeled

**Description:** Sets a transaction's status to LABELED after verifying ownership.

**Requirements:**

* transaction tx\_id exists
* requester\_id = transaction.owner\_id

**Effects:**

* sets transaction.status to LABELED

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

***

### POST /api/Transaction/getTransaction

**Description:** Retrieves a single transaction document by its ID.

**Requirements:**

* true (implicitly)

**Effects:**

* Retrieves a single transaction document by its ID.

**Request Body:**

```json
{
  "tx_id": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "tx_id": "string",
    "owner_id": "string",
    "date": "string (ISO Date)",
    "merchant_text": "string",
    "amount": "number",
    "status": "string (UNLABELED|LABELED)"
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

### POST /api/Transaction/list\_all

**Description:** Returns all transaction documents in the system.

**Requirements:**

* true (implicitly)

**Effects:**

* Returns all transaction documents.

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
    "date": "string (ISO Date)",
    "merchant_text": "string",
    "amount": "number",
    "status": "string (UNLABELED|LABELED)"
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
