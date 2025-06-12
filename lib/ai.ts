/**
 * AI Commit Tool - OpenAI Integration
 * 
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Handles AI-powered commit message generation using OpenAI's GPT models
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateCommitMessage = async (diff: string): Promise<string> => {
  const prompt = `Generate a concise, conventional commit message for the following git diff:\n${diff}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
  });

  return response.choices[0].message.content?.trim() || '';
};
