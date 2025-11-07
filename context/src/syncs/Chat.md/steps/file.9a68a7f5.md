---
timestamp: 'Wed Nov 05 2025 20:51:40 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_205140.8c1399d7.md]]'
content_id: 9a68a7f5234fa19101b6fc02868735832f1a71076e1002b025ea27675580efd6
---

# file: src\syncs\transactions.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { FileUploading, Transaction } from "@concepts";

/**
 * This synchronization creates a pipeline between the FileUploading and Transaction concepts.
 * When a file upload is successfully confirmed, this sync automatically triggers the
 * transaction import process using the content of that file.
 */
export const ImportTransactionsOnUpload: Sync = (
  { file, owner, content },
) => ({
  // WHEN a file upload is successfully confirmed...
  when: actions(
    [FileUploading.confirmUpload, {}, { file }],
  ),
  // WHERE we can retrieve the file's owner and content...
  where: async (frames) => {
    frames = await frames.query(FileUploading._getOwner, { file }, { owner });
    frames = await frames.query(
      FileUploading._getFileContent,
      { file },
      { content },
    );
    return frames;
  },
  // THEN import the transactions from the file content for that owner.
  then: actions(
    [Transaction.import_transactions, { owner_id: owner, fileContent: content }],
  ),
});
```
