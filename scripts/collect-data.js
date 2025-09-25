#!/usr/bin/env node

/**
 * TPL Data Collection Script
 * Analyzes configured NYT pages and saves TPL adoption metrics
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const TPLAnalyzer = require('./tpl-analyzer');

class DataCollector {
  constructor() {
    this.analyzer = new TPLAnalyzer();
    this.browser = null;
    this.results = [];
  }

  async init() {
    console.log('🚀 Starting TPL data collection...');
    
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
      console.log(`📋 Loaded config with ${config.pages.length} pages to analyze`);
      return config;
    } catch (error) {
      console.error('❌ Failed to load config:', error.message);
      throw error;
    }
  }

  async analyzePage(pageConfig) {
    const page = await this.browser.newPage();
    
    try {
      console.log(`🔍 Analyzing: ${pageConfig.name} (${pageConfig.url})`);
      
      // Set viewport to standard desktop size
      await page.setViewport({ width: 1200, height: 800 });
      
      // Navigate to page with generous timeout
      await page.goto(pageConfig.url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for page to fully load and render
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Run TPL analysis
      const analysisResults = await this.analyzer.analyzePage(page);
      
      console.log(`   ✅ Found ${analysisResults.elementCount} TPL elements (${analysisResults.totalCoveragePercent}% coverage)`);
      
      return {
        pageConfig,
        results: analysisResults
      };
      
    } catch (error) {
      console.error(`   ❌ Failed to analyze ${pageConfig.name}:`, error.message);
      return {
        pageConfig,
        error: error.message,
        results: null
      };
    } finally {
      await page.close();
    }
  }

  async collectAllData(config) {
    const results = [];
    
    for (const pageConfig of config.pages) {
      const result = await this.analyzePage(pageConfig);
      results.push(result);
      
      // Brief pause between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  async saveRawData(results) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
    
    // Ensure directory exists
    const rawDir = path.join(__dirname, '../data/raw', dateStr);
    await fs.mkdir(rawDir, { recursive: true });
    
    const savedFiles = [];
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (!result.results) continue; // Skip failed analyses
      
      const pageConfig = result.pageConfig;
      const filename = `${pageConfig.section}-${i.toString().padStart(2, '0')}-${dateStr.replace(/-/g, '')}.json`;
      const filePath = path.join(rawDir, filename);
      
      const detailedData = this.analyzer.formatDetailedResults(
        pageConfig.url,
        pageConfig,
        result.results
      );
      
      await fs.writeFile(filePath, JSON.stringify(detailedData, null, 2));
      savedFiles.push(filename);
      console.log(`💾 Saved raw data: ${filename}`);
    }
    
    return savedFiles;
  }

  async generateDailySummary(results, config) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    // Filter successful results
    const successfulResults = results.filter(r => r.results !== null);
    
    if (successfulResults.length === 0) {
      console.log('⚠️  No successful analyses to summarize');
      return null;
    }
    
    // Generate page summaries
    const pages = successfulResults.map(result => 
      this.analyzer.formatPageSummary(
        result.pageConfig.url,
        result.pageConfig,
        result.results
      )
    );
    
    // Calculate aggregates
    const totalCoverage = pages.reduce((sum, page) => sum + page.tplCoverage, 0);
    const averageCoverage = Math.round((totalCoverage / pages.length) * 10) / 10;
    
    // Count component frequency
    const componentFrequency = {};
    pages.forEach(page => {
      page.topComponents.forEach(component => {
        componentFrequency[component] = (componentFrequency[component] || 0) + 1;
      });
    });
    
    const mostUsedComponents = Object.entries(componentFrequency)
      .map(([name, frequency]) => ({ name, frequency }))
      .sort((a, b) => b.frequency - a.frequency);
    
    // Coverage distribution using config thresholds
    const highThreshold = config.coverage?.high || 20;
    const mediumThreshold = config.coverage?.medium || 10;
    
    const coverageDistribution = {
      high: pages.filter(p => p.tplCoverage > highThreshold).length,
      medium: pages.filter(p => p.tplCoverage >= mediumThreshold && p.tplCoverage <= highThreshold).length,
      low: pages.filter(p => p.tplCoverage < mediumThreshold).length
    };
    
    const dailySummary = {
      date: dateStr,
      pages,
      aggregates: {
        averageCoverage,
        totalPagesAnalyzed: pages.length,
        mostUsedComponents,
        coverageDistribution
      }
    };
    
    // Save daily summary
    const dailyDir = path.join(__dirname, '../data/daily');
    await fs.mkdir(dailyDir, { recursive: true });
    
    const summaryPath = path.join(dailyDir, `${dateStr}.json`);
    await fs.writeFile(summaryPath, JSON.stringify(dailySummary, null, 2));
    
    console.log(`📊 Generated daily summary: ${dateStr}.json`);
    console.log(`   📈 Average coverage: ${averageCoverage}%`);
    console.log(`   📄 Pages analyzed: ${pages.length}`);
    console.log(`   🏆 Top component: ${mostUsedComponents[0]?.name || 'none'} (used on ${mostUsedComponents[0]?.frequency || 0} pages)`);
    
    return dailySummary;
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
      
      console.log('✅ Data collection completed successfully!');
      
    } catch (error) {
      console.error('❌ Data collection failed:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const collector = new DataCollector();
  collector.run();
}

module.exports = DataCollector;
