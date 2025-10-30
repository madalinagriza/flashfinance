# Output Summary by AI
## Operational Principle Tests (from `test-op-simple.ts`)
These tests validate the fundamental **UserStore** actions and their invariants:
1. **Register & All** — verifies that users can be registered with unique emails, appear correctly in `all()`, and that duplicate email registration is rejected.  
2. **Authenticate** — checks that authentication succeeds only for active users with correct credentials, and fails for inactive, non-existent, or wrong-password attempts.  
3. **Change Password** — confirms that users can successfully change passwords, that authentication updates accordingly, and that incorrect or redundant password changes are properly rejected.

Together, these tests confirm the correctness of user creation, credential validation, and account management workflows.

## Additional Interesting Scenarios (from `test-non-popular.ts`)
1. **Email Normalization** — ensures case-insensitivity and whitespace-trimming are consistently enforced during registration and authentication. Demonstrates how normalization prevents duplicate accounts while maintaining login flexibility.  
2. **Deactivate–Reactivate Flow** — validates that deactivated users cannot authenticate until explicitly reactivated with a new password, and that reactivation correctly updates credentials without requiring a new user ID.
3. **Idempotent Password Change** — tests the boundary case where a user changes their password to the *same* value as before.  
   This ensures the system treats the action as valid (since it’s semantically “changing” the password) but leaves state effectively unchanged.  
   The test confirms both that:
   - The operation returns `true` (no rejection for equality), and  
   - Authentication still succeeds afterward using the same password.  


# Output
## Basic Actions + Some non-conforming operations

```
deno test -A src/concepts/FlashFinance/User/test-actions/test-op-simple.ts
Check file:///C:/Users/mgriz/flashfinance/src/concepts/FlashFinance/User/test-actions/test-op-simple.ts
running 3 tests from ./src/concepts/FlashFinance/User/test-actions/test-op-simple.ts
UserStore: Register and All functionality ...
------- output -------
Attempting to register user 1...
✅ User 1 registered: test1@example.com
Fetching all users after registering user 1...
✅ `all()` returned user 1 correctly.
Attempting to register user 2...
✅ User 2 registered: test2@example.com
Fetching all users after registering user 2...
✅ `all()` returned both users correctly.
Attempting to register user with duplicate email...
✅ Registration with duplicate email rejected as expected.
✅ No new user added after failed duplicate email registration.

All 'Register' and 'All' tests completed successfully.
----- output end -----
UserStore: Register and All functionality ... ok (2s)
UserStore: Authenticate functionality ...
------- output -------
Setup: Registered active user: active@example.com
Setup: Registered and deactivated user: inactive@example.com
Attempting successful authentication...
✅ Successful authentication for active@example.com
Attempting authentication with non-existent email...
✅ Authentication rejected for non-existent email: nonexistent@example.com
Attempting authentication with incorrect password...
✅ Authentication rejected for incorrect password for active@example.com
Attempting authentication for inactive user...
✅ Authentication rejected for inactive user: inactive@example.com

All 'Authenticate' tests completed successfully.
----- output end -----
UserStore: Authenticate functionality ... ok (1s)
UserStore: Change Password functionality ...
------- output -------
Setup: Registering user for password change tests...
Setup: User registered: change_pass_user@example.com
Attempting successful password change...
✅ Password successfully changed for change_pass_user@example.com
Verifying authentication with new password...
✅ Authenticated successfully with new password.
Verifying authentication with old password fails...
✅ Old password no longer works as expected.
Attempting to change password for a non-existent user...
✅ Change password rejected for non-existent user.
Attempting to change password with incorrect old password...
✅ Change password rejected for incorrect old password.
Verifying password remains unchanged after failed attempt...
✅ Previous password still works after failed attempt.
Attempting to change password to the same password...
✅ Change password to same value returned true.
✅ Still authenticated with password after changing to itself.

All 'Change Password' tests completed successfully.
----- output end -----
UserStore: Change Password functionality ... ok (1s)

ok | 3 passed | 0 failed (5s)

```


## Interesting Scenarios

```

deno test -A src/concepts/FlashFinance/User/test-actions/test-non-popular.ts
Check file:///C:/Users/mgriz/flashfinance/src/concepts/FlashFinance/User/test-actions/test-non-popular.ts
running 2 tests from ./src/concepts/FlashFinance/User/test-actions/test-non-popular.ts
UserStore: Email normalization prevents duplicate registrations (case-insensitivity, whitespace) ...
------- output -------
Attempting to register user with email: TestUser@example.com
✅ User registered successfully. Stored email: testuser@example.com
Attempting to register user with same email, different casing: testuser@example.com
✅ Registration with different casing rejected as expected.
Attempting to register user with same email, surrounding whitespace: " testuser@example.com "
✅ Registration with surrounding whitespace rejected as expected.
Verifying authentication with original casing email...
✅ Authenticated successfully with original casing email.
Verifying authentication with lowercase email...
✅ Authenticated successfully with lowercase email.
Verifying authentication with trimmed spaced email...
✅ Authenticated successfully with trimmed spaced email.

All 'Email normalization for duplicate registration' tests completed successfully.
----- output end -----
UserStore: Email normalization prevents duplicate registrations (case-insensitivity, whitespace) ... ok (1s)
UserStore: Deactivate, Reactivate with new password, and Authenticate flow ...
------- output -------
1. Registering a new user...
✅ User registered: flow_test_user@example.com
2. Deactivating the user's account...
✅ User deactivated: flow_test_user@example.com
3. Attempting to authenticate with the inactive account (should fail)...
✅ Authentication failed for inactive user as expected.
4. Reactivating the user's account with a new password...
✅ User reactivated with new password.
5. Attempting to authenticate with the new password (should succeed)...
✅ Successfully authenticated with the new password.
6. Verifying old password no longer works after reactivation...
✅ Old password correctly rejected after reactivation.

All 'Deactivate, Reactivate, Authenticate' flow tests completed successfully.
----- output end -----
UserStore: Deactivate, Reactivate with new password, and Authenticate flow ... ok (1s)

ok | 2 passed | 0 failed (2s)

```