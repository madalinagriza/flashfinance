---
timestamp: 'Tue Nov 04 2025 21:11:39 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_211139.80c4ae61.md]]'
content_id: 56307da9f58922e5b7efe03d1efb8646f0ed106ebcd2bc7414823e8cd0585cb8
---

# file: src/utils/types.ts

```typescript
/**
 * A branded type for IDs. This is structurally a string, but TypeScript
 * treats it as a distinct type, preventing accidental assignment of
 * regular strings to ID fields.
 */
export type ID = string & { readonly brand: unique symbol };

/**
 * Represents an empty record, typically returned by actions that have
 * no specific output on success.
 */
export type Empty = Record<PropertyKey, never>;
```
