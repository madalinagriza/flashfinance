Changes to the User spec:
1. Adding reactivate as an action, as a response to our deactivate action (see details in interesting moments #1)


Interesting moments: 

1. I had the deactivate method but hadn't thought about the case that a user registers under the same email that is deactivate. I will have the AI implement a testcase for it, see the current behavior, and then make changes where I deem necessary. My strategy is probably to create a new user id with the same email, so we can keep the information about that user id around (I remember how this was talked in class that it could be a good idea, in case I would decide to extend to some reactivation/recovery functionality). For now, a new account will be made
[Snapshot - prompt to add testcase](../../../../\context\src\concepts\FlashFinance\User\Context_Chat.md\steps\prompt.df0ce9fb.md)
[Snapshot - response outlines that my requires doesn't allow for reregistration](../../../../context\src\concepts\FlashFinance\User\Context_Chat.md\steps\response.9a738f15.md)
As a result I'll add an action for specific reactivation, which is technically not required but it makes sense to me and to the user experience to have it.
[Snapshot - Final testcase on it](../../../../context/src/concepts/FlashFinance/User/Context_Chat.md/steps/response.d30d9c30.md)
2. Per Chatgpt's suggestions, I have realized the input emailed is not normalized for capitalized letters, even though it could be a user input (say, if you type from a phone, the keyboard may automatically capitalize the first letter). I am adding this extension and including a testcase for it. 
[Snapshot - Making the testcase](../../../../context/src/concepts/FlashFinance/User/Context_Chat.md/steps/prompt.7d0c731e.md)
