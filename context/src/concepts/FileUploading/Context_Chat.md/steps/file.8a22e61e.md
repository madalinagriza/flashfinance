---
timestamp: 'Wed Nov 05 2025 20:37:54 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_203754.b2030860.md]]'
content_id: 8a22e61e8425f6b21d577d9bf1376cdbde54a0dc965dbe27bac99b41643491e8
---

# file: src\concepts\FileUploading\FileUploadingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Storage } from "npm:@google-cloud/storage";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { extname } from "jsr:@std/path/extname";
import { contentType } from "jsr:@std/media-types/content-type";

// Generic types used by this concept
type User = ID;
type File = ID;

// Prefix for MongoDB collections to avoid name collisions
const PREFIX = "FileUploading" + ".";

/**
 * State for a File, representing its metadata in the database.
 *
 * a set of `File`s with
 *   an `owner` User
 *   a `filename` String
 *   a `storagePath` String (e.g., the path/key of the object in the GCS bucket)
 *   a `status` String (values: "pending", "uploaded")
 *   a `purpose` String (e.g., "transaction-import", "profile-picture") // ADDED
 */
interface FileState {
  _id: File;
  owner: User;
  filename: string;
  storagePath: string;
  status: "pending" | "uploaded";
  purpose: string; // ADDED
}

/**
 * @concept FileUploading
 * @purpose To manage the lifecycle and metadata of user-owned files stored in an external cloud service.
 */
export default class FileUploadingConcept {
  public readonly files: Collection<FileState>;
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(private readonly db: Db) {
    this.files = this.db.collection<FileState>(PREFIX + "files");

    // Initialize Google Cloud Storage client from environment variables
    this.bucketName = Deno.env.get("FILE_UPLOADING_GCS_BUCKET_NAME")!;
    const projectId = Deno.env.get("FILE_UPLOADING_GCS_PROJECT_ID");
    // The private key from the JSON file often has newlines that need to be parsed correctly
    const privateKey = Deno.env.get("FILE_UPLOADING_GCS_PRIVATE_KEY")?.replace(
      /\\n/g,
      "\n",
    );
    const clientEmail = Deno.env.get("FILE_UPLOADING_GCS_CLIENT_EMAIL");

    if (!this.bucketName || !projectId || !privateKey || !clientEmail) {
      throw new Error(
        "Missing required GCS environment variables for FileUploadingConcept. Please check your .env file.",
      );
    }

    this.storage = new Storage({
      projectId,
      credentials: {
        private_key: privateKey,
        client_email: clientEmail,
      },
    });
  }

  // === ACTIONS ===

  /**
   * requestUploadURL (owner: User, filename: String, purpose: String): (file: File, uploadURL: String) // MODIFIED
   *
   * **requires**: true.
   * **effects**: creates a new File `f` with status `pending`, owner `owner`, filename `filename`, and `purpose`;
   *             generates a unique `storagePath` for `f`; generates a presigned GCS upload URL
   *             corresponding to that path; returns the new file's ID and the URL.
   */
  async requestUploadURL(
    { owner, filename, purpose }: { owner: User; filename: string; purpose: string }, // MODIFIED
  ): Promise<{ file: File; uploadURL: string } | { error: string }> {
    const newFileId = freshID() as File;
    const storagePath = `${newFileId}/${filename}`; // Use the unique ID to prevent path collisions

    const newFile: FileState = {
      _id: newFileId,
      owner,
      filename,
      storagePath,
      status: "pending",
      purpose, // ADDED
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

  /**
   * confirmUpload (file: File): (file: File) | (error: String)
   *
   * **requires**: a File `f` exists and its status is "pending".
   * **effects**: sets the status of `f` to "uploaded". If conditions not met, returns an error.
   */
  async confirmUpload(
    { file }: { file: File },
  ): Promise<{ file: File } | { error: string }> {
    const fileRecord = await this.files.findOne({ _id: file });

    if (!fileRecord) {
      return { error: "File not found." };
    }
    if (fileRecord.status !== "pending") {
      return {
        error:
          `File is not in 'pending' state. Current state: ${fileRecord.status}`,
      };
    }

    const result = await this.files.updateOne({ _id: file }, {
      $set: { status: "uploaded" },
    });

    if (result.modifiedCount === 0) {
      return { error: "Failed to confirm upload." };
    }

    return { file };
  }

  // === QUERIES ===

  /**
   * _getOwner (file: File): (owner: User)
   *
   * **requires**: the given `file` exists.
   * **effects**: returns the owner of the file.
   */
  async _getOwner({ file }: { file: File }): Promise<{ owner: User }[]> {
    const fileRecord = await this.files.findOne({ _id: file }, {
      projection: { owner: 1 },
    });
    return fileRecord ? [{ owner: fileRecord.owner }] : [];
  }
  
  /**
   * _getPurpose (file: File): (purpose: String) // ADDED
   *
   * **requires**: the given `file` exists.
   * **effects**: returns the purpose of the file.
   */
  async _getPurpose({ file }: { file: File }): Promise<{ purpose: string }[]> {
    const fileRecord = await this.files.findOne({ _id: file }, {
      projection: { purpose: 1 },
    });
    return fileRecord ? [{ purpose: fileRecord.purpose }] : [];
  }


  /**
   * _getFilename (file: File): (filename: String)
   *
   * **requires**: the given `file` exists.
   * **effects**: returns the filename of the file.
   */
  async _getFilename(
    { file }: { file: File },
  ): Promise<{ filename: string }[]> {
    const fileRecord = await this.files.findOne({ _id: file }, {
      projection: { filename: 1 },
    });
    return fileRecord ? [{ filename: fileRecord.filename }] : [];
  }

  /**
   * _getFilesByOwner (owner: User): (file: File, filename: String)
   *
   * **requires**: the given `owner` exists.
   * **effects**: returns all files owned by the user with status "uploaded", along with their filenames.
   */
  async _getFilesByOwner(
    { owner }: { owner: User },
  ): Promise<{ file: File; filename: string }[]> {
    const userFiles = await this.files
      .find(
        { owner, status: "uploaded" },
        { projection: { _id: 1, filename: 1 } },
      )
      .toArray();

    return userFiles.map((doc) => ({
      file: doc._id,
      filename: doc.filename,
    }));
  }
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
}
```

### The Synchronization Rule

With the modified `FileUploadingConcept`, you can now define a very precise synchronization rule to connect it to the `TransactionConcept`.

```
sync ImportTransactionsOnUpload
when
    FileUploading.confirmUpload ({file})
where
    in FileUploading: _getPurpose ({file}) is {purpose}
    purpose is "transaction-import"
    in FileUploading: _getOwner ({file}) is {owner}
    in FileUploading: _getFileContent ({file}) is {content}
then
    Transaction.import_transactions ({owner_id: owner, fileContent: content})
```

**How this sync works:**

1. **`when`**: It waits for the `FileUploading.confirmUpload` action to succeed and captures the returned `file` ID.
2. **`where`**:
   * It first calls `_getPurpose` to check the file's purpose.
   * It continues **only if** the `purpose` is exactly `"transaction-import"`.
   * It then calls `_getOwner` to get the user who owns the file.
   * Finally, it calls `_getFileContent` to download the CSV data as a string.
3. **`then`**: It uses the `owner` and `content` variables gathered in the `where` clause to call `Transaction.import_transactions`, completing the automated workflow.
