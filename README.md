# AI Git Assistant

Automatically generate meaningful Git commit messages, pull request descriptions, and perform AI-powered code reviews using OpenAI or a local LLM.

## ✨ Features

* **AI Commit Messages**: Generates clear, conventional commit messages (e.g., `feat: add login route`)
* **AI Pull Request Descriptions**: Creates comprehensive PR descriptions from branch commits and changes
* **AI Code Reviews**: Performs thorough code analysis before commits to catch bugs, security issues, and style problems
* **Interactive Workflows**: Edit and customize all AI-generated content before finalizing
* **Multiple Commands**: `commit`, `pr`, `review` - each optimized for different parts of your Git workflow
* **Privacy-Focused**: Works with OpenAI API or local LLM (planned)
* **Extensible**: Easily adaptable for Git hooks, CI, or editor plugins

---

## 🔧 Prerequisites & Configuration

### Required: OpenAI API Key

Before installation, you'll need an OpenAI API key:

1. **Get your API key** from: [OpenAI Platform](https://platform.openai.com/account/api-keys)

2. **Create a `.env` file** in your project root:

```bash
touch .env
```

3. **Add your API key** to the `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Optional Configuration

```env
# Optional: Specify different model (default: gpt-3.5-turbo)
OPENAI_MODEL=gpt-4

# Optional: Custom API base URL
OPENAI_API_BASE=https://api.openai.com/v1
```

⚠️ **Important**: Never commit your `.env` file to version control. It's already included in `.gitignore`.

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ai-commit.git
cd ai-commit
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the TypeScript code

```bash
npm run build
```

### 4. Link the CLI globally

```bash
npm link
```

This allows you to use `ai-commit` as a global command.

---

## ✅ Usage

### 🤖 AI Commit Messages (Default)

Generate AI-powered commit messages for staged changes:

```bash
# Stage your changes
git add .

# Generate and commit with AI message
ai-commit
# or explicitly:
ai-commit commit
```

### 📝 AI Pull Request Descriptions

Generate comprehensive PR descriptions from your branch commits:

```bash
# Make sure you're on a feature branch with commits
git checkout feature/new-login-system

# Generate PR description
ai-commit pr
```

The tool will:
- Analyze all commits in your branch vs main/master
- Review the full diff of changes
- Generate a structured PR description with:
  - Clear title and summary
  - Key features/fixes implemented
  - Breaking changes (if any)
  - Testing notes
- Save to a `.md` file for easy copy-paste to GitHub/GitLab

### 🔍 AI Code Review

Get AI-powered code review before committing:

```bash
# Stage the changes you want reviewed
git add .

# Get AI code review
ai-commit review
```

The AI will analyze your code for:
- **Code Quality**: Best practices, readability, maintainability
- **Potential Bugs**: Logic errors, edge cases, null checks  
- **Security**: Vulnerabilities, data validation, injection risks
- **Performance**: Inefficient operations, memory usage
- **Style**: Consistency, naming conventions
- **Architecture**: Design patterns, separation of concerns

### 📋 Command Reference

```bash
ai-commit                # Generate commit message (default)
ai-commit commit         # Generate commit message  
ai-commit pr            # Generate pull request description
ai-commit review        # AI code review of staged changes
ai-commit help          # Show help message
```

---

## 🛠 Development

Useful commands during development:

```bash
npm run build        # Compile TypeScript into dist/
npm start            # Run the compiled version
npm link             # Globally symlink CLI for development use
npm unlink -g ai-commit   # Remove global link
```

---

## 📂 Project Structure

```
ai-commit/
├── bin/              # CLI entry point
│   └── ai-commit.ts  # Main CLI with subcommand support
├── lib/              # Functional modules
│   ├── git.ts        # Git operations (diff, commits, branches)
│   ├── ai.ts         # OpenAI communication (commit, PR, review)
│   ├── formatter.ts  # User interaction & file output
│   ├── pr.ts         # Pull request description generation
│   └── review.ts     # Code review functionality
├── dist/             # Compiled output
├── .env              # API credentials (not committed)
├── .gitignore
├── LICENSE
├── README.md
├── package.json
└── tsconfig.json
```

---

## 🎯 Workflow Examples

### Feature Development Workflow

```bash
# 1. Create and switch to feature branch
git checkout -b feat/user-authentication

# 2. Make your changes and stage them
git add .

# 3. Get AI code review before committing
ai-commit review

# 4. Generate and commit with AI message
ai-commit commit

# 5. When ready for PR, generate description
ai-commit pr
```

### Code Review Integration

```bash
# Before any commit, get AI feedback
git add .
ai-commit review

# Fix any issues, then commit
ai-commit commit
```

---

## 📄 License

MIT License

See [LICENSE](./LICENSE) for details.

---

## 🤝 Contributing

Feel free to submit issues or pull requests. Contributions are welcome!

---

## 💡 Future Improvements

* Add support for local LLMs via Ollama
* Git hook installer for automatic code review
* VSCode or JetBrains plugin
* Team configuration sharing
* Custom prompt templates
* Integration with issue trackers (Jira, Linear)
* Automated changelog generation
* Multi-language commit message support
