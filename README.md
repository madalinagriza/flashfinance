# FlashFinance

FlashFinance is a Deno-powered backend for personal finance labeling: users import bank transactions, label transactions into spending categories, and track spending metrics with per-user authentication.

## Project Artifacts
- **User journey demo**: [`UserJourneyVideo.txt`](UserJourneyVideo.txt) (Drive link to narrated walkthrough)
- **Trace**: [`trace-UserJourney.md`](trace-UserJourney.md) (end-to-end sync log from login through labeling)
- **Aggregated design decisions**: [`Aggregated-designDoc.md`](Aggregated-designDoc.md)
- **Implementation reflections**: [`Reflections.md`](Reflections.md)


## Concept Overview
- **Transactions** ([`Transaction/Spec.md`](src/concepts/Transaction/Spec.md)): Imports CSV rows into immutable transaction records, tracks UNLABELED/LABELED status, and supports both single and bulk labeling workflows.
- **Labels** ([`Label/Spec.md`](src/concepts/Label/Spec.md)): Lets users stage, finalize, or discard trasactions through labeling sessions and integrates AI-driven suggestions.
- **Categories** ([`Category/Spec.md`](src/concepts/Category/Spec.md)): Manages user-defined category lifecycles, records per-category transaction metrics (including trash handling), and surfaces transaction lists enriched with category context.
- **User Authentication** ([`UserAuthentication.md`](src/concepts/UserAuthentication/UserAuthentication.md)): Provides credential-based registration and login, ensuring every sync request is scoped to an authenticated user.
