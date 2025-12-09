#!/bin/bash

# Script to remove sensitive files from Git history
# This will rewrite Git history to remove backend/.env.example completely

echo "🔒 Git History Cleanup Script"
echo "=============================="
echo ""
echo "⚠️  WARNING: This will rewrite Git history!"
echo "⚠️  Make sure you have a backup before proceeding."
echo ""
echo "This script will:"
echo "1. Remove backend/.env.example from all Git history"
echo "2. Force push to remote (GitLab)"
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted by user"
    exit 1
fi

echo ""
echo "📋 Step 1: Checking current status..."
git status

echo ""
echo "📋 Step 2: Creating backup branch..."
git branch backup-before-cleanup 2>/dev/null || echo "Backup branch already exists"

echo ""
echo "📋 Step 3: Removing file from Git history..."
echo "This may take a few minutes..."

# Use filter-branch to remove the file from all history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env.example" \
  --prune-empty --tag-name-filter cat -- --all

if [ $? -ne 0 ]; then
    echo "❌ Error during filter-branch"
    exit 1
fi

echo ""
echo "📋 Step 4: Cleaning up refs..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "📋 Step 5: Verifying removal..."
if git log --all --full-history --source -- backend/.env.example | grep -q "commit"; then
    echo "⚠️  Warning: File still found in history"
else
    echo "✅ File successfully removed from history"
fi

echo ""
echo "📋 Step 6: Ready to force push to remote"
echo ""
echo "⚠️  IMPORTANT: This will rewrite remote history!"
echo "⚠️  Anyone who has cloned this repo will need to re-clone it."
echo ""
read -p "Force push to GitLab? (yes/no): " push_confirm

if [ "$push_confirm" = "yes" ]; then
    echo ""
    echo "🚀 Force pushing to remote..."
    git push origin --force --all
    git push origin --force --tags
    
    echo ""
    echo "✅ Done! Git history has been cleaned."
    echo ""
    echo "📝 Next steps:"
    echo "1. Verify on GitLab that the file is gone from history"
    echo "2. Rotate your AWS credentials (just to be safe)"
    echo "3. Change your database password"
    echo "4. Tell team members to re-clone the repo (if any)"
else
    echo ""
    echo "⚠️  Changes made locally but NOT pushed to remote."
    echo "Run this when ready: git push origin --force --all"
fi

echo ""
echo "✅ Cleanup complete!"
