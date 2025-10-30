---
timestamp: 'Thu Oct 16 2025 22:24:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_222411.9872d61e.md]]'
content_id: 4f424e0219311ad0ddbf09c97d2c2db799657ab1a33a5908a7292d894a50ef72
---

# response:

### Spec.md

````md
Let's create a `LikertSurveyConcept`.

A Likert survey presents a statement and asks the user to rate their level of agreement.
The `LikertSurveyConcept` will be initialized with a statement.
The user can respond with one of the following levels of agreement: "Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree".

The concept should keep track of the user's response.

Example of usage:
```ts
const survey = new LikertSurveyConcept("AI will take over the world");

survey.state.statement // "AI will take over the world"
survey.state.response // undefined

survey.select("Strongly Agree");

survey.state.response // "Strongly Agree"

survey.select("Invalid response"); // should throw an error

survey.clear();

survey.state.response // undefined
````

````

### /src/concepts/FlashFinance/Label/label.ts
```typescript
import { Concept, Step } from "@init-ai/core";
import { z } from "zod";

export const LabelInput = z.object({
  label: z.string().describe("the label to assign to the user's message"),
});

export class LabelConcept extends Concept<typeof LabelInput, { labels: string[] }> {
  constructor() {
    super({
      name: "Label",
      description: "assign a label to the user's message",
      input: LabelInput,
      initialState: {
        labels: [],
      },
    });
  }

  protected async main(
    step: Step<typeof LabelInput, { labels: string[] }>
  ): Promise<{ labels: string[] }> {
    const {
      input: { label },
      state,
    } = step;

    return {
      labels: [...state.labels, label],
    };
  }

  async clear(step: Step<never, { labels: string[] }>): Promise<{ labels: string[] }> {
    return {
      labels: [],
    };
  }
}

export const Label = new LabelConcept();
````

### /src/concepts/FlashFinance/Label/test-AI/label-clear.ts

```typescript
import { Test, Testcase } from "@init-ai/core";
import { Label } from "../label";

const testcases: Testcase[] = [
  {
    name: "clear labels",
    steps: [
      {
        concept: Label,
        input: {
          label: "some-label",
        },
        expected: {
          labels: ["some-label"],
        },
      },
      {
        concept: Label,
        input: {
          label: "some-other-label",
        },
        expected: {
          labels: ["some-label", "some-other-label"],
        },
      },
      {
        concept: Label,
        api: "clear",
        expected: {
          labels: [],
        },
      },
      {
        concept: Label,
        input: {
          label: "another-label",
        },
        expected: {
          labels: ["another-label"],
        },
      },
    ],
  },
];

export default new Test({
  name: "Label concept: clear",
  testcases,
});
```

### /src/concepts/LikertSurvey/LikertSurveyConcept.test.ts

```typescript
import { test, expect, describe } from "vitest";
import { LikertSurveyConcept } from "./LikertSurveyConcept";

describe("LikertSurveyConcept", () => {
  test("should initialize with a statement and undefined response", () => {
    const statement = "AI will take over the world";
    const survey = new LikertSurveyConcept(statement);
    expect(survey.state.statement).toBe(statement);
    expect(survey.state.response).toBeUndefined();
  });

  test("should update the response when a valid option is selected", () => {
    const survey = new LikertSurveyConcept("Test statement");
    survey.select("Strongly Agree");
    expect(survey.state.response).toBe("Strongly Agree");
    survey.select("Disagree");
    expect(survey.state.response).toBe("Disagree");
  });

  test("should throw an error for an invalid response", () => {
    const survey = new LikertSurveyConcept("Test statement");
    // @ts-expect-error
    expect(() => survey.select("Invalid response")).toThrow(
      "Invalid response. Please select one of 'Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'."
    );
  });

  test("should clear the response", () => {
    const survey = new LikertSurveyConcept("Test statement");
    survey.select("Agree");
    expect(survey.state.response).toBe("Agree");
    survey.clear();
    expect(survey.state.response).toBeUndefined();
  });

  test("should handle multiple instances independently", () => {
    const survey1 = new LikertSurveyConcept("First survey");
    const survey2 = new LikertSurveyConcept("Second survey");

    survey1.select("Neutral");
    survey2.select("Strongly Disagree");

    expect(survey1.state.response).toBe("Neutral");
    expect(survey2.state.response).toBe("Strongly Disagree");
  });
});
```
