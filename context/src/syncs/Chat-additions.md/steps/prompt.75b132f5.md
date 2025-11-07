---
timestamp: 'Fri Nov 07 2025 01:38:32 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_013832.dbd667d4.md]]'
content_id: 75b132f5c2beaa5a449a92944c17b853e5c7c2c3b3d6e35485f217915d7abb85
---

# prompt: I want to rework the sync so that it is both expecting and giving an answer in the correct shape

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

here's the investigation:
Based on the logs you've provided, you've correctly diagnosed that `getMetricStats` is the source of the problem. The request is received, the `Category.getMetricStats` action runs successfully and returns data, but the process fails right before sending the final response.

Let's break down why this is happening.

### The Problem: Mismatched Data Shape

The error message `Missing binding: Symbol(stats) in frame` is the key clue. It means that when the synchronization engine tried to execute the `then` clause of your `GetMetricStatsRequest` sync, it couldn't find the `stats` variable it needed.
