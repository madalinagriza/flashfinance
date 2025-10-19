
Changes to the Label spec:
The update came from test cases showing that applying two labels to the same transaction was undefined. I wanted labeling to be **atomic per session**, but the old `apply` wrote directly to the persistent state, leaving no clear path for unfinished sessions. If a user stopped mid-labeling, the work would be lost unless they reuploaded their bank statement.

To address this, I added a **staging phase** before committing labels. Each label is first stored as pending; if the user **finalizes**, all staged labels are applied together, while **cancel** discards them. This makes labeling sessions all-or-nothing and prevents inconsistent or partial states.


  

Interesting moments: 

1. Atomic-session redesign: I realized that direct applying labels left transactions half-labeled; introduced stage + finalize to make sessions atomic.
[Context Snapshot `20251017_181902.7498d0eb`](../../../../context/src/concepts/FlashFinance/Label/Context_Chat.md/20251017_181902.7498d0eb.md) - running this test, realizing the behavior is undefined when there's two applies; and that probably the user may be in a situation where their labeling session is interrupted

[Context Snapshot  `20251017_193248.db1985bc`](../../../../context/src/concepts/FlashFinance/Label/Context_Chat.md/20251017_193248.db1985bc.md) - AI tries to use the *now* private apply function to directly insert and stress-test something. I had to iterate and tell it not to. 

2. Failed a testcase in which 2 different users were labeling under the same stage id (the error was saying the transaction id already exists for userB, even though it existed for userA). ALthough my search to find if there's an entry was per-user, when inserting in the database, I was inserting only per transaction id and not per user. Now I am keyeing by the user too. 
[Label Snapshot](../../../../context/src/concepts/FlashFinance/Label/label.ts/20251017_192345.e6ae5480.md) - before, the ids were just tx_ids (because of the one to one relationship, for one user)
[Updated Label.ts Snapshot](../../../../context/src/concepts/FlashFinance/Label/label.ts/20251017_201613.fc74a44a.md) - updates so that keys are both user & tx related (there's been iterations from these files as I was finding bugs, but this is the moment of change) 