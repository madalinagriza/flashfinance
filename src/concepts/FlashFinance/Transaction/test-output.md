# Output Summary by AI

## Operational Principles (from `test-parsing.ts`)
These tests verify the **core functions** of `TransactionStore`: importing valid transactions and managing labeling actions.

1. **CSV Import of Outflows** — confirms that `import_transactions` correctly reads CSVs, filters out inflows, and stores only valid debit transactions.  
   Ensures all imported records have valid structure and are retrievable with `list_all()`.

2. **Marking Transactions as Labeled** — validates that users can label their own transactions while attempts to mark non-existent, cross-owner, or already labeled transactions are rejected.  
   Confirms proper ownership checks and idempotent labeling behavior.

Together, these show the normal “happy path” workflow: clean imports, proper filtering, and consistent user-level updates.

---

## Interesting Scenarios (from `test-parsing-edge-cases.ts`)
Edge-case tests ensure `TransactionStore` handles messy or incomplete CSVs gracefully:

1. **Empty or Headers-Only CSVs** — no transactions imported, no crashes.  
2. **Inflows-Only or Zero/Negative Amounts** — skipped automatically, preserving data integrity.  
3. **Mixed Valid/Invalid Rows** — malformed dates or missing data are skipped; valid rows still import successfully.  
4. **Missing Amount Columns** — ensures incomplete records are rejected.  
5. **Falsy Owner ID** — rejects imports without a valid user, enforcing ownership invariants.



# Output
## Test Parsing of Sample Data & Mark_Labeled Actions
Check file:///C:/Users/mgriz/flashfinance/src/concepts/FlashFinance/Transaction/test-actions/test-parsing.ts
running 2 tests from ./src/concepts/FlashFinance/Transaction/test-actions/test-parsing.ts
TransactionStore: CSV import parses and stores outflow transactions correctly ...
------- output -------

--- Test CSV Import for Owner: 7634b657-b6b1-43c8-9133-f098dfcab080 ---
Reading CSV from: ./sample/sample-spendings.csv
CSV content read successfully.
Calling import_transactions...
Skipping value (2500) from credit-identified column (assumed inflow).
Skipping value (-12.5) from credit-identified column (assumed inflow).
Skipping value (2400) from credit-identified column (assumed inflow).
Skipping negative value (-35) from debit-identified column (assumed inflow).
Skipping value (350) from credit-identified column (assumed inflow).
Successfully imported 5 transactions.
import_transactions returned 5 transactions.
   ✅ Verified: Correct number of outflow transactions (5) imported.
   ✅ Verified: list_all() retrieves all imported transactions.
   Verifying transaction 1: Starbucks Inc. - 4.25
      ✅ Transaction 1 structural assertions passed.
   Verifying transaction 2: Whole Foods Market - 52.3
      ✅ Transaction 2 structural assertions passed.
   Verifying transaction 3: Electric Company Payment - 150
      ✅ Transaction 3 structural assertions passed.
   Verifying transaction 4: ATM Withdrawal - 60
      ✅ Transaction 4 structural assertions passed.
   Verifying transaction 5: Netflix Subscription - 15.99
      ✅ Transaction 5 structural assertions passed.
   ✅ Verified: Inflow transactions were successfully skipped, and only outflows stored.
Database client closed and test database dropped.
----- output end -----
TransactionStore: CSV import parses and stores outflow transactions correctly ... ok (726ms)
TransactionStore: mark_labeled action behaves correctly ...
------- output -------

--- Test mark_labeled for Owner: 62c933ec-c370-4ba0-a397-3a271e576aeb ---
Reading CSV from: ./sample/sample-spendings.csv
CSV content read successfully.
Calling import_transactions...
Skipping value (2500) from credit-identified column (assumed inflow).
Skipping value (-12.5) from credit-identified column (assumed inflow).
Skipping value (2400) from credit-identified column (assumed inflow).
Skipping negative value (-35) from debit-identified column (assumed inflow).
Skipping value (350) from credit-identified column (assumed inflow).
Successfully imported 5 transactions.
   ✅ Imported 5 transactions successfully.
   ✅ All imported transactions are verified to be initially UNLABELED.
Attempting to mark transaction cb66ec8f-53b5-4133-a8aa-c7b4a24e4279 as LABELED.
   ✅ mark_labeled for cb66ec8f-53b5-4133-a8aa-c7b4a24e4279 successful.
   ✅ Verified: Transaction cb66ec8f-53b5-4133-a8aa-c7b4a24e4279 is now LABELED.
Attempting to mark transaction 9643efcf-d61c-4184-a292-35a43a3b09c9 as LABELED.
   ✅ mark_labeled for 9643efcf-d61c-4184-a292-35a43a3b09c9 successful.
   ✅ Verified: Transaction 9643efcf-d61c-4184-a292-35a43a3b09c9 is now LABELED.
Attempting to mark non-existent transaction ID: f02f654e-12aa-4118-9dd7-c2738269e688.
   ✅ Verified: Cannot mark a non-existent transaction.
Attempting to mark transaction 58bec232-7797-42f7-85ff-23088654dc4e with wrong owner ID: 31a43f51-cc8c-4156-92f2-62d6e22658e3.
   ✅ Verified: Cannot mark a transaction owned by another user.
   ✅ Verified: Transaction 58bec232-7797-42f7-85ff-23088654dc4e status remained UNLABELED.
Attempting to re-mark an already labeled transaction ID: cb66ec8f-53b5-4133-a8aa-c7b4a24e4279.
   ✅ Verified: Cannot re-mark an already labeled transaction.
Database client closed and test database dropped.
----- output end -----
TransactionStore: mark_labeled action behaves correctly ... ok (1s)

ok | 2 passed | 0 failed (1s)


## Alternative Scenarios: Testing different kinds of csv formats: invalid, empty, with skipped fields

PS C:\Users\mgriz\flashfinance> deno test -A src/concepts/FlashFinance/Transaction/test-actions/test-parsing-edge-cases.ts
Check file:///C:/Users/mgriz/flashfinance/src/concepts/FlashFinance/Transaction/test-actions/test-parsing-edge-cases.ts
running 7 tests from ./src/concepts/FlashFinance/Transaction/test-actions/test-parsing-edge-cases.ts
TransactionStore: import_transactions handles empty CSV content ...
------- output -------

--- Test: Empty CSV import for Owner: ad6b34d0-faf1-44dd-8162-9b48019e586e ---
No valid transactions parsed from CSV. Nothing to import.
   ✅ Verified: Empty CSV resulted in no imported transactions.
----- output end -----
TransactionStore: import_transactions handles empty CSV content ... ok (686ms)
TransactionStore: import_transactions handles CSV with only headers ...
------- output -------

--- Test: Headers-only CSV import for Owner: bfa87925-d98b-4636-8b93-e9cc5d1c9ffe ---
No valid transactions parsed from CSV. Nothing to import.
   ✅ Verified: Headers-only CSV resulted in no imported transactions.
----- output end -----
TransactionStore: import_transactions handles CSV with only headers ... ok (530ms)
TransactionStore: import_transactions skips CSV rows with only inflows ...
------- output -------

--- Test: Inflows-only CSV import for Owner: 1eb9d291-3609-4db0-b29b-63af5feb452e ---
Skipping value (100) from credit-identified column (assumed inflow).
Skipping negative value (-50) from debit-identified column (assumed inflow).
Skipping value (2500) from credit-identified column (assumed inflow).
Skipping negative value (-75) from debit-identified column (assumed inflow).
No valid transactions parsed from CSV. Nothing to import.
   ✅ Verified: Inflow transactions were successfully skipped.
----- output end -----
TransactionStore: import_transactions skips CSV rows with only inflows ... ok (497ms)
TransactionStore: import_transactions skips transactions with zero or negative outflow amounts ...
------- output -------

--- Test: Zero/Negative Outflow CSV import for Owner: 712a66a4-cd6c-4336-8c1e-bdbefff7b50c ---
Skipping negative value (0) from debit-identified column (assumed inflow).
Skipping negative value (-15) from debit-identified column (assumed inflow).
Skipping negative value (0) from debit-identified column (assumed inflow).
No valid transactions parsed from CSV. Nothing to import.
   ✅ Verified: Transactions with zero or negative amounts were skipped.
----- output end -----
TransactionStore: import_transactions skips transactions with zero or negative outflow amounts ... ok (586ms)        
TransactionStore: import_transactions handles mixed valid and invalid rows from testsample.csv ...
------- output -------

--- Test: Mixed Valid/Invalid CSV import for Owner: 93319a35-5791-495d-a54a-7bcb38180452 ---
Invalid date format for row: 'INVALID_DATE'. Using default Epoch date.
Date column not found or missing value for a row. Using default Epoch date.
Skipping value (-500) from credit-identified column (assumed inflow).
Skipping value (15) from credit-identified column (assumed inflow).
Skipping value (75) from credit-identified column (assumed inflow).
Skipping value (3000) from credit-identified column (assumed inflow).
Successfully imported 7 transactions.
   ✅ Verified: Correct number of outflow transactions (7) imported from mixed CSV.
   ✅ Verified: All valid transactions from mixed CSV imported correctly.
----- output end -----
TransactionStore: import_transactions handles mixed valid and invalid rows from testsample.csv ... ok (790ms)        
TransactionStore: import_transactions skips rows when essential amount columns are missing ...
------- output -------

--- Test: Missing Amount Column CSV import for Owner: acac0a41-aeb2-4dda-bde4-ba5ce66736e5 ---
Amount information not found or missing for a row. Skipping.
No valid transactions parsed from CSV. Nothing to import.
Amount information not found or missing for a row. Skipping.
   ✅ Verified: Transactions were skipped due to missing amount column.
----- output end -----
TransactionStore: import_transactions skips rows when essential amount columns are missing ... ok (617ms)
TransactionStore: import_transactions rejects falsy owner_id ...
------- output -------

--- Test: Falsy Owner ID for import_transactions ---
   ✅ Verified: import_transactions rejects null owner_id.
   ✅ Verified: import_transactions rejects undefined owner_id.
----- output end -----
TransactionStore: import_transactions rejects falsy owner_id ... ok (653ms)

ok | 7 passed | 0 failed (4s)
