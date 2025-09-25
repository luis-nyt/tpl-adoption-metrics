# TPL Adoption Metrics

Automated collection and analysis of TPL design system adoption metrics for The New York Times. This project monitors TPL design system usage across nytimes.com through automated data collection and provides insights into adoption trends and coverage patterns.

## Features

- **Automated Data Collection**: Periodic GitHub Actions workflow that analyzes TPL usage across key NYT pages
- **Multi-Viewport Analysis**: Tests TPL adoption across mobile, tablet, and desktop breakpoints  
- **Comprehensive Metrics**: Tracks element counts, coverage percentages, component types, and responsive consistency
- **Historical Trending**: Stores daily aggregated data for long-term adoption trend analysis
- **Raw Data Archive**: Preserves detailed element-level analysis for deep-dive investigations
- **Local Testing**: Development scripts for manual collection and analysis

## Data Collection

The system automatically analyzes these NYT page categories:
- **Homepage** (home): Primary landing page
- **World News** (world): International coverage
- **Business** (business): Financial and economic news  
- **Technology** (technology): Tech industry coverage
- **Sports** (sports): Athletic events and analysis
- **Arts** (arts): Culture and entertainment

### Metrics Tracked

- **TPL Element Count**: Total elements using TPL classes
- **Coverage Percentage**: Ratio of TPL elements to total page elements
- **Component Categories**: Breakdown by element type (headers, buttons, text, etc.)
- **Responsive Consistency**: Cross-viewport adoption scoring
- **Screen Real Estate**: Percentage of page area covered by TPL components

## Usage

### Automated Collection (GitHub Actions)
The system runs automatically on a scheduled basis. View results in the `/data/daily/` directory.

### Local Testing
```bash
# Install dependencies
npm install

# Collect current data (single viewport)
npm run collect

# Collect multi-viewport data  
npm run collect-multiview

# Run local testing script
npm run test-local
```

## Data Structure

### Daily Aggregates (`/data/daily/`)
```json
{
  "date": "2025-09-25",
  "total_elements": 146,
  "coverage_percentage": 21.3,
  "pages_analyzed": 6,
  "viewport_analysis": { /* multi-breakpoint data */ }
}
```

### Raw Data (`/data/raw/YYYY-MM-DD/`)
Individual page analysis with detailed element-level information and component breakdowns.

## File Structure
```
tpl-adoption-metrics/
├── config/
│   └── pages.yml           # Page configuration and categories
├── data/
│   ├── daily/             # Aggregated daily metrics
│   ├── raw/               # Detailed page-level analysis
│   └── reports/           # Generated analysis reports
├── scripts/
│   ├── collect-data.js    # Main collection orchestrator
│   ├── collect-data-multiview.js  # Multi-viewport analysis
│   ├── tpl-analyzer.js    # Core TPL detection logic
│   └── run-local-testing.js       # Local development testing
├── archive/               # Legacy bookmarklet tools
└── tpl-highlighter-web.html       # Web-based TPL highlighter
```

## Development

The project includes a web-based TPL highlighter tool for manual analysis and a complete bookmarklet system for on-demand page analysis. These tools complement the automated collection system and provide immediate feedback during development.

### Key Components

- **TPL Analyzer**: Core detection logic for identifying TPL elements and calculating metrics
- **Collection Orchestrator**: Manages multi-page analysis workflows  
- **Multi-Viewport Engine**: Tests responsive TPL adoption across device sizes
- **Data Persistence**: Structured storage for both raw analysis and aggregated trends

## Browser Support

- Node.js 16+ (for automated collection)
- Chrome/Chromium (for Puppeteer automation)
- Modern browsers (for web-based tools)

## Historical Context

This project evolved from a Chrome extension for highlighting TPL elements into a comprehensive automated metrics collection system. The original bookmarklet and web tools remain available for manual analysis and development workflows.

## Support

For issues or feature requests, contact the NYT Design Systems team.