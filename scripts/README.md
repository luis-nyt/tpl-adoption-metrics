# TPL Data Collection Scripts

This directory contains the automated data collection system for TPL design system adoption metrics.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run data collection:**
   ```bash
   npm run collect
   ```

## What it does

- **Analyzes configured NYT pages** using headless browser automation
- **Extracts TPL adoption metrics** using the same logic as the bookmarklet
- **Saves detailed raw data** in `/data/raw/YYYY-MM-DD/` 
- **Generates daily summaries** in `/data/daily/`

## Output Structure

### Raw Data (`/data/raw/YYYY-MM-DD/`)
- Detailed element-level analysis
- Individual JSON files per page
- Complete component breakdown
- Position and coverage data

### Daily Summaries (`/data/daily/`)
- Aggregated metrics across all pages
- Component usage frequency
- Coverage distribution
- Trend-ready format

## Configuration

Edit `/config/pages.yml` to modify:
- Which pages to analyze
- Page categorization
- Coverage thresholds
- Analysis priority

## Files

- **`tpl-analyzer.js`** - Core TPL detection logic (extracted from bookmarklet)
- **`collect-data.js`** - Main data collection orchestrator
- **`README.md`** - This documentation

## Example Output

```json
{
  "date": "2024-09-24",
  "pages": [
    {
      "url": "https://www.nytimes.com/",
      "pageType": "homepage", 
      "section": "home",
      "tplCoverage": 27.2,
      "elementCount": 20,
      "topComponents": ["tpl-card", "tpl-story-card", "tpl-button"]
    }
  ],
  "aggregates": {
    "averageCoverage": 27.2,
    "totalPagesAnalyzed": 1,
    "mostUsedComponents": [
      {"name": "tpl-card", "frequency": 1}
    ]
  }
}
```
