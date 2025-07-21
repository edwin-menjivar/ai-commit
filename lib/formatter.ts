/**
 * AI Commit Tool - Message Formatting & User Interaction
 * 
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Handles user confirmation and editing of generated commit messages
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

export const confirmCommitMessage = (message: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    console.log(`\n🤖 Generated commit message:`);
    console.log(`   "${message}"\n`);
    
    rl.question(`Accept this message? (y/n) or type a new message: `, (answer) => {
      rl.close();
      
      const trimmedAnswer = answer.trim().toLowerCase();
      
      // Accept the message
      if (trimmedAnswer === '' || trimmedAnswer === 'y' || trimmedAnswer === 'yes') {
        resolve(message);
      }
      // Reject and ask for new message
      else if (trimmedAnswer === 'n' || trimmedAnswer === 'no') {
        console.log('Please provide your commit message:');
        const editRl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        
        editRl.question('> ', (newMessage) => {
          editRl.close();
          resolve(newMessage.trim() || message);
        });
      }
      // User provided a custom message directly
      else {
        resolve(answer.trim());
      }
    });
  });
};

export const confirmPRDescription = async (description: string, branchName: string): Promise<void> => {
  console.log(`\n🤖 Generated PR description for branch: ${branchName}`);
  console.log('=' .repeat(60));
  console.log(description);
  console.log('=' .repeat(60));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`\nSave to file? (y/n/edit): `, async (answer) => {
      rl.close();
      
      const trimmedAnswer = answer.trim().toLowerCase();
      
      if (trimmedAnswer === 'y' || trimmedAnswer === 'yes' || trimmedAnswer === '') {
        await savePRDescription(description, branchName);
        resolve();
      } else if (trimmedAnswer === 'edit' || trimmedAnswer === 'e') {
        await editPRDescription(description, branchName);
        resolve();
      } else {
        console.log('PR description not saved.');
        resolve();
      }
    });
  });
};

export const displayCodeReview = async (review: string): Promise<void> => {
  console.log(`\n🔍 AI Code Review Results:`);
  console.log('=' .repeat(60));
  console.log(review);
  console.log('=' .repeat(60));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`\nSave review to file? (y/n): `, async (answer) => {
      rl.close();
      
      const trimmedAnswer = answer.trim().toLowerCase();
      
      if (trimmedAnswer === 'y' || trimmedAnswer === 'yes') {
        await saveCodeReview(review);
        resolve();
      } else {
        console.log('Review not saved.');
        resolve();
      }
    });
  });
};

const savePRDescription = async (description: string, branchName: string): Promise<void> => {
  const filename = `pr-description-${branchName.replace(/[^a-zA-Z0-9]/g, '-')}.md`;
  const filepath = path.join(process.cwd(), filename);
  
  try {
    fs.writeFileSync(filepath, description);
    console.log(`✅ PR description saved to: ${filename}`);
  } catch (error) {
    console.error(`❌ Failed to save PR description: ${error}`);
  }
};

const saveCodeReview = async (review: string): Promise<void> => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `code-review-${timestamp}.md`;
  const filepath = path.join(process.cwd(), filename);
  
  try {
    fs.writeFileSync(filepath, review);
    console.log(`✅ Code review saved to: ${filename}`);
  } catch (error) {
    console.error(`❌ Failed to save code review: ${error}`);
  }
};

const editPRDescription = async (description: string, branchName: string): Promise<void> => {
  const filename = `pr-description-${branchName.replace(/[^a-zA-Z0-9]/g, '-')}.md`;
  const filepath = path.join(process.cwd(), filename);
  
  try {
    // Save to temp file for editing
    fs.writeFileSync(filepath, description);
    console.log(`📝 PR description saved to: ${filename}`);
    console.log('Edit the file and run the command again if needed.');
  } catch (error) {
    console.error(`❌ Failed to save PR description for editing: ${error}`);
  }
};
