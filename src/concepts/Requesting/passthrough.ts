/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Feel free to delete these example inclusions
  "/api/LikertSurvey/_getSurveyQuestions": "this is a public query",
  "/api/LikertSurvey/_getSurveyResponses": "responses are public",
  "/api/LikertSurvey/_getRespondentAnswers": "answers are visible",
  "/api/LikertSurvey/submitResponse": "allow anyone to submit response",
  "/api/LikertSurvey/updateResponse": "allow anyone to update their response",
  "/api/UserAuthentication/login": "anyone can login",
  "/api/UserAuthentication/register": "anyone can register",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",
  // Actions that shouldn't be available to the user in any way
  "/api/Category/makeCategoryKey",
  "/api/Category/makeCategoryMetricKey",
  "/api/Category/ensureMetricDocument",
  "/api/Category/deleteMetricsForCategory",
  "/api/Category/daysInPeriod",
  " /api/Label/makeTxUserId",
  "/api/Label/commitSingleLabel",
  "/api/Label/buildHistorySnapshot",
  "/api/Label/buildSuggestPrompt",
  "/api/Label/parseFindSuggestResponse",
  "/api/Transaction/makeTxMongoId",
  "/api/Transaction/parse_csv_info",
  "/api/Transaction/bulk_mark_labeled",
  "/api/Label/makeTxUserId",
  "/api/User/all",
  "/api/Category/listTransactions",
  "/api/Label/getTxInfo",
  "/api/Label/hasAnyLabelsForCategory", // depends
  "/api/Category/getCategoryNamesAndOwners",
  "/api/Category/bulk_add_transaction",
  "/api/Sessioning/create",
  "/api/Sessioning/delete",
  "/api/Sessioning/_getUser",
  "/api/User/register", //"NOT DONE" //"NOT CHECKED"
  "/api/User/authenticate", //"NOT DONE" //"NOT CHECKED"
  "/api/User/deactivate", //"NOT DONE" //"NOT CHECKED"
  "/api/User/changePassword", //"NOT DONE" //"NOT CHECKED"

  // Not used
  "/api/Category/getMetricStats",
  "/api/Label/getStagedLabels",
  "/api/Label/get_category_tx",
  "/api/Label/get_tx_in_trash",
  "/api/Category/getCategoryById",
  "/api/Category/getCategoryByName",
  "/api/Category/listMetrics",
  "/api/Label/getCategoryHistory", //"NOT DONE" //"NOT CHECKED"
  "/api/Label/all", //"NOT DONE" //"NOT CHECKED"
  "/api/Label/getLabel",

  // Work in progess/not finished
  "/api/User/is_active",
  "/api/User/reactivate",

  // Getters
  "/api/Category/getCategoryNameById", //"NOT CHECKED"
  "/api/Category/getCategoriesFromOwner", //"NOT CHECKED"
  "/api/Category/getMetric", //"NOT CHECKED"
  "/api/Transaction/getTransaction", //"NOT DONE" //"NOT CHECKED"
  "/api/Transaction/list_all", //"NOT DONE" //"NOT CHECKED"
  "/api/Transaction/get_unlabeled_transactions", //"NOT DONE" //"NOT CHECKED"
  "/api/Transaction/get_labeled_transactions", //"NOT DONE" //"NOT CHECKED"
  "/api/Transaction/getTxInfo", //"NOT DONE" //"NOT CHECKED"
  "/api/UserAuthentication/_getUserByUsername", //"NOT DONE" //"NOT CHECKED"
  "/api/UserAuthentication/_getUsername", //"NOT DONE" //"NOT CHECKED"

  // Direct Actions
  "/api/Category/create", //"NOT CHECKED"
  "/api/Category/rename", //"NOT CHECKED"
  "/api/Category/updateTransaction", // "NOT CHECKED"
  "/api/Category/moveTransactionToTrash", //"NOT CHECKED"
  "/api/Category/delete", //"NOT CHECKED"
  "/api/Label/stage", //"NOT CHECKED"
  "/api/Label/discardUnstagedToTrash", //"NOT CHECKED"// TO DO: expose as a command in UI
  "/api/Label/finalize", //"NOT CHECKED"
  "/api/Label/suggest", //"NOT CHECKED"
  "/api/Label/cancelSession", //"NOT CHECKED" // TO DO: care-i dif între discard, cancel și finalize?
  "/api/Label/removeCommittedLabel", //"NOT CHECKED"
  "/api/Transaction/import_transactions", //"NOT DONE" //"NOT CHECKED"
  "/api/UserAuthentication/changePassword", //"NOT CHECKED"

  // Indirect Actions
  "/api/Category/addTransaction", //"NOT DONE" //"NOT CHECKED"
  "/api/Category/removeTransaction", //"NOT DONE" //"NOT CHECKED"
  "/api/Transaction/mark_labeled", //"NOT DONE" //"NOT CHECKED"
  "/api/Transaction/add_transaction", //"NOT DONE" //"NOT CHECKED"
  "/api/Transaction/parse_info", //"NOT DONE" //"NOT CHECKED"
  "/api/Label/update", //"NOT DONE" //"NOT CHECKED"
];
