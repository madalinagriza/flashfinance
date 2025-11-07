---
timestamp: 'Wed Nov 05 2025 20:33:53 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_203353.09c7997e.md]]'
content_id: 2a286c36822e5b3374ab377c1b418013b63cae7323edf67ff4bdd204d60b3761
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
 */
interface FileState {
  _id: File;
  owner: User;
  filename: string;
  storagePath: string;
  status: "pending" | "uploaded";
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
   * requestUploadURL (owner: User, filename: String): (file: File, uploadURL: String)
   *
   * **requires**: true.
   * **effects**: creates a new File `f` with status `pending`, owner `owner`, and filename `filename`;
   *             generates a unique `storagePath` for `f`; generates a presigned GCS upload URL
   *             corresponding to that path; returns the new file's ID and the URL.
   */
  async requestUploadURL(
    { owner, filename }: { owner: User; filename: string },
  ): Promise<{ file: File; uploadURL: string } | { error: string }> {
    const newFileId = freshID() as File;
    const storagePath = `${newFileId}/${filename}`; // Use the unique ID to prevent path collisions

    const newFile: FileState = {
      _id: newFileId,
      owner,
      filename,
      storagePath,
      status: "pending",
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
   * confirmUpload (file: File): () | (error: String)
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

The `FileUploading` concept is highly relevant and provides a more robust and scalable architecture for handling CSV imports compared to passing raw string content in an API request. It decouples the act of uploading the file from the process of importing the data, which is beneficial for several reasons. It can better handle larger files without request timeouts, provides a persistent record of each imported file for auditing or reprocessing, and aligns with modern cloud architecture where file uploads are often handled by dedicated storage services.

### Proposed Synchronization Flow

We can integrate the two concepts with a synchronization that triggers the transaction import process immediately after a file has been successfully uploaded and confirmed. The user interaction would change to a two-step process, but the backend logic would be seamlessly connected.

The flow would be orchestrated by a new synchronization rule:

* **when**: The synchronization will listen for the `FileUploading.confirmUpload` action to successfully complete. This action serves as the trigger, indicating a new CSV file is ready for processing.
* **where**: Once triggered, the sync will use a query to get the file's `owner` via `FileUploading._getOwner`. It will then use a new, essential query to fetch the actual content of the uploaded file. To ensure this sync only acts on relevant files, it should also filter for files that have a specific `purpose`, such as "transaction-import".
* **then**: With the file's content and its owner identified, the synchronization will then call the `Transaction.import_transactions` action, passing the owner and content to it, completing the import process.

### Functionality Modifications to FileUploading

To make this integration work smoothly, the `FileUploading` concept would need some adjustments.

**Functionality to Keep:**

* `requestUploadURL`: This remains the essential first step for the UI to get a secure, temporary URL for the upload.
* `confirmUpload`: This action is the perfect trigger for our new synchronization.
* `_getOwner`: This query is necessary for the sync to identify who the imported transactions belong to.
* `_getFilesByOwner`: This query is useful for the UI to display a history of a user's uploaded files.

**Functionality to Re-evaluate or Drop:**

* `_getDownloadURL`: This is likely unnecessary for the transaction import use case, as users rarely need to re-download the exact file they just uploaded. It could be dropped to simplify the concept.
* `delete`: This action should be re-evaluated. If the uploaded CSVs are kept for auditing purposes, user-initiated deletion should probably be disabled or restricted to an administrative role.

**Functionality to Add:**

* A new internal query, perhaps named `FileUploading._getFileContent`, is the most critical addition. The synchronization needs this function to read the CSV file's content from storage so it can be passed to the `Transaction` concept.
