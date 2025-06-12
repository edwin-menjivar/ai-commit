#!/usr/bin/env node

/**
 * AI Commit Tool - Main Entry Point
 * 
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description CLI tool that automatically generates AI-powered commit messages from staged git changes
 */

import { getStagedDiff, commitChanges } from '../lib/git';
import { generateCommitMessage } from '../lib/ai';
import { confirmCommitMessage } from '../lib/formatter';

(async () => {
  try {
    const diff = getStagedDiff();

    if (!diff) {
      console.log('No staged changes detected.');
      process.exit(0);
    }

    const aiMessage = await generateCommitMessage(diff);
    const finalMessage = await confirmCommitMessage(aiMessage);

    commitChanges(finalMessage);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
