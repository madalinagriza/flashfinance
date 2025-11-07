---
timestamp: 'Wed Nov 05 2025 13:13:08 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_131308.f5a85c9f.md]]'
content_id: 1d9a85b2b3b18a1c655476e4b32b1119c99ce3e8f1617157543e9a44ca53f447
---

# I have two errors in category.sync.ts:

first:
Type 'string' is not assignable to type 'symbol'.deno-ts(2322)
for line:
return frames.collectAs(\["category\_id", "name"], results);

second:
No overload matches this call.
Overload 1 of 4, '(value: string | number | Date): Date', gave the following error.
Argument of type 'unknown' is not assignable to parameter of type 'string | number | Date'.
Overload 2 of 4, '(value: string | number): Date', gave the following error.
Argument of type 'unknown' is not assignable to parameter of type 'string | number'.deno-ts(2769)

```
try {
  periodObj = Period.from(
    new Date(frame[startDate]),
    new Date(frame[endDate]),
  );
... more code
```

Can you tell me what the problems are? and given the successful sync examples and description, make sure I am correctly handling appending to the frames and using getters with syncs.
