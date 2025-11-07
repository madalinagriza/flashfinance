---
timestamp: 'Fri Nov 07 2025 01:31:43 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_013143.cb3d7f45.md]]'
content_id: e492d25619ac4839f01a5a2c5ec5a7966010a64c2b33738a370e82bf328153d5
---

# prompt: I'm still having trouble with getMetricStats

why do you think this is happening?
\[Requesting] Received request for path: /Category/getMetricStats

Requesting.request {
session: '019a5cff-c655-76fb-acbe-c3542c8b7ac9',
category\_id: '1886c3ec-3a50-4266-9e8a-03f435879d59',
period: {
startDate: '2024-10-30T00:00:00.000Z',
endDate: '2025-10-30T23:59:59.999Z'
},
path: '/Category/getMetricStats'
} => { request: '019a5cff-dc7a-7115-af72-daddedf53c26' }

Category.getMetricStats {
owner\_id: '019a5974-cc78-7739-a34b-fe51150580d2',
category\_id: '1886c3ec-3a50-4266-9e8a-03f435879d59',
period: {
startDate: '2024-10-30T00:00:00.000Z',
endDate: '2025-10-30T23:59:59.999Z'
}
} => \[
{
total\_amount: 0,
transaction\_count: 0,
average\_per\_day: 0,
days: 366
}
]

\[Requesting] Error processing request: Missing binding: Symbol(stats) in frame: \[object Object]
