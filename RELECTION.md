# Reflection on Using an AI Coding Agent

## 1. Which AI coding agent did you use, and how did it help you?

I used GitHub Copilot in VS Code, powered by GPT-6 Luna. It helped me move faster from an idea to a working implementation by supporting the requirements, technical planning, coding, and testing stages. Working directly in my code editor made it easier to apply the guidance to the project and keep the work connected to the actual codebase.

## 2. What part of the development process was easiest with AI?

Writing prompts and using them to break the work into manageable steps felt easiest. I could describe what I wanted, ask the agent to help shape the requirements and plan, and then work through implementation and tests in sequence.

## 3. What challenges did you run into?

Sometimes my prompts left out important details. When that happened, I had to refine and rerun the prompt so it described the task and expected result more precisely. That taught me that the quality of the guidance I give the agent has a direct effect on how useful its response is.

## 4. Describe one situation where you reviewed, corrected, or improved an AI-generated suggestion.

I reviewed the generated tests and their results rather than accepting them without checking. One new monthly-trend test initially failed because it expected one zero-spending month, while its January-to-April data correctly produced two empty months. I investigated the failure and refined the test to check the zero total in each month separately. This was a test assertion issue, not a bug in the feature.

## 5. What did you learn about using AI in software engineering?

Using an AI coding agent feels like being the pilot or project manager: I set the direction, review the work, and guide the agent toward the result I need. Before this, I mostly used web versions of AI models for planning and other tasks. Working with an agent directly in my code editor feels like another level because it can help with everything from creating files and structuring a feature to writing and running tests.

It can take away a lot of repetitive setup and help speed up development, but I still need to review the output and provide clearer direction when something is missing or needs improvement. The agent can do much of the work, while I remain responsible for deciding whether the result is correct and useful.
