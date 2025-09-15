#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * TPL Coverage Data Collector
 * Automates the bookmarklet functionality to collect coverage data and screenshots
 */
class TPLCoverageCollector {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshotDir = 'screenshots';
  }

  async initialize() {
    // Launch browser with appropriate settings for GitHub Actions
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set viewport to standard desktop size
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Create screenshots directory
    await fs.mkdir(this.screenshotDir, { recursive: true });
  }

  async collectCoverageData(url) {
    console.log(`Collecting TPL coverage data for: ${url}`);
    
    try {
      // Navigate to the page
      await this.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for page to fully load
      await this.page.waitForTimeout(3000);

      // Inject the TPL detection logic (extracted from bookmarklet)
      const coverageData = await this.page.evaluate(() => {
        // TPL Detection Logic (cleaned up from bookmarklet)
        function detectTPLElements() {
          const allElements = document.querySelectorAll('*');
          const tplElements = [];
          let totalArea = 0;
          
          // Calculate total page area
          const pageArea = Math.max(
            document.body.scrollHeight || 0,
            document.documentElement.scrollHeight || 0
          ) * Math.max(
            document.body.scrollWidth || 0,
            document.documentElement.scrollWidth || 0
          );

          allElements.forEach(el => {
            const className = el.className;
            if (typeof className === 'string' && className.indexOf('tpl') > -1) {
              // Filter out our own classes and get TPL classes
              const classes = className.split(' ').filter(c => 
                c.indexOf('tpl') > -1 && 
                !c.includes('tpl-h') && 
                !c.includes('tpl-bottombar') && 
                !c.includes('tpl-coverage') &&
                !c.includes('tpl-btn') && 
                !c.includes('tpl-close')
              );
              
              if (classes.length > 0) {
                const rect = el.getBoundingClientRect();
                const area = rect.width * rect.height;
                totalArea += area;
                
                tplElements.push({
                  tagName: el.tagName,
                  classes: classes,
                  area: area,
                  rect: {
                    width: rect.width,
                    height: rect.height,
                    x: rect.x,
                    y: rect.y
                  }
                });
              }
            }
          });

          const totalCoveragePercent = (totalArea / pageArea * 100);
          
          return {
            url: window.location.href,
            timestamp: new Date().toISOString(),
            totalElements: tplElements.length,
            totalCoveragePercent: parseFloat(totalCoveragePercent.toFixed(2)),
            pageArea: pageArea,
            totalTPLArea: totalArea,
            elements: tplElements,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            },
            pageTitle: document.title,
            pageDescription: document.querySelector('meta[name="description"]')?.content || ''
          };
        }

        return detectTPLElements();
      });

      // Calculate viewport coverage
      const viewportCoverage = await this.page.evaluate(() => {
        const viewportArea = window.innerWidth * window.innerHeight;
        let visibleTPLArea = 0;

        document.querySelectorAll('*').forEach(el => {
          const className = el.className;
          if (typeof className === 'string' && className.indexOf('tpl') > -1) {
            const classes = className.split(' ').filter(c => 
              c.indexOf('tpl') > -1 && 
              !c.includes('tpl-h') && 
              !c.includes('tpl-bottombar')
            );
            
            if (classes.length > 0) {
              const rect = el.getBoundingClientRect();
              if (rect.bottom > 0 && rect.top < window.innerHeight && 
                  rect.right > 0 && rect.left < window.innerWidth) {
                const visibleWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
                const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
                if (visibleWidth > 0 && visibleHeight > 0) {
                  visibleTPLArea += visibleWidth * visibleHeight;
                }
              }
            }
          }
        });

        return parseFloat((visibleTPLArea / viewportArea * 100).toFixed(2));
      });

      coverageData.viewportCoveragePercent = viewportCoverage;

      // Take screenshot
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const urlSlug = new URL(url).pathname.replace(/\//g, '_') || 'homepage';
      const screenshotPath = path.join(this.screenshotDir, `tpl-coverage-${urlSlug}-${timestamp}.png`);
      
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: 'png'
      });

      coverageData.screenshotPath = screenshotPath;

      // Log results
      console.log(`✅ Coverage data collected for ${url}:`);
      console.log(`   - TPL Elements: ${coverageData.totalElements}`);
      console.log(`   - Total Coverage: ${coverageData.totalCoveragePercent}%`);
      console.log(`   - Viewport Coverage: ${coverageData.viewportCoveragePercent}%`);
      console.log(`   - Screenshot: ${screenshotPath}`);

      return coverageData;

    } catch (error) {
      console.error(`❌ Error collecting data for ${url}:`, error.message);
      return {
        url: url,
        timestamp: new Date().toISOString(),
        error: error.message,
        success: false
      };
    }
  }

  async sendToAPI(data) {
    const apiEndpoint = process.env.VERCEL_API_ENDPOINT;
    if (!apiEndpoint) {
      console.log('📁 Saving data locally (no API endpoint configured)');
      const filename = `coverage-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await fs.writeFile(filename, JSON.stringify(data, null, 2));
      return;
    }

    try {
      const axios = require('axios');
      await axios.post(`${apiEndpoint}/api/coverage`, data);
      console.log('✅ Data sent to API successfully');
    } catch (error) {
      console.error('❌ Failed to send data to API:', error.message);
      // Fallback: save locally
      const filename = `coverage-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await fs.writeFile(filename, JSON.stringify(data, null, 2));
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function main() {
  const targetUrl = process.argv[2];
  if (!targetUrl) {
    console.error('Usage: node collect-coverage.js <url>');
    process.exit(1);
  }

  const collector = new TPLCoverageCollector();
  
  try {
    await collector.initialize();
    const data = await collector.collectCoverageData(targetUrl);
    await collector.sendToAPI(data);
  } catch (error) {
    console.error('❌ Collection failed:', error);
    process.exit(1);
  } finally {
    await collector.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = TPLCoverageCollector;
