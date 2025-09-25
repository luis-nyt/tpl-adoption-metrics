#!/usr/bin/env node

/**
 * Multi-Viewport TPL Data Collection Script
 * Analyzes configured NYT pages across multiple breakpoints and saves TPL adoption metrics
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const TPLAnalyzer = require('./tpl-analyzer');

class MultiViewportDataCollector {
  constructor() {
    this.analyzer = new TPLAnalyzer();
    this.browser = null;
    this.results = [];
  }

  async init() {
    console.log('🚀 Starting multi-viewport TPL data collection...');
    
    // Launch headless browser
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    console.log('📝 Browser launched successfully');
  }

  async loadConfig() {
    try {
      const configPath = path.join(__dirname, '../config/pages.yml');
      const configFile = await fs.readFile(configPath, 'utf8');
      const config = yaml.load(configFile);
      
      // Set default viewports if not specified
      if (!config.viewports) {
        config.viewports = {
          desktop: { width: 1440, height: 900, name: "Desktop", priority: "high" }
        };
      }
      
      const viewportCount = Object.keys(config.viewports).length;
      console.log(`📋 Loaded config with ${config.pages.length} pages to analyze`);
      console.log(`📐 Testing ${viewportCount} viewports: ${Object.keys(config.viewports).join(', ')}`);
      
      return config;
    } catch (error) {
      console.error('❌ Failed to load config:', error.message);
      throw error;
    }
  }

  async analyzePageAllViewports(pageConfig, config) {
    const viewportResults = {};
    
    console.log(`🔍 Analyzing: ${pageConfig.name} (${pageConfig.url})`);
    
    for (const [viewportName, viewport] of Object.entries(config.viewports)) {
      const page = await this.browser.newPage();
      
      try {
        console.log(`   📱 ${viewport.name} (${viewport.width}×${viewport.height})`);
        
        // Set viewport for this breakpoint
        await page.setViewport({ 
          width: viewport.width, 
          height: viewport.height 
        });
        
        // Navigate to page with generous timeout
        await page.goto(pageConfig.url, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });

        // Wait for page to fully load and render
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Run TPL analysis for this viewport
        const analysisResults = await this.analyzer.analyzePage(page);
        
        viewportResults[viewportName] = {
          viewport: {
            name: viewport.name,
            width: viewport.width,
            height: viewport.height,
            deviceType: viewport.deviceType || 'desktop'
          },
          analysis: analysisResults
        };
        
        console.log(`      ✅ Found ${analysisResults.elementCount} TPL elements (${analysisResults.totalCoveragePercent}% coverage)`);
        
      } catch (error) {
        console.error(`      ❌ Failed to analyze ${viewport.name}:`, error.message);
        viewportResults[viewportName] = {
          viewport: {
            name: viewport.name,
            width: viewport.width,
            height: viewport.height,
            deviceType: viewport.deviceType || 'desktop'
          },
          error: error.message,
          analysis: null
        };
      } finally {
        await page.close();
      }
      
      // Brief pause between viewport analyses
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return {
      pageConfig,
      viewportResults,
      crossViewportAnalysis: this.generateCrossViewportAnalysis(viewportResults)
    };
  }

  generateCrossViewportAnalysis(viewportResults) {
    const successfulResults = Object.entries(viewportResults)
      .filter(([_, result]) => result.analysis !== null)
      .map(([name, result]) => ({ name, ...result }));

    if (successfulResults.length === 0) {
      return { error: "No successful viewport analyses" };
    }

    // Calculate coverage variance across viewports
    const coverages = successfulResults.map(r => r.analysis.totalCoveragePercent);
    const elementCounts = successfulResults.map(r => r.analysis.elementCount);
    
    // Find common and unique components across viewports
    const allComponents = new Set();
    const componentsByViewport = {};
    
    successfulResults.forEach(result => {
      const components = result.analysis.topComponents || [];
      componentsByViewport[result.name] = components;
      components.forEach(comp => allComponents.add(comp));
    });
    
    // Calculate component consistency (how many viewports share common components)
    const componentConsistency = {};
    Array.from(allComponents).forEach(component => {
      const viewportCount = Object.values(componentsByViewport)
        .filter(components => components.includes(component)).length;
      componentConsistency[component] = viewportCount / successfulResults.length;
    });
    
    return {
      coverageVariance: {
        min: Math.min(...coverages),
        max: Math.max(...coverages),
        average: coverages.reduce((a, b) => a + b, 0) / coverages.length,
        range: Math.max(...coverages) - Math.min(...coverages)
      },
      elementCountVariance: {
        min: Math.min(...elementCounts),
        max: Math.max(...elementCounts),
        average: elementCounts.reduce((a, b) => a + b, 0) / elementCounts.length,
        range: Math.max(...elementCounts) - Math.min(...elementCounts)
      },
      componentConsistency,
      viewportSpecificComponents: this.findViewportSpecificComponents(componentsByViewport),
      responsiveAdoptionScore: this.calculateResponsiveScore(viewportResults)
    };
  }

  findViewportSpecificComponents(componentsByViewport) {
    const result = {};
    Object.entries(componentsByViewport).forEach(([viewport, components]) => {
      const uniqueComponents = components.filter(comp => 
        !Object.entries(componentsByViewport)
          .filter(([v, _]) => v !== viewport)
          .some(([_, otherComponents]) => otherComponents.includes(comp))
      );
      if (uniqueComponents.length > 0) {
        result[viewport] = uniqueComponents;
      }
    });
    return result;
  }

  calculateResponsiveScore(viewportResults) {
    const successfulResults = Object.values(viewportResults)
      .filter(result => result.analysis !== null);
    
    if (successfulResults.length < 2) return 0;
    
    const coverages = successfulResults.map(r => r.analysis.totalCoveragePercent);
    const variance = this.calculateVariance(coverages);
    
    // Lower variance = higher responsive score (more consistent across devices)
    // Scale to 0-1 where 1 = perfect consistency
    return Math.max(0, 1 - (variance / 100));
  }

  calculateVariance(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  async collectAllData(config) {
    const results = [];
    
    for (const pageConfig of config.pages) {
      const result = await this.analyzePageAllViewports(pageConfig, config);
      results.push(result);
      
      // Brief pause between pages to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  async saveRawData(results) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].slice(0, 5).replace(':', ''); // HHMM format
    
    // Ensure directory exists
    const rawDir = path.join(__dirname, '../data/raw', dateStr);
    await fs.mkdir(rawDir, { recursive: true });
    
    const savedFiles = [];
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const pageConfig = result.pageConfig;
      
      // Save multi-viewport result with timestamp
      const filename = `${pageConfig.section}-${i.toString().padStart(2, '0')}-multiview-${dateStr.replace(/-/g, '')}-${timeStr}.json`;
      const filePath = path.join(rawDir, filename);
      
      const multiViewportData = {
        url: pageConfig.url,
        pageType: pageConfig.type,
        section: pageConfig.section,
        timestamp: now.toISOString(),
        viewportResults: result.viewportResults,
        crossViewportAnalysis: result.crossViewportAnalysis
      };
      
      await fs.writeFile(filePath, JSON.stringify(multiViewportData, null, 2));
      savedFiles.push(filename);
      console.log(`💾 Saved multi-viewport data: ${filename}`);
    }
    
    return savedFiles;
  }

  async generateDailySummary(results, config) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().split('T')[1].slice(0, 5).replace(':', ''); // HHMM format
    
    // Filter successful results
    const successfulResults = results.filter(r => r.crossViewportAnalysis && !r.crossViewportAnalysis.error);
    
    if (successfulResults.length === 0) {
      console.log('⚠️  No successful analyses to summarize');
      return null;
    }
    
    // Generate viewport-specific summaries
    const viewportSummaries = {};
    const viewportNames = Object.keys(config.viewports);
    
    viewportNames.forEach(viewportName => {
      const viewportPages = successfulResults.map(result => {
        const viewportResult = result.viewportResults[viewportName];
        if (!viewportResult || !viewportResult.analysis) return null;
        
        return {
          url: result.pageConfig.url,
          pageType: result.pageConfig.type,
          section: result.pageConfig.section,
          viewport: viewportName,
          viewportSize: `${viewportResult.viewport.width}x${viewportResult.viewport.height}`,
          deviceType: viewportResult.viewport.deviceType,
          tplCoverage: viewportResult.analysis.totalCoveragePercent,
          elementCount: viewportResult.analysis.elementCount,
          topComponents: viewportResult.analysis.topComponents || []
        };
      }).filter(page => page !== null);
      
      if (viewportPages.length > 0) {
        const totalCoverage = viewportPages.reduce((sum, page) => sum + page.tplCoverage, 0);
        const averageCoverage = Math.round((totalCoverage / viewportPages.length) * 10) / 10;
        
        viewportSummaries[viewportName] = {
          pages: viewportPages,
          averageCoverage,
          totalPagesAnalyzed: viewportPages.length
        };
      }
    });
    
    // Generate cross-viewport insights
    const crossViewportInsights = this.generateCrossViewportInsights(successfulResults);
    
    const multiViewportSummary = {
      date: dateStr,
      type: "multi-viewport-analysis",
      viewportSummaries,
      crossViewportInsights,
      totalPagesAnalyzed: successfulResults.length,
      viewportsTested: viewportNames
    };
    
    // Save multi-viewport summary with timestamp
    const dailyDir = path.join(__dirname, '../data/daily');
    await fs.mkdir(dailyDir, { recursive: true });
    
    const summaryPath = path.join(dailyDir, `${dateStr}-${timeStr}-multiview.json`);
    await fs.writeFile(summaryPath, JSON.stringify(multiViewportSummary, null, 2));
    
    console.log(`📊 Generated multi-viewport summary: ${dateStr}-${timeStr}-multiview.json`);
    
    // Enhanced TUI output with adoption ratings
    this.displayAdoptionSummary(viewportSummaries);
    
    return multiViewportSummary;
  }

  displayAdoptionSummary(viewportSummaries) {
    console.log('');
    console.log('📱 TPL ADOPTION ANALYSIS');
    console.log('');
    
    // Individual viewport results
    Object.entries(viewportSummaries).forEach(([viewportName, summary]) => {
      const coverage = summary.averageCoverage;
      const elementCount = summary.pages[0]?.elementCount || 0;
      
      console.log(`   ${this.getViewportIcon(viewportName)} ${viewportName.charAt(0).toUpperCase() + viewportName.slice(1)}: ${coverage}% coverage (${elementCount} elements)`);
    });
    
    console.log('');
    
    // Combined results
    const coverages = Object.values(viewportSummaries).map(s => s.averageCoverage);
    const avgCoverage = coverages.reduce((a, b) => a + b, 0) / coverages.length;
    
    console.log(`   🎯 Combined: ${Math.round(avgCoverage * 10) / 10}% average coverage`);
    console.log('');
  }

  getViewportIcon(viewportName) {
    const icons = {
      mobile: '📱',
      tablet: '📱', 
      desktop: '💻',
      large_desktop: '🖥️'
    };
    return icons[viewportName] || '📊';
  }


  generateCrossViewportInsights(results) {
    const allCrossAnalyses = results.map(r => r.crossViewportAnalysis);
    
    // Calculate overall responsive adoption score
    const responsiveScores = allCrossAnalyses.map(a => a.responsiveAdoptionScore);
    const avgResponsiveScore = responsiveScores.reduce((a, b) => a + b, 0) / responsiveScores.length;
    
    // Find most consistent components across all pages and viewports
    const globalComponentConsistency = {};
    allCrossAnalyses.forEach(analysis => {
      Object.entries(analysis.componentConsistency || {}).forEach(([component, score]) => {
        if (!globalComponentConsistency[component]) {
          globalComponentConsistency[component] = [];
        }
        globalComponentConsistency[component].push(score);
      });
    });
    
    const mostConsistentComponents = Object.entries(globalComponentConsistency)
      .map(([component, scores]) => ({
        component,
        averageConsistency: scores.reduce((a, b) => a + b, 0) / scores.length
      }))
      .sort((a, b) => b.averageConsistency - a.averageConsistency)
      .slice(0, 5);
    
    return {
      overallResponsiveScore: Math.round(avgResponsiveScore * 100) / 100,
      mostConsistentComponents,
      coveragePatterns: this.analyzeCoveragePatterns(results),
      deviceSpecificInsights: this.analyzeDeviceSpecificPatterns(results)
    };
  }

  analyzeCoveragePatterns(results) {
    const patterns = {
      mobileFirst: 0,
      desktopFirst: 0,
      consistent: 0
    };
    
    results.forEach(result => {
      const viewportResults = result.viewportResults;
      const mobileResult = viewportResults.mobile?.analysis;
      const desktopResult = viewportResults.desktop?.analysis;
      
      if (mobileResult && desktopResult) {
        const mobileCoverage = mobileResult.totalCoveragePercent;
        const desktopCoverage = desktopResult.totalCoveragePercent;
        
        if (mobileCoverage > desktopCoverage + 5) {
          patterns.mobileFirst++;
        } else if (desktopCoverage > mobileCoverage + 5) {
          patterns.desktopFirst++;
        } else {
          patterns.consistent++;
        }
      }
    });
    
    return patterns;
  }

  analyzeDeviceSpecificPatterns(results) {
    const devicePatterns = {};
    
    results.forEach(result => {
      Object.entries(result.crossViewportAnalysis.viewportSpecificComponents || {}).forEach(([viewport, components]) => {
        if (!devicePatterns[viewport]) {
          devicePatterns[viewport] = new Set();
        }
        components.forEach(comp => devicePatterns[viewport].add(comp));
      });
    });
    
    // Convert sets to arrays for JSON serialization
    Object.keys(devicePatterns).forEach(viewport => {
      devicePatterns[viewport] = Array.from(devicePatterns[viewport]);
    });
    
    return devicePatterns;
  }

  logSummaryInsights(insights) {
    console.log(`   📈 Overall responsive score: ${(insights.overallResponsiveScore * 100).toFixed(1)}%`);
    console.log(`   🏆 Most consistent component: ${insights.mostConsistentComponents[0]?.component || 'none'}`);
    
    const patterns = insights.coveragePatterns;
    const totalPages = patterns.mobileFirst + patterns.desktopFirst + patterns.consistent;
    if (totalPages > 0) {
      console.log(`   📱 Coverage patterns: ${patterns.mobileFirst} mobile-first, ${patterns.desktopFirst} desktop-first, ${patterns.consistent} consistent`);
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser closed');
    }
  }

  async run() {
    try {
      await this.init();
      const config = await this.loadConfig();
      const results = await this.collectAllData(config);
      
      await this.saveRawData(results);
      await this.generateDailySummary(results, config);
      
      console.log('✅ Data collection completed!');
      
    } catch (error) {
      console.error('❌ Multi-viewport data collection failed:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const collector = new MultiViewportDataCollector();
  collector.run();
}

module.exports = MultiViewportDataCollector;
