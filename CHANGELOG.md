# Changelog

## 2025-09-15
- created comprehensive automation system on new 'automation-system' branch for continuous TPL coverage monitoring
- implemented GitHub Actions workflow that collects data every 6 hours from 7 key NYT pages using Puppeteer browser automation
- built Vercel API endpoint for storing and retrieving coverage data with CORS support and database integration capabilities
- designed interactive dashboard with Tachyons styling featuring real-time charts, filtering, and trend analysis using Chart.js
- created PostgreSQL database schema optimized for time-series data with proper indexing and aggregation tables
- added automated screenshot capture system that stores full-page images as GitHub Actions artifacts with 30-day retention
- developed complete documentation covering setup, deployment, troubleshooting, and cost analysis for the automation system

## 2024-12-15
- deployed TPL Web Usage Analyzer to production on company Vercel instance - live at nyt-tpl-highlighter-hg8orq5d9-nytimes-projects.vercel.app
- created GitHub repository under luis-nyt/nyt-tpl-highlighter with complete project history and auto-deployment setup
- finalized ultra-minimal landing page design with white background and tight spacing for maximum simplicity
- updated project title to 'TPL Web Usage Analyzer' and removed all decorative elements for professional appearance
- aligned all sections flush with header by removing horizontal padding for clean typography
- simplified manual installation section by removing detailed step-by-step instructions
- implemented gray secondary button styling for copy functionality with subtle visual hierarchy

## 2024-12-13
- fixed broken bookmarklet page by properly encoding JavaScript code - resolved HTML parsing issues in advanced-analytics-bookmarklet.html
- added copy/paste functionality for bookmarklet installation - included textarea with complete code and copy button for corporate environments
- enhanced bookmarklet with detailed "Other" category analysis - now interprets tpl-lbl as "Label/Text identifier" and other unclear tokens
- implemented comprehensive screen real estate calculations - shows percentage of page area covered by TPL components with individual element percentages
- created strategic TPL design system analyzer - provides category breakdowns, coverage efficiency metrics, and component density analysis
- resolved Chrome extension policy restrictions - provided alternative bookmarklet and direct JavaScript methods for testing in corporate environments
- created missing icon files for Chrome extension - copied icon16.png to create icon48.png and icon128.png for proper manifest compliance
