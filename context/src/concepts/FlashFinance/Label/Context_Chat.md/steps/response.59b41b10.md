---
timestamp: 'Thu Oct 16 2025 12:45:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_124518.6e43cf7d.md]]'
content_id: 59b41b10de45260955c989536ae0c7d2e035b25e63beaf45e511c8c48160a916
---

# response:

Here is the `apply` function from the `LabelStore` class, exactly as it is written in `src/concepts/FlashFinance/Label/label.ts`:

```typescript
    /**
     * Applies a label to a thing.
     *
     * @param label - The label to apply.
     * @param thing - The thing to apply the label to.
     */
    public apply(label: Label, thing: AbstractThing): void {
        if (!this.has(label)) {
            this.add(label);
        }
        if (!label.has(thing)) {
            label.add(thing);
        }
    }
```
