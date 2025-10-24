---
layout: default
title: Documentation Setup Guide - Scaffoldfy
---

# Documentation Setup Instructions

This directory contains the documentation for Scaffoldfy, configured for GitHub Pages with a shared navigation sidebar.

## 📋 Structure

- **`_layouts/default.html`** - Shared layout with left sidebar navigation (automatically applied to all `.md` files)
- **`_config.yml`** - GitHub Pages configuration
- **`index.md`** - Main landing page (replaces README.md for GitHub Pages)
- **`QUICK_REFERENCE.md`** - Fast-start guide with essential commands and examples
- **Other `.md` files** - Individual documentation pages

## 🚀 How It Works

GitHub Pages automatically:
1. Converts all `.md` files to HTML
2. Applies the `default.html` layout to each page
3. Renders the shared sidebar navigation on every page

**No build process needed!** Just push to GitHub and it works.

## 📝 Adding New Documentation

To add a new documentation page:

1. Create a new `.md` file in the `docs/` directory
2. Add front matter at the top:
   ```yaml
   ---
   layout: default
   title: Your Page Title - Scaffoldfy
   ---
   ```
3. Write your content in Markdown
4. Add a link to the new page in `_layouts/default.html` sidebar navigation

Example:
```markdown
---
layout: default
title: My New Feature - Scaffoldfy
---

# My New Feature

Your content here...
```

## 🔗 Navigation Menu

To update the navigation menu, edit `_layouts/default.html` and modify the sidebar section:

```html
<nav class="sidebar">
    <h2>Your Section</h2>
    <ul>
        <li><a href="YOUR_FILE.html">Link Text</a></li>
    </ul>
</nav>
```

**Note**: Use `.html` extension in links (GitHub Pages converts `.md` to `.html`)

## 🎨 Styling

All styling is contained in `_layouts/default.html` within the `<style>` tag. To customize:

1. Open `_layouts/default.html`
2. Modify the CSS in the `<style>` section
3. Save and push to GitHub

## 🌐 Viewing Locally

To test locally with Jekyll (optional):

```bash
# Install Jekyll (one time)
gem install bundler jekyll

# Navigate to docs folder
cd docs

# Serve locally
jekyll serve

# View at http://localhost:4000
```

Or simply push to GitHub and view at your GitHub Pages URL.

## 📦 Key Features

✅ **Shared Navigation** - Single sidebar menu for all pages  
✅ **No Build Process** - GitHub Pages handles everything  
✅ **Active Page Highlighting** - Current page is highlighted in sidebar  
✅ **Mobile Responsive** - Works on all devices  
✅ **Simple Markdown** - Write docs in plain Markdown  
✅ **Easy to Update** - Edit navigation in one place  

## 🔄 Updating Documentation

1. Edit the `.md` file you want to update
2. Commit and push to GitHub
3. GitHub Pages automatically rebuilds (takes 1-2 minutes)
4. Refresh the page to see changes

## 💡 Tips

- Always use relative links without the `.md` extension: `[Link](OTHER_PAGE.html)`
- Keep the sidebar organized by category
- Use descriptive titles in front matter
- Test links after adding new pages
- The `index.md` file is the homepage (replaces `README.md`)

## 🐛 Troubleshooting

**Navigation not showing?**
- Check that front matter includes `layout: default`
- Verify `_config.yml` exists
- Wait 1-2 minutes for GitHub Pages to rebuild

**Links not working?**
- Use `.html` extension in links, not `.md`
- Use relative paths (no leading `/`)
- Check for typos in filenames

**Styling not applying?**
- Clear browser cache
- Check `_layouts/default.html` exists
- Verify front matter in `.md` files

## 📄 Files Overview

| File | Purpose |
|------|---------|
| `_layouts/default.html` | Shared layout template with sidebar |
| `_config.yml` | GitHub Pages configuration |
| `index.md` | Homepage (landing page) |
| `QUICK_REFERENCE.md` | Fast-start guide for users |
| `*.md` | Individual documentation pages |

---

**Questions?** Check the [GitHub Pages Documentation](https://docs.github.com/en/pages) or [Jekyll Documentation](https://jekyllrb.com/docs/).
