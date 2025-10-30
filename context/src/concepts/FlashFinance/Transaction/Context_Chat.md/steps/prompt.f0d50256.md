---
timestamp: 'Sat Oct 18 2025 17:38:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_173828.07ba3777.md]]'
content_id: f0d5025663c5e52bdc3b9e7a1eabaecaa5651ae34b57008587bf64c69f3c9d03
---

# prompt:  iterate on transaction.ts to implement the import\_transactions action. use label.ts to consult imports and structure. split the import transactions into two functions: one being add\_transaction (with the information found), and one being parse\_info (you can use APIs to parse csv files). We are concerned to extract the following: date of transaction (if present), merchant\_name, amount of money (that the transaction costed ), and any other details. check the bank\_statement\_columns.md examples to see two different set of keywords banks use. we are only conerned about what is in the state. feel free to  add yours too. then, the import\_transactions makes use of these two functions  general pointers:  Keep it simple, minimal, and just the amounts that we need. Don't implement any actions, just the state. implement any getters you might need but be minimal in your design. Take as an example the code in label.ts. Don't interleave any functions or classes from label, but follow it for imports, class structure, seeing how to call mongodb and other particularities. Be minimal in your code.
