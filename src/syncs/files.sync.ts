import { actions, Frames, Sync } from "@engine";
import { FileUploading, Requesting, Sessioning } from "@concepts";

/**
 * This file contains synchronizations for the FileUploading concept,
 * enabling users to request upload URLs, confirm uploads, and list their files
 * through the Requesting API.
 *
 * The syncs follow a standard request/response pattern for API endpoints:
 *
 * 1.  **Request Sync (`...Request`)**:
 *     - Catches an incoming `Requesting.request` for a specific path.
 *     - Authenticates the user via their session.
 *     - Triggers the corresponding action in the `FileUploading` concept.
 *
 * 2.  **Success Response Sync (`...ResponseSuccess`)**:
 *     - Listens for the successful completion of the `FileUploading` action.
 *     - Responds to the original request with the successful result.
 *
 * 3.  **Error Response Sync (`...ResponseError`)**:
 *     - Listens for an error returned by the `FileUploading` action.
 *     - Responds to the original request with the error message.
 *
 * Example successful flow for `requestUploadURL`:
 *
 *   a. Client POSTs to `/api/FileUploading/requestUploadURL` with `{ session, filename }`.
 *   b. `RequestUploadURLRequest` sync fires.
 *      - It validates the session and gets the user ID.
 *      - It calls `FileUploading.requestUploadURL({ owner: user, filename })`.
 *   c. `FileUploadingConcept` generates a presigned URL and returns `{ file, uploadURL }`.
 *   d. `RequestUploadURLResponseSuccess` sync fires.
 *      - It sees the successful result from `FileUploading.requestUploadURL`.
 *      - It calls `Requesting.respond` with the `{ file, uploadURL }` payload.
 *   e. Client receives the successful JSON response.
 */

//-- Request a presigned URL for uploading a file --//
export const RequestUploadURLRequest: Sync = (
  { request, session, filename, user },
) => ({
  when: actions([Requesting.request, {
    path: "/FileUploading/requestUploadURL",
    session,
    filename,
  }, { request }]),
  where: (frames) => frames.query(Sessioning._getUser, { session }, { user }),
  then: actions([FileUploading.requestUploadURL, { owner: user, filename }]),
});

export const RequestUploadURLResponseSuccess: Sync = (
  { request, file, uploadURL },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/FileUploading/requestUploadURL" },
      { request },
    ],
    [FileUploading.requestUploadURL, {}, { file, uploadURL }],
  ),
  then: actions([Requesting.respond, { request, file, uploadURL }]),
});

export const RequestUploadURLResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/FileUploading/requestUploadURL" },
      { request },
    ],
    [FileUploading.requestUploadURL, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- Confirm a file has been successfully uploaded --//
export const ConfirmUploadRequest: Sync = (
  { request, session, file, user, owner },
) => ({
  when: actions([Requesting.request, {
    path: "/FileUploading/confirmUpload",
    session,
    file,
  }, { request }]),
  // Authorize: ensure the user confirming the upload is the file's owner.
  where: async (frames) => {
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    frames = await frames.query(FileUploading._getOwner, { file }, { owner });
    return frames.filter(($) => $[user] === $[owner]);
  },
  then: actions([FileUploading.confirmUpload, { file }]),
});

export const ConfirmUploadResponseSuccess: Sync = ({ request, file }) => ({
  when: actions(
    [Requesting.request, { path: "/FileUploading/confirmUpload" }, { request }],
    [FileUploading.confirmUpload, {}, { file }],
  ),
  then: actions([Requesting.respond, { request, file }]),
});

export const ConfirmUploadResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/FileUploading/confirmUpload" }, { request }],
    [FileUploading.confirmUpload, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- List all files owned by the current user --//
export const ListMyFilesRequest: Sync = (
  { request, session, user, file, filename, results },
) => ({
  when: actions([Requesting.request, {
    path: "/FileUploading/myFiles",
    session,
  }, {
    request,
  }]),
  where: async (frames) => {
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // If the session is invalid, respond with an empty list.
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    frames = await frames.query(
      FileUploading._getFilesByOwner,
      { owner: user },
      { file, filename },
    );

    // If the user has no files, respond with an empty list.
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [results]: [] });
    }

    return frames.collectAs([file, filename], results);
  },
  then: actions([Requesting.respond, { request, results }]),
});
