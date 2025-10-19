---
timestamp: 'Fri Oct 17 2025 22:47:39 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_224739.97776d7f.md]]'
content_id: d9ec352862e7952d2de258047d67a8c67c6f53ef2951570d35f0390d41f9747a
---

# response:

```typescript
  /**
   * Retrieves all users registered in the system.
   *
   * @returns A promise that resolves to an array of User objects.
   */
  async all(): Promise<User[]> {
    const userDocs = await this.users.find().toArray();
    return userDocs.map(doc => ({
      user_id: Id.from(doc._id),
      email: doc.email,
      name: doc.name,
      status: doc.status,
    }));
  }
```
