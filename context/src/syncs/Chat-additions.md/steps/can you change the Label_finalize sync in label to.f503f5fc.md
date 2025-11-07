---
timestamp: 'Wed Nov 05 2025 16:19:16 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_161916.fb0eb8d5.md]]'
content_id: f503f5fc09a596181e0e4dcdaf2731cb45ff4151e77726d728b7765d4aa7ad2b
---

# can you change the Label/finalize sync in label to:

1. get labels from   "/api/Label/getStagedLabels",
2. for each of these labels, extract the necessary information, and for each label:
   2.1 call Transaction.mark\_labeled
   2.2 call Category.add transaction
3. call label.finalize

catch any errors and throw them in the process

give me just the edited thing and implmement and compare correctness and places for bugs for these two methods:

1. editing the sync directly
2. The declarative nature of syncs makes a `for-each-then-do-once` pattern complex to implement in a single sync without race conditions or unintended side effects (like calling `Label.finalize` multiple times).

The cleanest solution involves separating the logic into two distinct syncs that are triggered by the initial request. One sync will handle the processing of each staged label, and the second sync will handle the final cleanup and response. This avoids race conditions and ensures the logic is clear and maintainable.
