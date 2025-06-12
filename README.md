# AI Commit

Automatically generate meaningful, conventional Git commit messages using OpenAI or a local LLM.

## ✨ Features

* Parses staged git diffs
* Generates clear, conventional commit messages (e.g., `feat: add login route`)
* Supports editing before finalizing the commit
* Works with OpenAI API or local LLM (planned)
* Easily extendable for editors, Git hooks, CI, or plugins

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

### Step 1: Stage your changes

```bash
git add .
```

### Step 2: Run the tool

```bash
ai-commit
```

### Step 3: Approve or edit the suggested message, then commit

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
│   └── ai-commit.ts
├── lib/              # Functional modules
│   ├── git.ts        # Git diff & commit logic
│   ├── ai.ts         # OpenAI communication
│   └── formatter.ts  # Message formatting & editing
├── dist/             # Compiled output
├── .env              # API credentials (not committed)
├── .gitignore
├── LICENSE
├── README.md
├── package.json
└── tsconfig.json
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
* Multi-line commit messages and summaries
* Git hook installer
* VSCode or JetBrains plugin
* Plugin system for formatting rules, ticket prepending, etc.
