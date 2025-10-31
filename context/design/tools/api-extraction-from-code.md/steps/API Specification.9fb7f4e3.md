---
timestamp: 'Mon Oct 27 2025 20:59:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251027_205959.9156f583.md]]'
content_id: 9fb7f4e325ee3e0c782b174f7ee080f6d8d18ad5116331374035066241021789
---

# API Specification: Transaction Concept

**Purpose:** represent each imported bank record that a user will label

***

## API Endpoints

### POST /api/Transaction/import\_transactions

**Description:** Parses a CSV file and converts its rows into new, unlabeled transactions for a user.

**Requirements:**

* owner exists
* file id is valid (impl expects fileContent string)

**Effects:**

* parses the files and converts rows into Transactions owned by owner\_id with status UNLABELED
* generates new tx\_ids for each transaction
* adds them to state
* returns the created list (void return means empty object)

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

**Description:** Sets a transaction's status to LABELED.

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

**Description:** Retrieves a single transaction document by its ID and owner.

**Requirements:**

* transaction exists for the specified owner\_id and tx\_id

**Effects:**

* returns the transaction document

**Request Body:**

```json
{
  "owner_id": "string",
  "tx_id": "string"
}
```

**Success Response Body (Action):**

```json
{
  "transaction": {
    "_id": "string",
    "tx_id": "string",
    "owner_id": "string",
    "date": "YYYY-MM-DDTHH:MM:SS.sssZ",
    "merchant_text": "string",
    "amount": 100.00,
    "status": "UNLABELED"
  }
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Transaction/list\_all

**Description:** Retrieves all transactions in the system.

**Requirements:**

* none

**Effects:**

* returns an array of all transaction documents

**Request Body:**

```json
{}
```

**Success Response Body (Action):**

```json
{
  "transactions": [
    {
      "_id": "string",
      "tx_id": "string",
      "owner_id": "string",
      "date": "YYYY-MM-DDTHH:MM:SS.sssZ",
      "merchant_text": "string",
      "amount": 100.00,
      "status": "UNLABELED"
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

***

### POST /api/Transaction/get\_unlabeled\_transactions

**Description:** Retrieves all unlabeled transactions for a specific owner.

**Requirements:**

* none (returns empty array if no unlabeled transactions)

**Effects:**

* returns an array of unlabeled transaction documents

**Request Body:**

```json
{
  "owner_id": "string"
}
```

**Success Response Body (Action):**

```json
{
  "transactions": [
    {
      "_id": "string",
      "tx_id": "string",
      "owner_id": "string",
      "date": "YYYY-MM-DDTHH:MM:SS.sssZ",
      "merchant_text": "string",
      "amount": 100.00,
      "status": "UNLABELED"
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

***

### POST /api/Transaction/get\_labeled\_transactions

**Description:** Retrieves all labeled transactions for a specific owner.

**Requirements:**

* none (returns empty array if no labeled transactions)

**Effects:**

* returns an array of labeled transaction documents

**Request Body:**

```json
{
  "owner_id": "string"
}
```

**Success Response Body (Action):**

```json
{
  "transactions": [
    {
      "_id": "string",
      "tx_id": "string",
      "owner_id": "string",
      "date": "YYYY-MM-DDTHH:MM:SS.sssZ",
      "merchant_text": "string",
      "amount": 100.00,
      "status": "LABELED"
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

***

### POST /api/Transaction/getTxInfo

**Description:** Returns parsed transaction information (date, merchant\_text, amount) for a given owner and transaction ID.

**Requirements:**

* transaction exists for the specified owner\_id and tx\_id

**Effects:**

* returns an object containing date, merchant\_text, and amount

**Request Body:**

```json
{
  "owner_id": "string",
  "tx_id": "string"
}
```

**Success Response Body (Action):**

```json
{
  "date": "YYYY-MM-DDTHH:MM:SS.sssZ",
  "merchant_text": "string",
  "amount": 100.00
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
