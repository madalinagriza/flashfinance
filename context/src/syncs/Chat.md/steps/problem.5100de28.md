---
timestamp: 'Fri Nov 07 2025 00:39:50 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_003950.91dc0d1d.md]]'
content_id: 5100de28abd1ca3d2b54a91dd51ef417abc76a011c9ea03d0ac360789fbe87a1
---

# problem:

Based on the provided trace, the request to `/Transaction/get_unlabeled_transactions` is hanging and eventually timing out. The trace shows that a `Requesting.request` action is fired for this path, but no subsequent actions from the `Transaction` concept or a `Requesting.respond` action occur for that request.

The key piece of evidence is that the debug logs you added to the `where` clause of the `GetUnlabeledTransactionsRequest` sync (e.g., `[GetUnlabeledTransactions] where start`) do not appear in the trace. This strongly indicates that the `where` clause is never being executed. The reason for this is that the `when` clause of the synchronization is not matching the incoming request.

Looking at the code and the trace:

1. **Trace Request Path**: `/Transaction/get_unlabeled_transactions` (snake\_case)
2. **Sync `when` Clause Path**: `/Transaction/getUnlabeledTransactions` (camelCase)

Because these paths do not match, the synchronization never triggers, the request is never handled, and it eventually times out.

While your suspicion about the `where` clause not firing due to an empty array is a very good one—as this is a common pitfall—in this specific case, the logic within the `where` clause correctly handles an empty result set from the database. The root problem is that the `where` clause is never reached in the first place due to the path mismatch.

I also noticed a similar issue with the `ImportTransactionsRequest` sync, which was matching on a camelCase path while the corresponding concept action is snake\_case.
