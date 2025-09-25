# Vercel Auto-Deploy Setup

This guide explains how to set up automatic Vercel deployments after each GitHub Actions data collection run, ensuring your metrics dashboard is always live with the latest data.

## 🎯 What This Achieves

**Before**: GitHub Actions collects data → Vercel shows stale data until manual push
**After**: GitHub Actions collects data → Auto-triggers Vercel deployment → Live data immediately

## 🔧 Setup Instructions

### Step 1: Create Vercel Deploy Hook

1. **Go to your Vercel dashboard** → Your project → Settings
2. **Navigate to Git tab** → Deploy Hooks section  
3. **Create Deploy Hook**:
   - **Name**: `GitHub Actions Auto-Deploy`
   - **Branch**: `main`
   - **Click "Create Hook"**
4. **Copy the Deploy Hook URL** (looks like: `https://api.vercel.com/v1/integrations/deploy/...`)

### Step 2: Add GitHub Secret

1. **Go to your GitHub repository** → Settings → Secrets and variables → Actions
2. **Click "New repository secret"**:
   - **Name**: `VERCEL_DEPLOY_HOOK_URL`
   - **Value**: Paste the Deploy Hook URL from Step 1
3. **Click "Add secret"**

### Step 3: Test the Setup

#### Option A: Manual Test
1. Go to **Actions** tab → **TPL Metrics Collection** → **Run workflow**
2. Watch the workflow run - you should see:
   ```
   🚀 Triggering Vercel deployment...
   ✅ Vercel deployment triggered successfully
   ```
3. Check your Vercel dashboard - you should see a new deployment triggered

#### Option B: Wait for Automatic Run  
- The workflow runs every hour at :15 past the hour
- Monitor the next automatic run for the auto-deploy step

## 🔍 How It Works

**Workflow Enhancement:**
```yaml
- name: Trigger Vercel Deploy Hook
  if: success()  # Only run if data collection succeeded
  run: |
    if [[ -n "${{ secrets.VERCEL_DEPLOY_HOOK_URL }}" ]]; then
      echo "🚀 Triggering Vercel deployment..."
      curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK_URL }}"
      echo "✅ Vercel deployment triggered successfully"
    else
      echo "⚠️  VERCEL_DEPLOY_HOOK_URL secret not found - skipping auto-deploy"
    fi
```

**Complete Flow:**
1. **GitHub Actions runs** (hourly or manual)
2. **Collects fresh TPL data** from NYT
3. **Commits new data** to repository
4. **Triggers Vercel deployment** via Deploy Hook
5. **Vercel rebuilds** with fresh data
6. **Dashboard updates** automatically (within 1-2 minutes)

## ✅ Verification

**Success indicators:**
- ✅ GitHub Actions shows "Vercel deployment triggered successfully"
- ✅ Vercel dashboard shows new deployment triggered by "Deploy Hook"
- ✅ Your metrics dashboard shows latest data timestamps
- ✅ Data updates appear automatically every hour

**If it's not working:**
- Check that `VERCEL_DEPLOY_HOOK_URL` secret exists and is correct
- Verify the Deploy Hook URL in Vercel settings
- Check GitHub Actions logs for error messages
- Ensure the Deploy Hook is set for the correct branch (`main`)

## 🚀 Benefits

- **Live Dashboard**: Always shows latest data within minutes of collection
- **Zero Manual Work**: Completely automated pipeline
- **Fast Updates**: New data appears automatically every hour
- **Reliable**: Only deploys when data collection succeeds
- **Secure**: Uses GitHub Secrets to protect Deploy Hook URL

## 🛠️ Troubleshooting

**"Deploy Hook not found"**: 
- Verify the secret name is exactly `VERCEL_DEPLOY_HOOK_URL`
- Check that the Deploy Hook URL is complete and valid

**"Deployment not triggered"**:
- Confirm the Deploy Hook is for the correct project and branch
- Check Vercel dashboard for any deployment errors

**"Old data still showing"**:
- Verify the deployment completed successfully in Vercel
- Check browser cache (hard refresh: Cmd/Ctrl + Shift + R)

Your TPL adoption metrics dashboard will now be as live as possible! 🎉
