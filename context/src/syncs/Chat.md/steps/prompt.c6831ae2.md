---
timestamp: 'Wed Nov 05 2025 20:51:01 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_205101.2a5a55b9.md]]'
content_id: c6831ae2ef88f66099d48aaea2238072c5b0225bc7b1fccdb961524ed52f0021
---

# prompt: based on successful examples of a auth and category syncs, provide the follwing syncs:

1. files.sync.ts provides in a comment some examples of syncs working successfully. we don't need some funcitonality, like the downloading. but the other funcitonality can be relevant. take the syncs athat are relevant to make a file upoading.
2. additionally, give me the following sync implemmentation based on the description

```
sync ImportTransactionsOnUpload
when
    FileUploading.confirmUpload ({file})
where
    in FileUploading: _getOwner ({file}) is {owner}
    in FileUploading: _getFileContent ({file}) is {content}
then
    Transaction.import_transactions ({owner_id: owner, fileContent: content})
```
