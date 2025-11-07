[@concept-background](../../tools/concept-background.md)

[@FileUploading](FileUploading.md)

# implement: FileUploading

Utilize the GCS library:

```
import { Storage } from "npm:@google-cloud/storage";
```

Prefix any environment variables needed with `FILE_UPLOADING_` to make it clear that they pertain to this concept: these can be the bucket name, any credentials needed, etc. Please also describe at the end how to set these up, particularly around credentials.
# response:

An implementation of the `FileUploading` concept is provided below, along with instructions for setting up the necessary Google Cloud Storage (GCS) environment.

# file: src/concepts/FileUploading/FileUploadingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Storage } from "npm:@google-cloud/storage";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

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
    const privateKey = Deno.env.get("FILE_UPLOADING_GCS_PRIVATE_KEY")?.replace(/\\n/g, "\n");
    const clientEmail = Deno.env.get("FILE_UPLOADING_GCS_CLIENT_EMAIL");

    if (!this.bucketName || !projectId || !privateKey || !clientEmail) {
      throw new Error("Missing required GCS environment variables for FileUploadingConcept. Please check your .env file.");
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
  async requestUploadURL({ owner, filename }: { owner: User; filename: string }): Promise<{ file: File; uploadURL: string } | { error: string }> {
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
      const options = {
        version: "v4" as const,
        action: "write" as const,
        expires: Date.now() + 15 * 60 * 1000, // URL is valid for 15 minutes
        contentType: "application/octet-stream",
      };

      const [url] = await this.storage.bucket(this.bucketName).file(storagePath).getSignedUrl(options);

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
  async confirmUpload({ file }: { file: File }): Promise<Empty | { error: string }> {
    const fileRecord = await this.files.findOne({ _id: file });

    if (!fileRecord) {
      return { error: "File not found." };
    }
    if (fileRecord.status !== "pending") {
      return { error: `File is not in 'pending' state. Current state: ${fileRecord.status}` };
    }

    const result = await this.files.updateOne({ _id: file }, { $set: { status: "uploaded" } });

    if (result.modifiedCount === 0) {
      return { error: "Failed to confirm upload." };
    }

    return {};
  }

  /**
   * delete (file: File): () | (error: String)
   *
   * **requires**: the given `file` exists.
   * **effects**: removes the file record `f` from the state. Additionally, it triggers the
   *             deletion of the corresponding object from the external GCS bucket.
   */
  async delete({ file }: { file: File }): Promise<Empty | { error: string }> {
    const fileRecord = await this.files.findOne({ _id: file });

    if (!fileRecord) {
      return { error: "File not found." };
    }

    try {
      // First, delete the object from GCS
      await this.storage.bucket(this.bucketName).file(fileRecord.storagePath).delete();
      // Then, delete the record from the database
      await this.files.deleteOne({ _id: file });
      return {};
    } catch (e) {
      console.error(`FileUploadingConcept: Failed to delete file ${file} from GCS or DB:`, e);
      return { error: "An error occurred during file deletion." };
    }
  }

  // === QUERIES ===

  /**
   * _getOwner (file: File): (owner: User)
   *
   * **requires**: the given `file` exists.
   * **effects**: returns the owner of the file.
   */
  async _getOwner({ file }: { file: File }): Promise<{ owner: User }[]> {
    const fileRecord = await this.files.findOne({ _id: file }, { projection: { owner: 1 } });
    return fileRecord ? [{ owner: fileRecord.owner }] : [];
  }

  /**
   * _getDownloadURL (file: File): (downloadURL: String)
   *
   * **requires**: the given `file` exists and its status is "uploaded".
   * **effects**: generates a short-lived, presigned GCS download URL for the file `f` and returns it.
   */
  async _getDownloadURL({ file }: { file: File }): Promise<{ downloadURL: string }[]> {
    const fileRecord = await this.files.findOne({ _id: file, status: "uploaded" });

    if (!fileRecord) {
      return [];
    }

    try {
      const options = {
        version: "v4" as const,
        action: "read" as const,
        expires: Date.now() + 15 * 60 * 1000, // URL is valid for 15 minutes
      };
      const [url] = await this.storage.bucket(this.bucketName).file(fileRecord.storagePath).getSignedUrl(options);
      return [{ downloadURL: url }];
    } catch (e) {
      console.error(`FileUploadingConcept: Failed to generate download URL for file ${file}:`, e);
      return [];
    }
  }

  /**
   * _getFilesByOwner (owner: User): (file: File, filename: String)
   *
   * **requires**: the given `owner` exists.
   * **effects**: returns all files owned by the user with status "uploaded", along with their filenames.
   */
  async _getFilesByOwner({ owner }: { owner: User }): Promise<{ file: File; filename: string }[]> {
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
}
```

# Environment Setup for Google Cloud Storage

To use the `FileUploadingConcept`, you must configure a Google Cloud Storage bucket and provide the necessary credentials to the application via environment variables.

### 1. Create a Google Cloud Project & Bucket

1.  If you don't have one, create a new project in the [Google Cloud Console](https://console.cloud.google.com/).
2.  Enable the **Cloud Storage API** for your project.
3.  Navigate to **Cloud Storage > Buckets** and create a new bucket. Make a note of its name.

### 2. Create a Service Account

A service account is a special type of Google account intended to represent a non-human user that needs to authenticate and be authorized to access data in Google APIs.

1.  In your project, navigate to **IAM & Admin > Service Accounts**.
2.  Click **Create Service Account**.
3.  Give it a name (e.g., `file-uploading-service`).
4.  Grant it the **Storage Object Admin** (`roles/storage.objectAdmin`) role. This allows the service to create, read, and delete objects in your buckets.
5.  Click **Done**.

### 3. Generate a Service Account Key

1.  Find the service account you just created in the list.
2.  Click on the three dots under "Actions" and select **Manage keys**.
3.  Click **Add Key > Create new key**.
4.  Choose **JSON** as the key type and click **Create**. A JSON file containing your credentials will be downloaded.

**Warning:** Treat this JSON key file like a password. Do not commit it to version control.

### 4. Set Environment Variables

Create a `.env` file in the root of your project and add the following variables. Populate them with the values from your setup and the downloaded JSON key file.

```dotenv
# The name of the GCS bucket you created
FILE_UPLOADING_GCS_BUCKET_NAME="your-bucket-name-here"

# Your Google Cloud project ID
FILE_UPLOADING_GCS_PROJECT_ID="your-gcp-project-id"

# The "client_email" value from the downloaded JSON key file
FILE_UPLOADING_GCS_CLIENT_EMAIL="your-service-account-email@your-project.iam.gserviceaccount.com"

# The "private_key" value from the downloaded JSON key file.
# It must be enclosed in double quotes to preserve the newline characters.
FILE_UPLOADING_GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyContentHere\n-----END PRIVATE KEY-----\n"
```

The application is now configured to securely interact with your Google Cloud Storage bucket.