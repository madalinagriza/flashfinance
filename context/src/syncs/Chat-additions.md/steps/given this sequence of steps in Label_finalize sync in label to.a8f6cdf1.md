---
timestamp: 'Wed Nov 05 2025 18:22:57 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_182257.4f7f58e6.md]]'
content_id: a8f6cdf1e9954318e88f1f9b386bfc9a651d59bca9881171946242b251541441
---

# given this sequence of steps in Label/finalize sync in label to:

1. get labels from "/api/Label/getStagedLabels",
2. calls:
   2.1 call Transaction.bulk\_mark\_labeled
   2.2 call Category.bulk\_add\_transaction
3. call label.finalize
