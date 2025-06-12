/**
 * AI Commit Tool - Message Formatting & User Interaction
 * 
 * @author Edwin Menjivar
 * @copyright © 2024 Edwin Menjivar
 * @description Handles user confirmation and editing of generated commit messages
 */

import * as readline from 'readline';

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
