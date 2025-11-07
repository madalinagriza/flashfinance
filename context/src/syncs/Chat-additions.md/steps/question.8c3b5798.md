---
timestamp: 'Wed Nov 05 2025 19:42:33 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_194233.bd481940.md]]'
content_id: 8c3b5798467742a19da9a48d8d008b4ee2dfc8a5a80fd2611f0f37f4d2b26298
---

# question:

In addition to pasting csv content, I had my UI implement functionality where you can attach a csv file, it would extract the csv content and call import transaction on it.
Now, I would like to modify this functionality in the backend. Do you think the FileUploading concept I added Is of any use here?
They store the csv files persistently, that could be something we implement too. What your thoughts on whether to fully integrate the file uploading concept? what functionality can we drop, what should be keep, and what do we need to add?

structure your answer the following way:

* no code excerpts
* just function name

First talk about the relevancy of the file uploading concept, then explain how we can use it as a sync between import transaction and file uploading.
