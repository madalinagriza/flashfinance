# Missing API Endpoints

The following public-facing API endpoints were found in the implementation but are not documented in `design/tools/api-extraction-from-code.md`.

## Category Concept (/api/Category)
- **/api/Category/getCategoryNameById**: Retrieves the name of a single category.
- **/api/Category/getCategoriesFromOwner**: Retrieves all category IDs belonging to a specific owner.
- **/api/Category/getMetricStats**: Computes and returns statistics (total, count, average) for a category over a given period.

## Label Concept (/api/Label)
- **/api/Label/getLabel**: Retrieves a single committed label.
- **/api/Label/getCategoryHistory**: Retrieves the spending history for a category.
- **/api/Label/get_category_tx**: Retrieves all transaction IDs associated with a specific category.
- **/api/Label/get_tx_in_trash**: Retrieves all transaction IDs that have been moved to the trash.
- **/api/Label/getStagedLabels**: Retrieves all currently staged (uncommitted) labels for a user.
- **/api/Label/hasAnyLabelsForCategory**: Checks if a category is referenced by any labels.
- **/api/Label/suggest**: Provides an AI-powered suggestion for categorizing a transaction.

## Transaction Concept (/api/Transaction)
- **/api/Transaction/getTransaction**: Retrieves a single transaction document.
- **/api/Transaction/get_labeled_transactions**: Retrieves all of a user's transactions that have the status `LABELED`.
- **/api/Transaction/getTxInfo**: Retrieves the parsed information (date, merchant, amount) for a single transaction.

## User Concept (/api/User)
- **/api/User/all**: Retrieves a list of all users.
