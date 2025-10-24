---
layout: default
title: Visual Overview - Scaffoldfy Docs
---

# 📚 Scaffoldfy Documentation - Visual Overview

## 🏗️ New Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Pages Website                      │
│                 https://pixpilot.github.io/scaffoldfy/      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Every Page Has This Layout                                  │
│  ┌──────────────┬──────────────────────────────────────┐   │
│  │              │                                       │   │
│  │  📦 Sidebar  │         📄 Page Content              │   │
│  │  Navigation  │                                       │   │
│  │              │  (from .md files)                    │   │
│  │  • Overview  │                                       │   │
│  │  • Quick Ref │                                       │   │
│  │  • Guides    │                                       │   │
│  │  • Advanced  │                                       │   │
│  │  • Reference │                                       │   │
│  │              │                                       │   │
│  │  Defined in: │  Content from:                       │   │
│  │  _layouts/   │  *.md files                          │   │
│  │  default.html│                                       │   │
│  │              │                                       │   │
│  └──────────────┴──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 📁 File Organization

```
docs/
│
├── 🎨 _layouts/
│   └── default.html          ← SINGLE navigation menu (shared by all)
│
├── ⚙️ _config.yml            ← GitHub Pages configuration
│
├── 🏠 index.md               ← Homepage (main landing page)
│
├── ⚡ QUICK_REFERENCE.md     ← NEW: Fast-start guide
│
├── 📖 Core Documentation
│   ├── GETTING_STARTED.md
│   ├── TASK_TYPES.md
│   ├── PROMPTS.md
│   ├── VARIABLES.md
│   └── ... (other guides)
│
└── 📝 Maintenance Docs
    ├── DOCUMENTATION_SETUP.md     ← How to maintain docs
    └── IMPLEMENTATION_SUMMARY.md  ← What was done
```

## 🔄 How It Works

```
1. User visits: https://pixpilot.github.io/scaffoldfy/QUICK_REFERENCE.html
                                    │
                                    ▼
2. GitHub Pages reads: docs/QUICK_REFERENCE.md
                                    │
                                    ▼
3. Sees front matter: ---
                      layout: default
                      title: Quick Reference
                      ---
                                    │
                                    ▼
4. Wraps content in: docs/_layouts/default.html
                                    │
                                    ▼
5. Replaces {{content}} with markdown content
                                    │
                                    ▼
6. Serves complete HTML page with sidebar + content
```

## 🎯 Key Features

### ✅ Shared Navigation

```
One file (_layouts/default.html) = Navigation for ALL pages
                │
                ├── No copying/pasting
                ├── Update once, applies everywhere
                └── Always consistent
```

### ✅ Easy to Add Pages

```
1. Create new-page.md with front matter
2. Add link to _layouts/default.html
3. Commit & push
4. Done! ✅
```

### ✅ No Build Process

```
GitHub Pages
    │
    ├── Detects _config.yml
    ├── Uses Jekyll automatically
    ├── Converts .md → .html
    └── Applies layouts

= Zero configuration needed!
```

## 📊 Navigation Structure

```
📦 Scaffoldfy Docs
│
├── 🚀 Getting Started
│   ├── Overview (index.md)
│   ├── Quick Reference ⭐ NEW
│   ├── Installation & Setup
│   └── 📝 Docs Setup Guide
│
├── 📖 Core Concepts
│   ├── Task Types
│   ├── Interactive Prompts
│   ├── Variables
│   └── Prompts Cheat Sheet
│
├── ⚡ Advanced Features
│   ├── Advanced Features
│   ├── Template Inheritance
│   ├── Handlebars Templates
│   ├── Plugin System
│   └── Dry Run Mode
│
├── 📚 Reference
│   └── Executable Defaults
│
└── 🔗 External Links
    ├── GitHub Repository
    ├── Report Issues
    └── NPM Package
```

## 🎨 Visual Preview

```
┌────────────────────────────────────────────────────────────┐
│  Browser: https://pixpilot.github.io/scaffoldfy/          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┬──────────────────────────────────┐   │
│  │ 📦 Scaffoldfy   │                                   │   │
│  │    Docs         │   # Scaffoldfy Documentation     │   │
│  │ ═══════════════ │                                   │   │
│  │                 │   Welcome to the official docs... │   │
│  │ 🚀 Getting      │                                   │   │
│  │    Started      │   ## 🚀 Quick Start              │   │
│  │  • Overview     │                                   │   │
│  │  • Quick Ref ⭐ │   1. Quick Reference             │   │
│  │  • Install      │   2. Getting Started             │   │
│  │                 │   3. Task Types                   │   │
│  │ 📖 Core         │                                   │   │
│  │    Concepts     │   ## 📚 Documentation            │   │
│  │  • Task Types   │                                   │   │
│  │  • Prompts      │   - Installation guide           │   │
│  │  • Variables    │   - Core concepts                │   │
│  │                 │   - Advanced features            │   │
│  │ ⚡ Advanced     │                                   │   │
│  │    Features     │   ## 💡 Features                 │   │
│  │  • Features     │                                   │   │
│  │  • Inheritance  │   ✅ 9 Task Types               │   │
│  │  • Handlebars   │   ✅ Template Inheritance       │   │
│  │  • Plugins      │   ✅ Dry-Run Mode               │   │
│  │  • Dry Run      │                                   │   │
│  │                 │                                   │   │
│  │ 📚 Reference    │                                   │   │
│  │  • Exec Defs    │                                   │   │
│  │                 │                                   │   │
│  └─────────────────┴──────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 To Enable

### Step 1: GitHub Pages Settings

```
Repository → Settings → Pages
├── Source: Deploy from branch
├── Branch: main
└── Folder: /docs

💡 Save and wait 1-2 minutes
```

### Step 2: Access Your Docs

```
Visit: https://pixpilot.github.io/scaffoldfy/

✅ Sidebar navigation on every page
✅ Quick Reference for fast learning
✅ Professional documentation site
```

## 🎓 What's in Quick Reference?

```
QUICK_REFERENCE.md includes:

📦 Installation
   └── npm, pnpm commands

⚡ Basic Usage
   ├── CLI examples
   └── API examples

🔧 Essential Task Types
   ├── write (create files)
   ├── update-json (modify JSON)
   ├── copy (copy files)
   ├── exec (run commands)
   └── delete (remove files)

💬 Quick Prompt Examples
   ├── Text input
   ├── Confirmation
   ├── Select
   ├── Multiselect
   └── Dynamic defaults

📝 Common Patterns
   ├── Complete templates
   ├── Conditional tasks
   ├── Dependencies
   └── Variables

🎯 CLI Commands
   └── All available options

💻 Programmatic API
   ├── Basic usage
   ├── Options
   ├── Plugins
   └── Error handling

💡 Tips & Gotchas
   └── Best practices
```

## ✨ Benefits

### For Users:

```
✅ Easy navigation        → Left sidebar on every page
✅ Quick start           → New Quick Reference guide
✅ Better organized      → Clear sections and categories
✅ Always know location  → Active page highlighted
✅ Mobile friendly       → Responsive design
```

### For Maintainers:

```
✅ Single update point   → Edit navigation once
✅ No build process      → Push and it works
✅ Simple markdown       → Easy to write/edit
✅ Version controlled    → Everything in Git
✅ Free hosting          → GitHub Pages
```

## 🎉 You're Done!

Your documentation now has:

- ✅ Shared navigation sidebar
- ✅ Professional layout
- ✅ Quick Reference guide
- ✅ Better organization
- ✅ Easy maintenance
- ✅ Zero build configuration

**Enable GitHub Pages and enjoy your new documentation site!** 🚀
