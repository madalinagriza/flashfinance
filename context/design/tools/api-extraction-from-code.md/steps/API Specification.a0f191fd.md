---
timestamp: 'Tue Oct 21 2025 20:40:27 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_204027.a009af03.md]]'
content_id: a0f191fd08165f3b841f0768fdd68c185cccddf06b5fd156cb0e9e9db013f7ef
---

# API Specification: Transaction Concept

**Purpose:** represent each imported bank record that a user will label

***

## API Endpoints

### POST /api/Transaction/importTransactions

**Description:** Parses a CSV file containing bank records and imports them as new, unlabeled transactions for a user.

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
  "file": "string"
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

**Description:** Sets the status of a transaction to LABELED after it has been assigned a label.

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
