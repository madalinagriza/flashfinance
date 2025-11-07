# concept: FileUploading \[User, File]

*   **purpose**: To manage the lifecycle and metadata of user-owned files stored in an external cloud service.
*   **principle**: If a user requests to upload a file, they receive a unique, temporary URL. After they upload their file directly to that URL and confirm the upload with the system, the file is officially recorded as theirs and can be retrieved later via another temporary download URL.
*   **state**:
    *   a set of `File`s with
        *   an `owner` User
        *   a `filename` String
        *   a `storagePath` String (e.g., the path/key of the object in the GCS bucket)
        *   a `status` String (values: "pending", "uploaded")
*   **actions**:
    *   `requestUploadURL (owner: User, filename: String): (file: File, uploadURL: String)`
        *   **requires**: true.
        *   **effects**: creates a new File `f` with status `pending`, owner `owner`, and filename `filename`; generates a unique `storagePath` for `f`; generates a presigned GCS upload URL corresponding to that path; returns the new file's ID and the URL.
    *   `confirmUpload (file: File): ()`
        *   **requires**: a File `f` exists and its status is "pending".
        *   **effects**: sets the status of `f` to "uploaded".
    *   `confirmUpload (file: File): (error: String)`
        *   **requires**: no File `f` exists or its status is not "pending".
        *   **effects**: returns an error message.
    *   `delete (file: File): ()`
        *   **requires**: the given `file` exists.
        *   **effects**: removes the file record `f` from the state. *Additionally, it triggers the deletion of the corresponding object from the external GCS bucket.*
*   **queries**:
    *   `_getOwner (file: File): (owner: User)`
        *   **requires**: the given `file` exists.
        *   **effects**: returns the owner of the file.
    *   `_getDownloadURL (file: File): (downloadURL: String)`
        *   **requires**: the given `file` exists and its status is "uploaded".
        *   **effects**: generates a short-lived, presigned GCS download URL for the file `f` and returns it.
    *   `_getFilesByOwner (owner: User): (file: File, filename: String)`
        *   **requires**: the given `owner` exists.
        *   **effects**: returns all files owned by the user with status "uploaded", along with their filenames.