/**
 * AI Commit Tool - OpenAI Integration
 * 
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Handles AI-powered commit message generation using OpenAI's GPT models
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the ai-commit tool directory, not current working directory
// This is necessary because the .env file is in the root directory of the project
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getModel = (): string => {
  return process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
};

export const generateCommitMessage = async (diff: string): Promise<string> => {
  const prompt = `Generate a concise, conventional commit message for the following git diff. Follow the format: type(scope): description

Examples:
- feat(auth): add user login functionality
- fix(ui): resolve button alignment issue
- docs(readme): update installation instructions

Git diff:
${diff}`;

  const response = await openai.chat.completions.create({
    model: getModel(),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 100,
  });

  return response.choices[0].message.content?.trim() || '';
};

export const generatePRDescription = async (commits: string, diff: string, branchName: string): Promise<string> => {
  const prompt = `Generate a comprehensive pull request description based on the following information:

Branch: ${branchName}

Commits in this branch:
${commits}

Full diff:
${diff}

Please create a well-structured PR description with:
1. A clear title
2. Summary of changes
3. Key features/fixes implemented
4. Any breaking changes (if applicable)
5. Testing notes (if relevant)

Format it in Markdown and make it professional but concise.`;

  const response = await openai.chat.completions.create({
    model: getModel(),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 800,
  });

  return response.choices[0].message.content?.trim() || '';
};

export const performCodeReview = async (diff: string): Promise<string> => {
  const prompt = `Perform a thorough code review on the following git diff. Analyze the code for:

1. **Code Quality**: Best practices, readability, maintainability
2. **Potential Bugs**: Logic errors, edge cases, null checks
3. **Security**: Vulnerabilities, data validation, injection risks
4. **Performance**: Inefficient operations, memory leaks
5. **Style**: Consistency, naming conventions
6. **Architecture**: Design patterns, separation of concerns

Provide specific, actionable feedback with line references when possible.
If the code looks good, mention the positive aspects.

Git diff:
${diff}

Please structure your review with clear sections and be constructive in your feedback.`;

  const response = await openai.chat.completions.create({
    model: getModel(),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3, // Lower temperature for more focused, consistent reviews
    max_tokens: 1000,
  });

  return response.choices[0].message.content?.trim() || '';
};
