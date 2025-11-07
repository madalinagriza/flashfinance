---
timestamp: 'Wed Nov 05 2025 20:43:36 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_204336.159ebe49.md]]'
content_id: 9ba7a5ef1ad6b873059f190e617160e94414f67b12e34cfb4cf5f2179600c424
---

# implement: If I want the content of the csv file that is uploaded to be triggering Transaction.importcsv...

I want the sync not to use any "purpose". We need to get the content of the file that was most recently uploaded.

the sync would look something like
sync ImportTransactionsOnUpload
when
FileUploading.confirmUpload ({file})
where
in FileUploading: \_getOwner ({file}) is {owner}
in FileUploading: \_getFileContent ({file}) is {content}
then
Transaction.import\_transactions ({owner\_id: owner, fileContent: content})

I need to not use purpose, this was a deliberate choice to ignore it.

1. Do I need to change anything in the FileUploadingConcept for this sync to work?
2. Is this sync robust? Does it need any changes?
