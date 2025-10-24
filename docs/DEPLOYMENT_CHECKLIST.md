---
layout: default
title: Deployment Checklist - Scaffoldfy Docs
---

# 📋 GitHub Pages Deployment Checklist

Follow these simple steps to deploy your new documentation site.

## ✅ Pre-Deployment Checklist

### 1. Verify Files Are Committed

```bash
# Check status
git status

# If you see new files, add them
git add docs/

# Commit
git commit -m "Add GitHub Pages documentation with shared navigation"

# Push to GitHub
git push origin main
```

### 2. Files That Should Exist

- ✅ `docs/_layouts/default.html` - Layout with sidebar
- ✅ `docs/_config.yml` - GitHub Pages config
- ✅ `docs/index.md` - Homepage
- ✅ `docs/QUICK_REFERENCE.md` - Quick start guide
- ✅ All other `.md` files with front matter

## 🚀 Enable GitHub Pages

### Step 1: Go to Repository Settings

1. Navigate to your GitHub repository
2. Click **Settings** (top navigation)
3. Scroll down to **Pages** section (left sidebar)

### Step 2: Configure Source

1. **Source**: Select "Deploy from a branch"
2. **Branch**: Select `main` (or your default branch)
3. **Folder**: Select `/docs`
4. Click **Save**

### Step 3: Wait for Deployment

- GitHub Pages will build your site (takes 1-2 minutes)
- You'll see a message: "Your site is live at https://pixpilot.github.io/scaffoldfy/"
- Wait for the green checkmark ✅

## 🔍 Verify Deployment

### Test Your Site

1. Visit: `https://pixpilot.github.io/scaffoldfy/`
2. Check that:
   - ✅ Left sidebar navigation appears
   - ✅ Homepage loads correctly
   - ✅ Navigation links work
   - ✅ Quick Reference page is accessible
   - ✅ Active page is highlighted in sidebar
   - ✅ All documentation pages load

### Test Navigation

Click through each section:

- [ ] 🚀 Getting Started
  - [ ] Overview
  - [ ] Quick Reference
  - [ ] Installation & Setup
  - [ ] Docs Setup Guide
- [ ] 📖 Core Concepts
  - [ ] Task Types
  - [ ] Interactive Prompts
  - [ ] Variables
  - [ ] Prompts Cheat Sheet
- [ ] ⚡ Advanced Features
  - [ ] Advanced Features
  - [ ] Template Inheritance
  - [ ] Handlebars Templates
  - [ ] Plugin System
  - [ ] Dry Run Mode
- [ ] 📚 Reference
  - [ ] Executable Defaults

## 🐛 Troubleshooting

### Site Not Loading?

```
Common fixes:
1. Wait 2-3 minutes (GitHub Pages needs time to build)
2. Check Settings → Pages shows "Your site is live"
3. Verify you selected the correct branch and /docs folder
4. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
5. Clear browser cache
```

### Navigation Not Showing?

```
Check:
1. Does _layouts/default.html exist?
2. Does _config.yml exist?
3. Do .md files have front matter with "layout: default"?
4. Wait 2-3 minutes and refresh
```

### Links Not Working?

```
Verify:
1. Links use .html extension (not .md)
2. Links are relative (no leading /)
3. Filenames match exactly (case-sensitive)
```

### Styling Issues?

```
1. Clear browser cache
2. Check _layouts/default.html has <style> section
3. Hard refresh (Ctrl+Shift+R)
```

## 📊 Build Status

### Check Build Status

1. Go to **Actions** tab in your repository
2. Look for "pages build and deployment" workflow
3. Should show green checkmark ✅
4. If red X, click to see error details

### Force Rebuild

```bash
# Make a small change and commit
git commit --allow-empty -m "Trigger GitHub Pages rebuild"
git push
```

## 🎯 Post-Deployment Tasks

### Update Repository Description

1. Go to repository homepage
2. Click ⚙️ (settings gear) next to "About"
3. Add website: `https://pixpilot.github.io/scaffoldfy/`
4. Check "Use your GitHub Pages website"

### Update Main README.md

Add a documentation link to your main README:

```markdown
## 📚 Documentation

Visit our comprehensive documentation at:
https://pixpilot.github.io/scaffoldfy/

- [Quick Reference](https://pixpilot.github.io/scaffoldfy/QUICK_REFERENCE.html) - Get started fast
- [Getting Started](https://pixpilot.github.io/scaffoldfy/GETTING_STARTED.html) - Detailed guide
- [Task Types](https://pixpilot.github.io/scaffoldfy/TASK_TYPES.html) - Complete reference
```

### Share the Link

Update these places with your docs link:

- [ ] Package.json `homepage` field
- [ ] Repository description
- [ ] README.md
- [ ] NPM package README
- [ ] Social media announcements

## 📝 Making Updates

### To Update Content

```bash
# 1. Edit the .md file
vim docs/GETTING_STARTED.md

# 2. Commit and push
git add docs/GETTING_STARTED.md
git commit -m "Update getting started guide"
git push

# 3. Wait 1-2 minutes for GitHub Pages to rebuild
# 4. Refresh the page in your browser
```

### To Update Navigation

```bash
# 1. Edit the layout file
vim docs/_layouts/default.html

# 2. Find the sidebar section
# 3. Add/edit/remove links
# 4. Commit and push
git add docs/_layouts/default.html
git commit -m "Update navigation menu"
git push

# 5. All pages will have updated navigation automatically!
```

### To Add New Page

```bash
# 1. Create new markdown file
cat > docs/NEW_FEATURE.md << 'EOF'
---
layout: default
title: New Feature - Scaffoldfy
---

# New Feature

Content here...
EOF

# 2. Add link to navigation in _layouts/default.html

# 3. Commit and push
git add docs/
git commit -m "Add new feature documentation"
git push
```

## ✨ Success!

Your documentation is now live! 🎉

- ✅ Professional layout with sidebar navigation
- ✅ Easy to navigate
- ✅ Quick Reference for fast learning
- ✅ Simple to maintain
- ✅ Zero build configuration

### Next Steps

1. Share the documentation link
2. Update package.json with homepage URL
3. Announce to users
4. Keep documentation updated

### Getting Help

- 📖 [Documentation Setup Guide](DOCUMENTATION_SETUP.html)
- 📝 [Implementation Summary](IMPLEMENTATION_SUMMARY.html)
- 🎨 [Visual Overview](VISUAL_OVERVIEW.html)
- 💬 [GitHub Discussions](https://github.com/pixpilot/scaffoldfy/discussions)

---

**Congratulations! Your documentation site is ready!** 🚀
