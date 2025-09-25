# TPL Metrics Automation

This document explains how to run TPL metrics collection both locally and in production.

## 🏠 Local Testing

### Quick Test (Single Run)
```bash
npm run collect-multiview
```

### Automated Local Testing (Every 5 Minutes)
```bash
npm run test-local
```

**What it does:**
- Runs TPL collection every 5 minutes
- Shows condensed output (just the key metrics)
- Tracks run statistics
- Press `Ctrl+C` to stop

**Output:**
```
[3:45:32 PM] 🎯 Starting local TPL testing - collecting every 5 minutes
[3:45:32 PM] ⏹️  Press Ctrl+C to stop

[3:45:32 PM] 🚀 Starting collection run #1
    📱 TPL ADOPTION ANALYSIS
    📱 Mobile: 61.8% coverage (152 elements)
    💻 Desktop: 17.7% coverage (139 elements)
    🎯 Combined: 39.8% average coverage
    ✅ Data collection completed!
[3:45:45 PM] ✅ Collection run #1 completed successfully
[3:45:45 PM] 📊 Stats: 1 runs in 0 minutes

[3:50:45 PM] 🚀 Starting collection run #2
...
```

## ☁️ Production (GitHub Actions)

### Setup
1. **Push to GitHub**: Ensure your repository is on GitHub
2. **Enable Actions**: Go to Actions tab in your repo
3. **Automatic Runs**: Starts automatically every hour at :15 past

### Manual Trigger
- Go to **Actions** → **TPL Metrics Collection** → **Run workflow**
- Optionally add a custom commit message

### What GitHub Actions Does

**Hourly Collection:**
- Runs `npm run collect-multiview`
- Commits new data to the repository
- Creates backup artifacts (30-day retention)
- No human intervention required

**File Structure:**
```
data/
├── daily/2025-09-24-multiview.json
├── raw/2025-09-24/
│   └── home-00-multiview-20250924.json
```

**Commit Messages:**
- `Automated TPL metrics collection - 2025-09-24 15:15 UTC`
- Custom messages via manual trigger

### Benefits of GitHub Actions

**✅ Advantages:**
- **Free**: 2000 minutes/month on public repos
- **Reliable**: Runs automatically, no local machine required
- **Version Control**: All data committed to git history
- **Scalable**: Easy to adjust frequency/add more pages
- **Backup**: Automatic artifact storage
- **Team Access**: Everyone can see results

**⚠️ Considerations:**
- **Rate Limiting**: Be respectful to NYT servers
- **Data Growth**: Git repo size increases over time
- **Public Data**: Results visible if repo is public

### Configuration Options

**Change Frequency:**
Edit `.github/workflows/tpl-metrics.yml`:
```yaml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
  - cron: '0 9 * * 1-5'  # 9 AM weekdays only
  - cron: '0 12 * * *'   # Daily at noon
```

**Change Pages:**
Edit `config/pages.yml` to add more URLs

**Add Notifications:**
Add Slack/Teams notifications to the workflow

## 🔄 Data Management

### Local Storage
- Data stored in `data/` directory
- Raw files: ~114KB per collection
- Daily summaries: ~2KB per day

### Git History
- Each collection creates a commit
- Full historical trend data
- Easy to analyze changes over time

### Cleanup (Optional)
```bash
# Archive old data (manual process)
mkdir archive/
mv data/raw/2024-* archive/
git add . && git commit -m "Archive old data"
```

## 📊 Usage Examples

### Daily Monitoring
```bash
# Check today's results
cat data/daily/$(date +%Y-%m-%d)-multiview.json | jq '.viewportSummaries'
```

### Trend Analysis
```bash
# Get coverage over time
grep -r "tplCoverage" data/daily/ | grep mobile
```

### Compare Runs
```bash
# Compare morning vs evening
npm run collect-multiview  # Morning
# ... wait ...
npm run collect-multiview  # Evening
```
