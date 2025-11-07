# Design Changes

## Syncs

This is per-user financial data, so *all* API calls are done through syncs (besides login). 
* If it's helpful, in passthrough.ts I labeled them based on what *should* be available as an API call, and what shouldn't.

## Concept-Wide Changes

> Integrated Metric Concept with Category Concept
>> *why?*\
>> Metrics & Category by themselves had simple states (before), Metric was updating with each Category state change and overall just seemed to be encapsulated in category. 

## State-Wide Changes

### Label Concept 

> Added concept of labeling session:
>> Batch label transactions, their results only get written on Label.finalize. 
>>> *why?* \
#1: Label sessions reduce server load and better fit the user’s mental model of labeling in batches.\
#2: improves performance by reducing redundant updates and clarifies ownership of metrics within categories.Added new entries to the state to support remembering staged Labels.

### Category Concept

> Before, Metric only remembered a total (couldn't tell averages over custom Periods)
>> fix: under category concept, on addTransaction, Category stores bare minimum transactions info to make statistics possible.


## Action Changes 

### Label Concept



> Introduced a discard action, for transactions we don't want to label to any category during the labeling session.
>> Delete action is for already existing labels (different requires clauses to lead to more informative errors)

> Introduced an AI-powered suggest feature, which works pretty well in practice! For faster labeling (so the User doesn't want on the AI call to resulve), the User can configure not to use AI, from their User page.


## Frontend Changes

> User can now import a csv file instead of pasting the csv content into the textbox

> User can set a preference to either have AI suggest labels or no

> Never implemented a "Transaction Page", provided very little value and felt redundant. 

> Parsing pdfs from different banks was a super hard task, for the website is only accepting csv files since they are more or less uniform.

> Compared to what I thought in assignment 2, I had to implement quite a lot of getters. Didn't realize how much info you have to display to the user in order to have a website that