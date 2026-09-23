# AI Git Assistant

Automatically generate meaningful Git commit messages, pull request descriptions, and perform AI-powered code reviews using OpenAI or a local LLM.

## ✨ Features

* **AI Commit Messages**: Generates clear, conventional commit messages (e.g., `feat: add login route`)
* **AI Pull Request Descriptions**: Creates comprehensive PR descriptions from branch commits and changes
* **AI Code Reviews**: Performs thorough code analysis before commits to catch bugs, security issues, and style problems
* **Interactive Workflows**: Edit and customize all AI-generated content before finalizing
* **AI Branch Names**: Suggests conventional branch names based on your working changes
* **Multiple Commands**: `commit`, `pr`, `review`, `branch` - each optimized for different parts of your Git workflow
* **Secret Redaction**: Credentials are stripped from diffs before they are sent to any model
* **Privacy-Focused**: Works with the OpenAI API or any OpenAI-compatible server (Ollama, LM Studio, vLLM)
* **Extensible**: Easily adaptable for Git hooks, CI, or editor plugins

---

## 🔧 Prerequisites & Configuration

### Required: OpenAI API Key

Before installation, you'll need an OpenAI API key:

1. **Get your API key** from: [OpenAI Platform](https://platform.openai.com/account/api-keys)

2. **Create a `.env` file** in the project root by copying the template:

```bash
cp .env.example .env
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

You can also override the model for a single run using the `--model <model>` flag on the CLI. If neither the flag nor the environment variable is set, the default is `gpt-3.5-turbo`.

### Secret redaction

Diffs are sent to a third-party API, so anything resembling a credential is replaced with `[REDACTED]`
before the request leaves your machine. This covers provider tokens (OpenAI, GitHub, AWS, Google, Slack,
Stripe), JWTs, private key blocks, credentials embedded in URLs, and `KEY=value` assignments whose name
looks secret-ish. The tool also warns when the diff touches files that usually hold credentials
(`.env`, `id_rsa`, `*.pem`, `credentials.json`, ...).

```bash
$ ai-commit commit          # with a staged .env
⚠️  The diff touches files that usually hold credentials: .env
   Their contents are redacted before sending, but consider unstaging them.
🔒 Redacted 2 possible secrets before sending the diff.
```

Redaction is pattern-based and cannot catch everything, so treat it as a safety net rather than a
guarantee — avoid staging secrets in the first place. To disable it, set `AI_COMMIT_DISABLE_REDACTION=1`.

### Where generated files go

`ai-commit pr` and `ai-commit review` write their output to `.git/ai-commit/` rather than the working
tree, so a later `git add .` can never sweep them into a commit. The full path is printed when a file
is saved.

### Using a local LLM

`OPENAI_API_BASE` points the tool at any server that speaks the OpenAI chat-completions API, so your diffs never leave your machine:

```env
# Ollama
OPENAI_API_BASE=http://localhost:11434/v1
OPENAI_MODEL=llama3
OPENAI_API_KEY=ollama   # required by the client, but unused by Ollama
```

⚠️ **Important**: Never commit your `.env` file to version control. It's already included in `.gitignore`.

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ai-commit.git
cd ai-commit
```

Requires Node.js 18 or newer.

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
# Use a specific model (overrides .env for this run)
ai-commit --model gpt-4
```

### 📝 AI Pull Request Descriptions

Generate comprehensive PR descriptions from your branch commits:

```bash
# Make sure you're on a feature branch with commits
git checkout feature/new-login-system

# Generate PR description
ai-commit pr
# Use a specific model for PR description
ai-commit pr --model gpt-3.5-turbo
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
# Use a specific model for code review
ai-commit review --model gpt-4
```

The AI will analyze your code for:
- **Code Quality**: Best practices, readability, maintainability
- **Potential Bugs**: Logic errors, edge cases, null checks  
- **Security**: Vulnerabilities, data validation, injection risks
- **Performance**: Inefficient operations, memory usage
- **Style**: Consistency, naming conventions
- **Architecture**: Design patterns, separation of concerns

### 🌿 AI Branch Names

Get conventional branch name suggestions from your current changes:

```bash
# Make some changes (staged or unstaged)
ai-commit branch
```

The tool will suggest three conventional names (e.g. `feat/user-authentication`), let you pick one or
type your own, and then create and switch to it. If the branch already exists, it offers to switch instead.

### 📋 Command Reference

```bash
ai-commit                # Generate commit message (default)
ai-commit commit         # Generate commit message
ai-commit pr             # Generate pull request description
ai-commit review         # AI code review of staged changes
ai-commit branch         # Suggest branch names from your changes
ai-commit help           # Show help message
ai-commit --version      # Print the installed version
ai-commit --model gpt-4  # Use GPT-4 for commit message
ai-commit pr --model gpt-3.5-turbo # Use GPT-3.5 for PR description
```

---

## 🛠 Development

Useful commands during development:

```bash
npm run build        # Compile TypeScript into dist/
npm run typecheck    # Type-check without emitting output
npm test             # Run the test suite
npm run test:watch   # Re-run tests on change
npm run test:coverage # Run tests with a coverage report
npm start            # Run the compiled version
npm link             # Globally symlink CLI for development use
npm unlink -g ai-commit   # Remove global link
```

Every push and pull request runs typecheck, build and tests on Node 18, 20 and 22 via GitHub Actions.

---

## 📂 Project Structure

```
ai-commit/
├── bin/              # CLI entry point
│   └── ai-commit.ts  # Main CLI with subcommand support
├── lib/              # Functional modules
│   ├── git.ts        # Git operations (diff, commits, branches)
│   ├── redact.ts     # Strips secrets out of diffs before sending
│   ├── ai.ts         # OpenAI communication (commit, PR, review, branch)
│   ├── formatter.ts  # User interaction & file output
│   ├── prompt.ts     # Promise-based readline helpers
│   ├── pr.ts         # Pull request description generation
│   ├── review.ts     # Code review functionality
│   └── branch.ts     # Branch name suggestions
├── __tests__/        # Jest test suite
├── dist/             # Compiled output
├── .env              # API credentials (not committed)
├── .env.example      # Template for .env
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
# Or with a specific model
ai-commit review --model gpt-4

# 4. Generate and commit with AI message
ai-commit commit
# Or with a specific model
ai-commit commit --model gpt-4

# 5. When ready for PR, generate description
ai-commit pr
# Or with a specific model
ai-commit pr --model gpt-3.5-turbo
```

### Code Review Integration

```bash
# Before any commit, get AI feedback
git add .
ai-commit review
# Or with a specific model
ai-commit review --model gpt-4

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

* Git hook installer for automatic code review
* VSCode or JetBrains plugin
* Team configuration sharing
* Custom prompt templates
* Integration with issue trackers (Jira, Linear)
* Automated changelog generation
* Multi-language commit message support
