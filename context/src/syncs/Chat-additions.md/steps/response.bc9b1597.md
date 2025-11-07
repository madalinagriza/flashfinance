---
timestamp: 'Tue Nov 04 2025 22:49:10 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_224910.5806d682.md]]'
content_id: bc9b1597fe0e884bb03f33db0332713aae89959727deb3359f4f60c02b29734d
---

# response:

An excellent starting point. Following the established patterns for handling read-only queries versus state-mutating actions is crucial for consistency. Here are the requested synchronizations for the getter endpoints, integrated into the existing `category.sync.ts` file.

This updated file includes:

1. An updated import from `@engine` to include `Frames` for handling query results.
2. A necessary import for the `Period` class from the `CategoryConcept` implementation to construct the period object for the metric query.
3. Three new syncs for `getCategoryNameById`, `getCategoriesFromOwner`, and `getMetric`, following the query pattern seen in `files.sync.ts`.
