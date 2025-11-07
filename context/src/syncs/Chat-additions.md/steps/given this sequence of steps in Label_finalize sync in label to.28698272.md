---
timestamp: 'Wed Nov 05 2025 16:46:52 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_164652.4b40f244.md]]'
content_id: 28698272723d12ab8764bab090d388fed54d7cf6affe6a34e9159b504e59c9ae
---

# given this sequence of steps in Label/finalize sync in label to:

1. get labels from   "/api/Label/getStagedLabels",
2. for each of these labels, extract the necessary information, and for each label:
   2.1 call Transaction.mark\_labeled
   2.2 call Category.add transaction
3. call label.finalize

there's a problem currently in the label sync. Here is an explanation and possible steps to fix it:

Used 202 references
Clarifying TypeScript type error
TypeScript is objecting to that then: property because the Sync interface declares it as an array of action patterns (ActionPattern\[]), not as a function. In the FinalizeAndRespondRequest sync you’re currently supplying:

then: (frame) => {  if (frame\[error]) {    return actions(\[Requesting.respond, { request, error: frame\[error] }]);  }  return actions(    \[Label.cancelSession, { user\_id: frame\[user] }],    \[Requesting.respond, { request, ok: true }],  );},
That arrow function is being treated as a plain value assigned to then, so TypeScript tries to match its type against ActionPattern\[] and reports:

Type '(frame: any) => ActionPattern\[]' is not assignable to type 'ActionPattern\[]'.Did you mean to call this expression?
In other words, the compiler expects the result of actions(...) (which is an ActionPattern\[]) but finds the function itself. At runtime the engine probably never calls it either, so it’s a type and behavioral mismatch.

While it’s complaining, TypeScript also sees the frame parameter without an annotation and—because noImplicitAny is enabled—emits:

Parameter 'frame' implicitly has an 'any' type.
To fix this you can’t keep the then: field as a function unless the Sync type explicitly supports callbacks. Two options:

Stay declarative (what the engine expects) and build the proper action list in the where clause—e.g., attach a flag or error string to the frame, then use conditional filtering so that the then clause can stay a plain actions(...) invocation.

If Sync really does allow a per-frame function, cast or wrap it in whatever helper the engine provides (some engines have then: frames.when(...)). Without that support you’d need to restructure so then receives a ready-to-run ActionPattern\[].

Either way, the errors are just TypeScript warning you that then needs an array and that frame should have an explicit type when you do use a callback.

tell me:
how to fix it or if it's not possible to provide a sync for this kind of thing and I need to do implement something like Transaction.bulk\_mark\_labeled and Category.bulk\_add\_transaction.
