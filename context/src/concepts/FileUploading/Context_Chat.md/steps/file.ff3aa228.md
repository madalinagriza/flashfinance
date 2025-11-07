---
timestamp: 'Wed Nov 05 2025 20:29:39 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_202939.029af18c.md]]'
content_id: ff3aa228e27571b5a6deb309c23b06463eda23b36fd13417b4cc743e669ed9bc
---

# file: src\concepts\FileUploading\FileUploadingConcept.ts

```typescript
/**
 * State for a File, representing its metadata in the database.
 *
 * a set of `File`s with
 *   an `owner` User
 *   a `filename` String
 *   a `storagePath` String (e.g., the path/key of the object in the GCS bucket)
 *   a `status` String (values: "pending", "uploaded")
 *   a `purpose` String (e.g., "transaction-import")
 */
interface FileState {
  _id: File;
  owner: User;
  filename: string;
  storagePath: string;
  status: "pending" | "uploaded";
  purpose: string;
}
```

```typescript
  // === ACTIONS ===

  /**
   * requestUploadURL (owner: User, filename: String, purpose: String): (file: File, uploadURL: String)
   *
   * **requires**: true.
   * **effects**: creates a new File `f` with status `pending`, owner `owner`, filename `filename`, and purpose `purpose`;
   *             generates a unique `storagePath` for `f`; generates a presigned GCS upload URL
   *             corresponding to that path; returns the new file's ID and the URL.
   */
  async requestUploadURL(
    { owner, filename, purpose }: { owner: User; filename: string; purpose: string },
  ): Promise<{ file: File; uploadURL: string } | { error: string }> {
    const newFileId = freshID() as File;
    const storagePath = `${newFileId}/${filename}`; // Use the unique ID to prevent path collisions

    const newFile: FileState = {
      _id: newFileId,
      owner,
      filename,
      storagePath,
      status: "pending",
      purpose,
    };

    try {
      const extension = extname(filename);
      const inferredContentType = contentType(extension) ||
        "application/octet-stream";
      const options = {
        version: "v4" as const,
        action: "write" as const,
        expires: Date.now() + 15 * 60 * 1000, // URL is valid for 15 minutes
        contentType: inferredContentType,
      };

      const [url] = await this.storage.bucket(this.bucketName).file(storagePath)
        .getSignedUrl(options);

      await this.files.insertOne(newFile);

      return { file: newFileId, uploadURL: url };
    } catch (e) {
      console.error("FileUploadingConcept: Error generating upload URL:", e);
      return { error: "Failed to generate an upload URL." };
    }
  }
```

```typescript
  // === QUERIES ===

  /**
   * _getFileContent (file: File): (content: String)
   *
   * **requires**: a File `f` exists and its status is "uploaded".
   * **effects**: reads the content of `f` from the storage service and returns it.
   */
  async _getFileContent(
    { file }: { file: File },
  ): Promise<{ content: string }[]> {
    const fileRecord = await this.files.findOne({ _id: file });

    if (!fileRecord) {
      return [];
    }

    if (fileRecord.status !== "uploaded") {
      // This is an invalid state to request content from and an exceptional case.
      throw new Error(`File ${file} has not been confirmed as uploaded.`);
    }

    try {
      const [contents] = await this.storage
        .bucket(this.bucketName)
        .file(fileRecord.storagePath)
        .download();

      return [{ content: contents.toString("utf-8") }];
    } catch (e) {
      console.error(
        `FileUploadingConcept: Failed to download file ${file} from GCS path ${fileRecord.storagePath}:`,
        e,
      );
      // This indicates a data inconsistency between our DB and GCS, which is an exceptional error.
      throw new Error(
        "Failed to retrieve file content from storage. The file may be missing or corrupted.",
      );
    }
  }
```
