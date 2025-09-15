# TPL Coverage Automation Setup

This document explains how to set up automated TPL coverage tracking for NYT pages using the components in this repository.

## Architecture Overview

The automation system consists of:

1. **GitHub Actions** - Scheduled data collection using Puppeteer
2. **Vercel Functions** - API endpoints for data storage and retrieval  
3. **Dashboard** - Web interface for visualizing coverage trends
4. **Database** - Persistent storage for time-series data (optional)

## Quick Start

### 1. Set up the Repository

```bash
# Clone and install dependencies
git clone <your-repo>
cd nyt-tpl-highlighter
npm install
```

### 2. Configure Secrets

In your GitHub repository settings, add these secrets:

```
VERCEL_API_ENDPOINT=https://your-project.vercel.app
DATABASE_URL=your-database-connection-string (optional)
SUPABASE_URL=your-supabase-url (if using Supabase)
SUPABASE_ANON_KEY=your-supabase-anon-key (if using Supabase)
```

### 3. Deploy to Vercel

```bash
# Deploy to Vercel
npx vercel --prod

# Or connect your GitHub repo to Vercel for auto-deployment
```

### 4. Test the Collection Script

```bash
# Test locally
npm run test-collection

# This will collect data from nytimes.com homepage
```

### 5. Access the Dashboard

Visit `https://your-project.vercel.app/dashboard.html` to see the coverage dashboard.

## Components Explained

### GitHub Actions Workflow (`.github/workflows/tpl-coverage-collector.yml`)

- **Schedule**: Runs every 6 hours (4 times per day)
- **Matrix Strategy**: Collects data from multiple NYT pages in parallel
- **Artifacts**: Saves screenshots for 30 days
- **Environment**: Uses Ubuntu with Node.js 18

**Monitored Pages**:
- Homepage
- World, Politics, Technology, Business, Opinion, Sports sections

### Collection Script (`scripts/collect-coverage.js`)

- **Technology**: Puppeteer for browser automation
- **Features**: 
  - Full-page screenshots
  - TPL element detection (same logic as bookmarklet)
  - Coverage percentage calculation
  - Data export to API or local files

### API Endpoint (`api/coverage.js`)

- **Framework**: Vercel Functions (serverless)
- **Features**:
  - CORS-enabled for cross-origin requests
  - In-memory storage (fallback) or database integration
  - Data validation and enrichment
  - Summary statistics calculation

### Dashboard (`dashboard.html`)

- **Styling**: Tachyons CSS framework [[memory:6866182]]
- **Charts**: Chart.js for data visualization
- **Features**:
  - Real-time coverage metrics
  - Time-series charts
  - Page-by-page comparison
  - Filtering and data export

### Database Schema (`schema.sql`)

- **Database**: PostgreSQL (Supabase recommended)
- **Tables**:
  - `tpl_coverage_data` - Raw measurements
  - `tpl_monitored_pages` - Page configuration
  - `tpl_daily_stats` - Aggregated statistics
- **Features**: Indexes, views, and functions for performance

## Configuration Options

### Monitoring Frequency

Edit `.github/workflows/tpl-coverage-collector.yml`:

```yaml
schedule:
  # Every 2 hours
  - cron: '0 */2 * * *'
  # Every day at 9 AM UTC  
  - cron: '0 9 * * *'
  # Every Monday at 10 AM UTC
  - cron: '0 10 * * 1'
```

### Pages to Monitor

Edit the matrix strategy in the workflow:

```yaml
strategy:
  matrix:
    page: [
      'https://www.nytimes.com/',
      'https://www.nytimes.com/section/arts',
      'https://www.nytimes.com/section/food'
      # Add more pages here
    ]
```

### Database Integration

For persistent storage, set up a database:

#### Option 1: Supabase (Recommended)

1. Create a new Supabase project
2. Run the SQL from `schema.sql` in the SQL editor
3. Add environment variables to Vercel:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   DATABASE_URL=postgresql://...
   ```

#### Option 2: PlanetScale

1. Create a PlanetScale database
2. Adapt `schema.sql` for MySQL syntax
3. Add connection string to Vercel environment

#### Option 3: Vercel KV (Redis)

For simpler time-series data:

```javascript
// In api/coverage.js
import { kv } from '@vercel/kv';

await kv.lpush('coverage-data', JSON.stringify(data));
await kv.ltrim('coverage-data', 0, 1000); // Keep last 1000 entries
```

## Data Structure

Each measurement contains:

```javascript
{
  "id": "unique-id",
  "url": "https://www.nytimes.com/",
  "timestamp": "2024-01-15T10:30:00Z",
  "totalElements": 45,
  "totalCoveragePercent": 23.5,
  "viewportCoveragePercent": 18.2,
  "pageArea": 2400000,
  "totalTPLArea": 564000,
  "elements": [
    {
      "tagName": "DIV",
      "classes": ["tpl-header", "tpl-nav"],
      "area": 15600,
      "rect": { "width": 200, "height": 78, "x": 0, "y": 0 }
    }
  ],
  "viewport": { "width": 1920, "height": 1080 },
  "pageTitle": "The New York Times - Breaking News...",
  "screenshotPath": "screenshots/tpl-coverage-homepage-2024-01-15.png"
}
```

## Troubleshooting

### GitHub Actions Issues

1. **Puppeteer fails**: Check the browser launch args in `collect-coverage.js`
2. **Network timeouts**: Increase timeout values or add retry logic
3. **Memory issues**: Reduce concurrent pages or add `--max-old-space-size=4096`

### API Issues

1. **CORS errors**: Verify the `allowCors` wrapper is applied
2. **Data not persisting**: Check database connection and credentials
3. **Rate limiting**: Implement caching or request throttling

### Dashboard Issues

1. **No data showing**: Check API endpoint URL and CORS settings
2. **Charts not loading**: Verify Chart.js CDN is accessible
3. **Performance issues**: Implement data pagination for large datasets

## Cost Considerations

### GitHub Actions
- **Free tier**: 2,000 minutes/month for public repos
- **Usage**: ~5 minutes per run × 4 runs/day × 30 days = 600 minutes/month
- **Cost**: Free for most use cases

### Vercel Functions
- **Free tier**: 100GB-hours/month
- **Usage**: Minimal for API endpoints
- **Cost**: Free for most use cases

### Database Options
- **Supabase**: 500MB free, then $25/month
- **PlanetScale**: 10GB free, then $29/month
- **Vercel KV**: 30,000 commands free, then usage-based

## Advanced Features

### Alerts and Notifications

Add Slack/Discord webhooks to notify on coverage changes:

```javascript
// In collect-coverage.js
if (coverageData.totalCoveragePercent < 15) {
  await sendAlert(`Low TPL coverage detected: ${coverageData.totalCoveragePercent}%`);
}
```

### Historical Analysis

Generate weekly/monthly reports:

```sql
-- Weekly coverage trends
SELECT 
  DATE_TRUNC('week', timestamp) as week,
  AVG(total_coverage_percent) as avg_coverage
FROM tpl_coverage_data 
WHERE timestamp >= NOW() - INTERVAL '3 months'
GROUP BY DATE_TRUNC('week', timestamp)
ORDER BY week;
```

### A/B Testing Integration

Track coverage during experiments:

```javascript
// Add experiment metadata
coverageData.experiment = {
  id: process.env.EXPERIMENT_ID,
  variant: process.env.EXPERIMENT_VARIANT
};
```

This automation system provides comprehensive TPL coverage tracking with minimal manual intervention. The modular design allows you to start simple and add complexity as needed.
