# Cosmic Games Developer Guide
## From Notepad to GitHub: Your Journey to Professional Development

Welcome! This guide will teach you how to level up from copy-pasting in Notepad to building like a pro.

---

## Table of Contents
1. [Why GitHub? (The "Why should I care?" section)](#why-github)
2. [Essential Tools Setup](#essential-tools-setup)
3. [GitHub Basics: Your Code's New Home](#github-basics)
4. [Daily Workflow: How to Actually Code](#daily-workflow)
5. [Working with AI Assistants (ChatGPT & Claude)](#working-with-ai-assistants)
6. [Organizing Your Cosmic Games Project](#organizing-your-project)
7. [From Google Apps Script to Real Apps](#from-apps-script-to-real-apps)
8. [Quick Reference Cheat Sheet](#cheat-sheet)

---

## Why GitHub?

### Your Current Workflow:
```
1. Open Notepad
2. Write code
3. Copy
4. Paste into Google Apps Script
5. Hope you didn't break anything
6. (If you broke something, try to remember what you changed)
```

### Problems with This:
- ❌ No backup if you accidentally delete something
- ❌ Can't see what changed between versions
- ❌ Hard to experiment without breaking working code
- ❌ No way to collaborate with others (or future AI assistants)
- ❌ Can't track "why" you made decisions

### With GitHub:
- ✅ Every change is saved with a description
- ✅ Can always go back to any previous version
- ✅ Can try new features in "branches" without breaking main code
- ✅ AI assistants can read your whole project and give better help
- ✅ Professional workflow that scales as your business grows
- ✅ Free backup in the cloud

**Think of it like this**: Notepad is like writing on sticky notes. GitHub is like having a magical filing cabinet that remembers every version of every document, lets you time travel, and never loses anything.

---

## Essential Tools Setup

### What You Need to Install:

#### 1. **Git** (The version control engine)
- **Windows**: Download from [git-scm.com](https://git-scm.com/)
- **Mac**: Open Terminal and type `git --version` (it will prompt you to install)
- **Why**: This is the actual tool that tracks your changes

#### 2. **Visual Studio Code (VS Code)** (Your new "Notepad")
- Download from [code.visualstudio.com](https://code.visualstudio.com/)
- **Why**: Free, powerful, works with GitHub, AI assistants can help you write code directly in it
- **Bonus**: Has spell check, auto-complete, and highlights errors before you even save!

#### 3. **GitHub Account**
- Sign up at [github.com](https://github.com/)
- **Free tier is perfect** for what you need
- **Why**: Your code lives in the cloud, accessible anywhere

#### 4. **Node.js** (For building web apps)
- Download from [nodejs.org](https://nodejs.org/) (get the LTS version)
- **Why**: Lets you build real web apps, not just Google Apps Scripts

### Optional but Helpful:
- **GitHub Desktop**: Visual interface if command line feels scary at first ([desktop.github.com](https://desktop.github.com/))
- **Chrome Browser**: Best for web development and testing

---

## GitHub Basics: Your Code's New Home

### Core Concepts (Simple Explanations):

#### **Repository (Repo)**
Think of it as a project folder that remembers its entire history.

```
Cosmic-Games-Index/          ← This is your repository
├── spellcheck.js            ← Your code files
├── tournament-rules.md      ← Documentation
├── employee-handbook.md     ← More docs
└── .git/                    ← Magic folder (Git's brain - don't touch!)
```

#### **Commit**
A snapshot of your code at a specific moment, with a message explaining what you did.

```
Example commits:
- "Add spellcheck for player names"
- "Fix bug where store credit was calculated wrong"
- "Add new tournament format rules"
```

**Rule**: Commit often, with clear messages. Future you will thank present you!

#### **Branch**
A parallel universe where you can experiment without breaking your working code.

```
main branch:          Your stable, working code
  |
  |-- feature-branch: Where you try new stuff
```

If the experiment works → merge it back to main
If it doesn't → delete the branch, no harm done!

#### **Push/Pull**
- **Push**: Send your local changes to GitHub's cloud
- **Pull**: Get changes from GitHub's cloud to your computer

---

## Daily Workflow: How to Actually Code

### First Time Setup (Do Once):

#### 1. Create a New Project on GitHub
```bash
# Open Terminal/Command Prompt and navigate to where you want your project
cd Documents  # or wherever you keep projects

# Create a new folder
mkdir Cosmic-Games-Index
cd Cosmic-Games-Index

# Initialize Git
git init

# Create a README file
echo "# Cosmic Games Index" > README.md

# Make your first commit
git add .
git commit -m "Initial commit - starting my cosmic empire"

# Connect to GitHub (create repo on github.com first)
git remote add origin https://github.com/YOUR_USERNAME/Cosmic-Games-Index.git
git push -u origin main
```

#### 2. OR Clone an Existing Project
```bash
# If the project already exists on GitHub
git clone https://github.com/YOUR_USERNAME/Cosmic-Games-Index.git
cd Cosmic-Games-Index
```

### Daily Coding Routine:

#### Morning (Start Your Session):
```bash
# 1. Navigate to your project
cd path/to/Cosmic-Games-Index

# 2. Get latest changes (if you work from multiple computers)
git pull origin main

# 3. Create a new branch for today's feature
git checkout -b add-tournament-tracking
```

#### During the Day (While Coding):
```bash
# 4. Check what files you've changed
git status

# 5. See exactly what changed
git diff

# 6. Save your work (commit)
git add .
git commit -m "Add tournament tracking feature"

# 7. Push to GitHub (backup in cloud)
git push origin add-tournament-tracking
```

**Pro Tip**: Commit every time you finish a logical chunk of work. Don't wait until end of day!

#### Evening (Wrapping Up):
```bash
# 8. Merge your feature into main
git checkout main
git merge add-tournament-tracking

# 9. Push final version
git push origin main

# 10. Delete the feature branch (cleanup)
git branch -d add-tournament-tracking
```

---

## Working with AI Assistants (ChatGPT & Claude)

### How to Get the Best Help:

#### ❌ Less Helpful:
```
"Make my code better"
"Add a feature"
"Fix this bug"
```

#### ✅ More Helpful:
```
"I have a Google Apps Script that tracks player names in a spreadsheet.
I want to add a feature that automatically emails players when they
reach 100 store credit points. Here's my current code: [paste code]"

"I'm building a web app to track tournament results. I need to:
1. Store player names and scores
2. Calculate rankings
3. Show leaderboards
I'm using React and Node.js. Where should I start?"
```

### The Magic Formula for AI Assistance:

**CONTEXT + GOAL + CONSTRAINTS = GREAT HELP**

#### Context:
- What are you building?
- What have you already tried?
- What does your current code do?

#### Goal:
- What specific thing do you want to accomplish?
- What should it do when it's done?

#### Constraints:
- What technologies are you using?
- What are you trying to avoid?
- Are there budget/time limits?

### Example Conversation with Claude (me!):

**You**:
```
I run a card shop called Cosmic Games. I currently use Google Sheets
to track:
- Player prize points
- Store credit balances
- Tournament results

I have a Google Apps Script that does spellcheck on player names.

I want to build a mobile app that lets me:
1. Upload all my paper documents (rules, handbooks, etc.)
2. Search across all of them
3. See version history when I change rules
4. Access it from my phone

I know basic JavaScript but I've never built a web app.
What's the first step?
```

**Claude**:
```
Great! Let's start with a simple Progressive Web App (PWA) that works
on mobile and desktop. Here's a step-by-step plan:

1. First, we'll create a React app with a document upload feature
2. Add a search function using a simple library
3. Implement version tracking
4. Make it installable on your phone

Let's start with step 1. Create a new folder and I'll help you
set up the basic structure...
```

### Tips for Working with AI:

1. **Share Your Code**: We can't help if we can't see what you're working with
2. **Share Error Messages**: Full error messages help us diagnose faster
3. **Ask "Why?"**: Don't just ask for code, ask us to explain so you learn
4. **Iterate**: Start simple, then add features one at a time
5. **Use GitHub**: Share your repo URL so we can see the full context

### Using GitHub with AI:

```bash
# This is HUGE: AI can see your whole project!

# Instead of pasting code snippets, just say:
"I've pushed my code to github.com/yourname/cosmic-games
Can you review my spellcheck.js file and suggest improvements?"

# Or:
"My project is at [repo URL]. I'm trying to add [feature].
What files should I modify?"
```

---

## Organizing Your Cosmic Games Project

### Recommended Folder Structure:

```
Cosmic-Games-Index/
├── README.md                  ← What this project is
├── .gitignore                 ← Files to NOT track (passwords, etc.)
│
├── docs/                      ← All your documentation
│   ├── employee-handbook/
│   │   ├── v1.0-original.md
│   │   ├── v2.0-updated.md
│   │   └── current.md
│   ├── tournament-rules/
│   │   ├── magic-the-gathering.md
│   │   ├── pokemon.md
│   │   └── flesh-and-blood.md
│   ├── policies/
│   │   ├── store-credit-policy.md
│   │   └── prize-structure.md
│   └── financials/
│       └── README.md          ← Maybe keep actual finances private!
│
├── google-apps-scripts/       ← Your current scripts
│   ├── spellcheck.js
│   ├── tournament-tracker.js
│   └── store-credit.js
│
├── web-app/                   ← Your new web application
│   ├── frontend/              ← What users see (React)
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   ├── backend/               ← Server logic (Node.js)
│   │   ├── server.js
│   │   ├── routes/
│   │   └── package.json
│   └── database/              ← Where data lives
│       └── schema.sql
│
└── archive/                   ← Old stuff you want to keep
    └── old-paper-scans/
```

### File Naming Conventions:

#### ✅ Good:
```
employee-handbook-v2.md
tournament-results-2024-03.json
store-credit-policy.md
```

#### ❌ Avoid:
```
FINAL_FINAL_v3_REAL_THIS_TIME.doc
Copy of Document (1).txt
stuff.md
```

**Rules**:
- Use lowercase
- Use hyphens, not spaces
- Include version numbers or dates
- Be descriptive but concise

---

## From Google Apps Script to Real Apps

### What You Know (Google Apps Script):

```javascript
function doSomething() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var data = sheet.getRange('A1:B10').getValues();
  // Do stuff...
}
```

**Limitations**:
- Only works in Google Sheets
- Hard to share outside Google ecosystem
- Limited UI options
- Harder to version control

### What You Can Build (Web Apps):

#### **Progressive Web App (PWA)**
- Works in browser AND installs on phone like native app
- Works offline
- Can access camera, location, etc.
- You control everything

#### **React App** (Popular choice):
```javascript
// Similar to Apps Script but more powerful!
function CosmicGamesApp() {
  const [players, setPlayers] = useState([]);

  // Load data
  useEffect(() => {
    fetch('/api/players')
      .then(res => res.json())
      .then(data => setPlayers(data));
  }, []);

  // Display
  return (
    <div>
      <h1>Cosmic Games Player List</h1>
      {players.map(player => (
        <PlayerCard key={player.id} player={player} />
      ))}
    </div>
  );
}
```

### Migration Path (From Apps Script → Web App):

#### Phase 1: Keep Your Data in Google Sheets (Easy Start)
```javascript
// Use Google Sheets API from your web app
// Your existing scripts keep working
// Web app just reads/writes to same sheets
```

#### Phase 2: Hybrid Approach
```javascript
// Important data → Real database (SQLite/MongoDB)
// Less critical data → Still in Sheets
// Gradual migration as you learn
```

#### Phase 3: Full Web App
```javascript
// Everything in proper database
// Professional deployment
// Can scale as business grows
```

**You don't have to do this all at once!** Start with Phase 1.

---

## Cheat Sheet

### Most Common Git Commands:

```bash
# See what changed
git status

# Save changes locally
git add .
git commit -m "Description of what I did"

# Send to GitHub
git push

# Get latest from GitHub
git pull

# Create new branch
git checkout -b branch-name

# Switch branches
git checkout main

# See history
git log

# Undo uncommitted changes
git checkout -- filename

# See what's different
git diff
```

### VS Code Keyboard Shortcuts:

```
Ctrl/Cmd + S          Save file
Ctrl/Cmd + F          Find in file
Ctrl/Cmd + Shift + F  Find in all files
Ctrl/Cmd + `          Open terminal
Ctrl/Cmd + P          Quick open file
Ctrl/Cmd + /          Toggle comment
```

### Getting Unstuck:

#### "I made a mistake in my last commit"
```bash
# Change the last commit message
git commit --amend -m "New message"

# Add forgotten files to last commit
git add forgotten-file.js
git commit --amend --no-edit
```

#### "I want to undo my changes"
```bash
# Undo changes in one file (not committed yet)
git checkout -- filename.js

# Undo last commit (but keep changes)
git reset HEAD~1

# Undo last commit (and delete changes - careful!)
git reset --hard HEAD~1
```

#### "I'm confused, just show me what changed"
```bash
git status           # What files changed?
git diff             # What exactly changed?
git log --oneline    # What commits did I make?
```

#### "Help! I broke everything!"
```bash
# If you committed your working code earlier:
git reflog           # Find the commit hash of working version
git reset --hard abc123  # Go back to that commit

# If you pushed to GitHub:
# Your code is safe! Just re-clone the repo
```

---

## Your First Real Project: Cosmic Games Index

### Let's Build This Together!

Here's what we'll create:

#### 1. **Document Management System**
- Upload PDFs, Markdown, Word docs
- Full-text search
- Tag documents (handbook, rules, finances, etc.)
- Version history

#### 2. **Living Document Editor**
- Edit markdown files directly in browser
- See diff between versions
- Mark current "canonical" version
- Track who changed what and why

#### 3. **Cosmic UI**
- Space/cosmic theme (because why not?)
- Mobile-friendly
- Works offline (PWA)
- Fast search

#### 4. **Integration with Existing Data**
- Import from Google Sheets
- Keep spellcheck functionality
- Add player/tournament data to index

### Tech Stack (What We'll Use):

```
Frontend: React + TailwindCSS (styling)
Backend: Node.js + Express
Database: SQLite (simple, no setup needed)
Search: MiniSearch (JavaScript search library)
Deployment: Vercel or Netlify (free hosting!)
```

### Timeline (Learning While Building):

**Week 1**: Setup + Basic File Upload
**Week 2**: Search Functionality
**Week 3**: Document Editing
**Week 4**: Version Control & History
**Week 5**: Mobile/PWA Features
**Week 6**: Polish + Deployment

**Each week**: I'll help you build the next piece, explain how it works, and you'll commit your progress to GitHub!

---

## Next Steps (For When You Finish Your Coffee):

### Today:
1. ☐ Install Git
2. ☐ Install VS Code
3. ☐ Create GitHub account
4. ☐ Clone this SpellCheck repo to your computer

### This Week:
1. ☐ Gather your 25 documents
2. ☐ Create a new repo: "Cosmic-Games-Index"
3. ☐ Upload documents to a `docs/` folder
4. ☐ Organize them into categories
5. ☐ Make your first commit!

### This Month:
1. ☐ Start building the web app (I'll help!)
2. ☐ Migrate one feature from Apps Script to web app
3. ☐ Deploy first version
4. ☐ Install it on your phone

---

## Resources to Bookmark:

### Learning:
- [GitHub Learning Lab](https://lab.github.com/) - Interactive tutorials
- [MDN Web Docs](https://developer.mozilla.org/) - Best web development reference
- [FreeCodeCamp](https://www.freecodecamp.org/) - Free coding courses
- [React Tutorial](https://react.dev/learn) - Official React docs

### Tools:
- [GitHub Desktop](https://desktop.github.com/) - Visual Git interface
- [VS Code Extensions](https://marketplace.visualstudio.com/vscode):
  - GitLens (see git history in editor)
  - Prettier (auto-format code)
  - ESLint (catch errors)
  - Live Server (test web pages)

### Community:
- [Stack Overflow](https://stackoverflow.com/) - Q&A for coding problems
- [GitHub Discussions](https://github.com/) - Ask questions on projects
- [Dev.to](https://dev.to/) - Developer community & tutorials

---

## Final Thoughts

You're at an exciting moment: transforming from someone who "just needs to track some data" into someone who can build real tools for your business.

**Remember**:
- Every developer started where you are
- Mistakes are how you learn (that's why we have Git!)
- AI assistants (like me) are here to help you learn, not just write code for you
- Your domain knowledge (running a card shop) + coding skills = powerful combination

GitHub isn't just a tool for storing code—it's how you'll think about building software. Each commit is a save point. Each branch is an experiment. Each push is a backup.

**Most importantly**: Start small, commit often, and don't be afraid to break things. That's what branches are for!

See you at breakfast! ☕

---

*P.S. - When you're ready, come back and say "I'm ready to build" and I'll help you create your first real web app. We'll start with something simple and build up from there. One commit at a time.*

---

## Quick Start Checklist

Print this out and check off as you go:

### Setup (One Time):
- [ ] Install Git
- [ ] Install VS Code
- [ ] Create GitHub account
- [ ] Install Node.js
- [ ] Configure Git with your name/email:
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "your.email@example.com"
  ```

### Every New Project:
- [ ] Create repository on GitHub
- [ ] Clone to your computer
- [ ] Create README.md
- [ ] Add .gitignore file
- [ ] Make first commit
- [ ] Start coding!

### Every Coding Session:
- [ ] `git pull` (get latest changes)
- [ ] Create a branch for your feature
- [ ] Code + test
- [ ] `git add .` + `git commit -m "message"`
- [ ] `git push`
- [ ] Merge when done

### Before Asking AI for Help:
- [ ] What exactly am I trying to do?
- [ ] What have I already tried?
- [ ] What error messages am I seeing?
- [ ] Can I share my code/repo URL?

---

**Version**: 1.0
**Last Updated**: 2025-10-25
**Author**: Claude (your AI coding buddy)
**License**: Use this however helps your business grow!
