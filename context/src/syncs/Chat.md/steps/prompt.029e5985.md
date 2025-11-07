---
timestamp: 'Thu Nov 06 2025 10:01:26 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251106_100126.e1ae7acd.md]]'
content_id: 029e59852c25aab8a21b27221c15424d85a7bd28354db7037e0c79e053b4b2a7
---

# prompt: the current getMetricStats sync has compile error, we need to fix them. Follow the shape of getMetrics to see how they handle passsing in the arguments

only output the function(s) you have modified.

these are the error descriptions:
No overload matches this call.
Overload 1 of 2, '(f: (...args: never\[]) => unknown\[], input: { owner\_id: unknown; category\_id: unknown; period: Period; }, output: Record\<string, symbol>): Frames\<Frame & ExtractSymbolMappings\<Record\<string, symbol>, unknown>>', gave the following error.
Argument of type '{ (owner\_id: Id, category\_id: Id, period: Period): Promise\<MetricStats\[]>; (payload: { owner\_id: string; category\_id: string; period: Period | { ...; }; }): Promise<...>; }' is not assignable to parameter of type '(...args: never\[]) => unknown\[]'.
Type 'Promise\<MetricStats\[]>' is missing the following properties from type 'unknown\[]': length, pop, push, concat, and 35 more.

Element implicitly has an 'any' type because expression of type '"total\_amount"' can't be used to index type 'Frame & ExtractSymbolMappings\<Record\<string, symbol>, unknown>'.
Property 'total\_amount' does not exist on type 'Frame & ExtractSymbolMappings\<Record\<string, symbol>, unknown>'.deno-ts(7053)
