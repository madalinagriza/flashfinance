---
timestamp: 'Wed Nov 05 2025 18:36:20 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251105_183620.7a343fda.md]]'
content_id: 68df68785aa78115f11d520b7bd112c49fedd1e38044c2b45b3e0239e80afecf
---

# can you make sense of this error:

Argument of type '((({ tx\_ids, requester\_id }: { tx\_ids: string\[]; requester\_id: string; }) => Promise<void>) | { tx\_ids: any; requester\_id: any; })\[] | ((({ owner\_id, transactions }: { owner\_id: string; transactions: BulkTransactionEntry\[]; }) => Promise<...>) | { ...; })\[] | ({ ...; } | { ...; })\[] | ((({ request, ...response }: { ...' is not assignable to parameter of type 'ActionList'.
Type '((({ tx\_ids, requester\_id }: { tx\_ids: string\[]; requester\_id: string; }) => Promise<void>) | { tx\_ids: any; requester\_id: any; })\[]' is not assignable to type '\[InstrumentedAction, Mapping, (Mapping | undefined)?]'.
Target requires 2 element(s) but source may have fewer.

error #2:
Type '(frame: any) => ActionPattern\[]' is not assignable to type 'ActionPattern\[]'.

only respond with the fixes or if the function requires big restructuring, only with the function you've modified, not the whole file.
