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