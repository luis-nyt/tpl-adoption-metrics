#!/usr/bin/env node

/**
 * Annotated Screenshot Generator
 * 
 * Generates full-page screenshots of NYT pages with TPL elements highlighted
 * Uses the same highlighting logic as the bookmarklet but optimized for automation
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class AnnotatedScreenshotGenerator {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-features=VizDisplayCompositor',
                '--disable-extensions',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        });
        this.page = await this.browser.newPage();
        
        // Set user agent for better compatibility
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }

    async generateAnnotatedScreenshot(url, viewport = { width: 1440, height: 900 }, outputPath) {
        console.log(`📸 Generating annotated screenshot for ${url}`);
        
        // Set viewport
        await this.page.setViewport(viewport);
        
        // Navigate to page with comprehensive loading
        await this.page.goto(url, { 
            waitUntil: 'networkidle2', // More balanced than networkidle0
            timeout: 60000 
        });

        // Wait for page to fully settle
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Quickly scroll to trigger lazy loading and ensure full page is rendered
        await this.page.evaluate(async () => {
            const scrollHeight = document.body.scrollHeight;
            // Scroll to bottom quickly
            window.scrollTo(0, scrollHeight);
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Scroll back to top
            window.scrollTo(0, 0);
            await new Promise(resolve => setTimeout(resolve, 500));
        });

        // Inject TPL highlighting styles and logic
        await this.page.addStyleTag({
            content: `
                .tpl-highlighted {
                    outline: 2px solid #ff6b35 !important;
                    background: rgba(255, 107, 53, 0.1) !important;
                    position: relative !important;
                }
                
                .tpl-highlighted::after {
                    content: attr(data-tpl-classes);
                    position: absolute !important;
                    top: -20px !important;
                    left: 0 !important;
                    background: #ff6b35 !important;
                    color: white !important;
                    font: 600 9px monospace !important;
                    padding: 2px 5px !important;
                    border-radius: 3px !important;
                    z-index: 9999 !important;
                    pointer-events: none !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                    white-space: nowrap !important;
                }

                /* Hide any existing TPL bars/overlays from bookmarklet */
                .tpl-bottombar,
                .tpl-topbar,
                .tpl-badge {
                    display: none !important;
                }
            `
        });

        // Find and highlight TPL elements
        const tplData = await this.page.evaluate(() => {
            const elements = [];
            const allElements = document.querySelectorAll('*');
            
            allElements.forEach(el => {
                const className = el.className;
                if (typeof className === 'string' && className.includes('tpl')) {
                    const tplClasses = className.split(' ')
                        .filter(cls => cls.includes('tpl'))
                        .filter(cls => !cls.includes('tpl-bottombar') && 
                                     !cls.includes('tpl-topbar') && 
                                     !cls.includes('tpl-badge'));
                    
                    if (tplClasses.length > 0) {
                        // Add highlighting class
                        el.classList.add('tpl-highlighted');
                        el.setAttribute('data-tpl-classes', tplClasses.join(', '));
                        
                        const rect = el.getBoundingClientRect();
                        elements.push({
                            classes: tplClasses,
                            area: rect.width * rect.height,
                            rect: {
                                x: rect.x,
                                y: rect.y,
                                width: rect.width,
                                height: rect.height
                            }
                        });
                    }
                }
            });

            return {
                elementCount: elements.length,
                elements: elements,
                pageHeight: Math.max(
                    document.body.scrollHeight,
                    document.documentElement.scrollHeight
                ),
                pageWidth: Math.max(
                    document.body.scrollWidth,
                    document.documentElement.scrollWidth
                )
            };
        });

        console.log(`✅ Found ${tplData.elementCount} TPL elements to highlight`);

        // Wait a moment for styles to apply
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get actual page dimensions
        const dimensions = await this.page.evaluate(() => {
            return {
                width: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
                height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
            };
        });

        console.log(`📏 Page dimensions: ${dimensions.width}x${dimensions.height}`);

        // Take full page screenshot
        const screenshotBuffer = await this.page.screenshot({
            path: outputPath,
            fullPage: true,
            type: 'png'
        });

        console.log(`💾 Screenshot saved to: ${outputPath}`);

        return {
            screenshotPath: outputPath,
            tplData: tplData,
            viewport: viewport,
            url: url
        };
    }

    async generateMultiViewportScreenshots(url, outputDir) {
        const viewports = [
            { name: 'mobile', width: 375, height: 667 },
            { name: 'desktop', width: 1440, height: 900 }
        ];

        const results = [];
        const timestamp = new Date().toISOString().slice(0, 16).replace(/:/g, '');

        for (const viewport of viewports) {
            const filename = `annotated-screenshot-${viewport.name}-${timestamp}.png`;
            const outputPath = path.join(outputDir, filename);
            
            try {
                const result = await this.generateAnnotatedScreenshot(url, viewport, outputPath);
                results.push({
                    viewport: viewport.name,
                    ...result
                });
            } catch (error) {
                console.error(`❌ Failed to generate ${viewport.name} screenshot:`, error.message);
            }
        }

        return results;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// CLI usage
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log(`
Usage: node annotated-screenshot.js <url> [output-path] [options]

Examples:
  node annotated-screenshot.js "https://www.nytimes.com/"
  node annotated-screenshot.js "https://www.nytimes.com/" "./screenshots/home.png"
  node annotated-screenshot.js "https://www.nytimes.com/" --multi-viewport

Options:
  --multi-viewport    Generate screenshots for mobile and desktop viewports
        `);
        process.exit(1);
    }

    const url = args[0];
    const isMultiViewport = args.includes('--multi-viewport');
    const outputPath = args[1] && !args[1].startsWith('--') ? args[1] : `./annotated-screenshot-${Date.now()}.png`;
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const generator = new AnnotatedScreenshotGenerator();
    
    try {
        await generator.initialize();
        
        if (isMultiViewport) {
            const outputDir = './screenshots';
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            const results = await generator.generateMultiViewportScreenshots(url, outputDir);
            console.log(`\n🎯 Generated ${results.length} annotated screenshots:`);
            results.forEach(result => {
                console.log(`  ${result.viewport}: ${result.screenshotPath}`);
            });
        } else {
            const result = await generator.generateAnnotatedScreenshot(url, undefined, outputPath);
            console.log(`\n🎯 Annotated screenshot complete!`);
            console.log(`   Found: ${result.tplData.elementCount} TPL elements`);
            console.log(`   Saved: ${result.screenshotPath}`);
        }
        
    } catch (error) {
        console.error('❌ Error generating screenshot:', error);
        process.exit(1);
    } finally {
        await generator.close();
    }
}

// Export for use as module
module.exports = AnnotatedScreenshotGenerator;

// Run CLI if called directly
if (require.main === module) {
    main();
}
