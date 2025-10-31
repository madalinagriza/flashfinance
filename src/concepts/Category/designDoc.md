## Changes:

Metrics had to have more information than the totals. Becase we want to provide insightful stats (avg per day, totals), but also support moving transactions from one category to another, I needed to store some information about the transaction as well. 
Similarly to how the label concept 'remembers' transaction info to then give it to the AI, I changed the Category Concept to do so as well. 

Metrics update automatically when a transaction is moved from a category to another (or moved to trash). 


The arguments for getMetrics is simplified, before it was a Period type, but I needed a simpler type for communication with the frontend. 
Similarly, ID -> strings updates were done. 