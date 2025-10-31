(OLD)
## Interesting moments

1. Parsing the bank statements is a *big* fish to fry although it feels like one action. I need to ask more friends to give me sample bank statements, and if the current, deterministic parsing doesn't satisfy a good chunk of the bank statements, I'll probably integrate AI calls to determine which columns refer to merchant_info, to amounts, etc.   

[Snapshot - 200 lines for parsing?](../../../../context\src\concepts\FlashFinance\Transaction\Context_Chat.md\steps\response.8b3a436d.md)


2. Now that labels have a *pending* state, this has some interesting interactions with the fact that transactions can be labeled or unlabeled. UI-wise, the unlabeled transactions are going to be kept in a "bucket" before the user starts a labeling session. This alllows the user to finalize a labeling session even if they hadn't labeles *all* the transactions that are unlabeled, and allows them to come back later to the unlabeled transactions. I think this is good! I'll have to introduce some logic about transactions that could overlap (like say user uploads transactions from 14/10-24/10 and then from 20/10-30/10, transactions shouldn't be double-counted). This might be in the near future as I'm working on the syncs and set up their interactions.

3. Because bank statement/ spending records can vary from bank to bank so much, I made some background data explaining the fields. I also had to be clear in the prompts what kind of expression could be equivalent and should be labeled as a specific field we were interesting in (e.g. 'amount' could be split from 'credit' and 'debit' or use another synonym for amount).
[Snapshot - very detailed prompt on the vast structure of the bank statements](../../../../context\src\concepts\FlashFinance\Transaction\Context_Chat.md\steps\prompt.ba189b37.md)