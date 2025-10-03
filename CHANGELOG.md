# Changelog

## 2025-10-02
- converted the metrics page to a table-only layout and removed charting code in `metrics.html` to simplify the view and focus on comparative scanning
- styled the header as a black nav bar with centered white title for clarity and emphasis; made both the main header and the table header sticky on scroll for better usability with long tables
- templated the data rows by replacing most cell values with placeholders; preserved only the 'News - Home / Web' date in the 'as of…' column and set all other dates to placeholders for clarity while wiring up dynamic data

## 2025-09-25
- renamed project from nyt-tpl-highlighter to tpl-adoption-metrics to better reflect focus on automated metrics collection rather than browser extension functionality
- updated package.json, README.md, and all internal references to use new project name and positioning
- repositioned project description to emphasize automated data collection and GitHub Actions workflow over manual highlighting tools
- maintained backward compatibility with existing bookmarklet and web tools while shifting primary focus to adoption metrics tracking

## 2025-09-24
- implemented complete automated TPL data collection system using puppeteer and headless browser automation
- converted bookmarklet logic into reusable Node.js module (tpl-analyzer.js) that extracts TPL adoption metrics programmatically  
- created data collection orchestrator (collect-data.js) that analyzes multiple NYT pages and saves both raw and aggregated data
- established file structure with /data/raw/ for detailed element-level analysis and /data/daily/ for trend-ready summaries
- added configuration system (/config/pages.yml) to manage which pages to analyze with categorization and priority settings
- built package.json with puppeteer and js-yaml dependencies plus npm scripts for easy data collection
- successfully tested full pipeline capturing 146 TPL elements with 21.3% coverage on NYT homepage
- generated schema-compliant JSON output matching recommended data structure for tracking adoption metrics over time
- implemented multi-viewport analysis system testing mobile (375x667), tablet (768x1024), desktop (1440x900), and large desktop (1920x1080) breakpoints
- discovered mobile-first TPL strategy with 62.3% coverage on mobile vs 18.4% on desktop - revealing 3x higher TPL adoption on mobile devices
- achieved 83% responsive design consistency score across all viewports with tpl-lb and tpl-lbl components appearing consistently
- created cross-viewport analytics including coverage variance analysis, component consistency tracking, and responsive adoption scoring
- standardized on 1440x900 desktop viewport based on NYT content width analysis showing ~1220px optimal layout width

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
