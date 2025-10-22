---
timestamp: 'Tue Oct 21 2025 20:59:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_205936.f6b594f9.md]]'
content_id: 852d2438c4504a2c80beb5f3bded279205c66861ec82ce782dfa97d552cc9029
---

# API Specification: Transaction Concept

**Purpose:** represent each imported bank record that a user will label

***

## API Endpoints

### POST /api/Transaction/importTransactions

**Description:** Parses the provided file content, converts rows into Transactions owned by `owner_id` with status UNLABELED, generates new `tx_ids` for each transaction, and adds them to the state.

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

**Description:** Sets the transaction's status to LABELED.

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

### POST /api/Transaction/\_getTransaction

**Description:** Retrieves a single transaction document by its ID and owner.

**Requirements:**

* None.

**Effects:**

* Returns the TransactionDoc.

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

***

### POST /api/Transaction/\_list\_all

**Description:** Retrieves all transaction documents.

**Requirements:**

* None.

**Effects:**

* Returns a list of all transaction documents.

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

***

### POST /api/Transaction/\_get\_unlabeled\_transactions

**Description:** Retrieves all unlabeled transactions belonging to a specific owner ID.

**Requirements:**

* None.

**Effects:**

* Returns an array of unlabeled TransactionDoc objects.

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

***

### POST /api/Transaction/\_get\_labeled\_transactions

**Description:** Retrieves all labeled transactions belonging to a specific owner ID.

**Requirements:**

* None.

**Effects:**

* Returns an array of labeled TransactionDoc objects.

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

***
