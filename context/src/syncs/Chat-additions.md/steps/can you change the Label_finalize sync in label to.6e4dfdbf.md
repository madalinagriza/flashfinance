---
timestamp: 'Wed Nov 05 2025 16:06:01 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_160601.ef42cb3a.md]]'
content_id: 6e4dfdbf2eb768f483a86a195ae70261b3f33fbbdc0e944032a1a780396c9911
---

# can you change the Label/finalize sync in label to:

1. get labels from   "/api/Label/getStagedLabels",
2. for each of these labels, extract the necessary information, and for each label:
   2.1 call Transaction.mark\_labeled
   2.2 call Category.add transaction
3. call label.finalize

catch any errors and throw them in the process
