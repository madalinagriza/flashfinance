**concept:** User[ID]

**purpose:**  
establish a unique identity for each person and control access to app functionality so that data is isolated per account

**principle:**  
when a user chooses a category for a transaction, they create a label linking that transaction to the chosen category, making its purpose explicit in their records.
if the user stages labels and then finalizes, each transaction gains exactly one active label reflecting that choice; if the user cancels, no labels are applied.
suggestions may inform staging but never change state until finalized.  
**state:**
> a set of Users with  
>> a user_id ID  
>> an email String  
>> a name String  
>> a password_hash String  
>> a status {ACTIVE | INACTIVE}

**actions:**
> register(email: String, name: String, password: String): (user: User)  
>> *requires:*  
email is not used by any existing user  
>> *effects:*  
creates a new user with a fresh user_id, password_hash derived from password, status ACTIVE; adds the user to Users; returns the created user

> authenticate(email: String, password: String): (user: User)  
>> *requires:*  
there exists a user with the given email whose password_hash matches password and whose status is ACTIVE  
>> *effects:*  
returns that user

> deactivate(user_id: ID)  
>> *requires:*  
a user with user_id exists  
>> *effects:*  
sets the user's status to INACTIVE

> changePassword(user_id: ID, old_password: String, new_password: String): (ok: Boolean)  
>> *requires:*  
a user with user_id exists and old_password matches the stored password_hash  
>> *effects:*  
updates password_hash with new_password; returns true

> reactivate(email: String, new_password: String): (ok: Boolean)  
>> *requires:*  
a user with the given email exists and `status = INACTIVE`  
>> *effects:*  
sets the user’s `status` to ACTIVE; updates the user’s `password_hash` with the hash of `new_password`; returns true  


**invariants:**
- email uniquely identifies a single user  
- user_id is unique and never reused  

