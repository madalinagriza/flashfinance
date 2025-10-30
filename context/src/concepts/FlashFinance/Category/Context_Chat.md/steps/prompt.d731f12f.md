---
timestamp: 'Sat Oct 18 2025 19:06:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_190636.9ce4643d.md]]'
content_id: d731f12fa3e03211fcd2e6f93759fbea821862423fafba75a5430089d9e15fe7
---

# prompt: Implement a testcase that verifies **renaming a category does not affect its existing metrics**. Use `src/concepts/FlashFinance/Category/test-actions/test-op-simple.ts` for structure, imports, and assertion style, but add this as a new `Deno.test` in the Category tests (a separate block). The test should: (1) create a category for an owner, (2) set two metrics for different `Period`s via `setMetricTotal`, (3) rename the category using `rename`, then (4) confirm both metrics are still retrievable with the same totals via `getMetric`, and `listMetrics` still returns both in ascending order by `period_start`. Do not access collections directly or add unrelated assertions. Use only public methods on `CategoryStore` (`create`, `rename`, `setMetricTotal`, `getMetric`, `listMetrics`) and the `Period` helper. Keep logs brief and assertions minimal.
