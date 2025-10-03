/**
 * Article Token Analyzer - Analyzes a specific NYT article for TPL token usage
 * This script fetches a real article page and inspects it for token patterns
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class ArticleTokenAnalyzer {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Set a realistic user agent
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  }

  async analyzeTokenUsage(url) {
    console.log(`🔍 Fetching article: ${url}`);
    
    // Navigate to the article
    await this.page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for page to fully render
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📄 Page loaded, analyzing for token patterns...');

    // Extract comprehensive token analysis
    const analysis = await this.page.evaluate(() => {
      const results = {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        cssCustomProperties: new Set(),
        computedStyles: {},
        stylesheetRules: [],
        elementAnalysis: [],
        tplClassElements: [],
        potentialTokenValues: new Set()
      };

      // 1. Find all CSS Custom Properties (CSS Variables)
      console.log('🔍 Scanning for CSS custom properties...');
      
      // Check all stylesheets for --tpl-* variables
      try {
        for (let i = 0; i < document.styleSheets.length; i++) {
          const sheet = document.styleSheets[i];
          try {
            const rules = sheet.cssRules || sheet.rules;
            for (let j = 0; j < rules.length; j++) {
              const rule = rules[j];
              if (rule.style && rule.style.cssText) {
                const cssText = rule.style.cssText;
                // Look for CSS custom properties
                const customPropMatches = cssText.match(/--[\w-]+/g);
                if (customPropMatches) {
                  customPropMatches.forEach(prop => {
                    if (prop.includes('tpl')) {
                      results.cssCustomProperties.add(prop);
                    }
                  });
                }
                
                // Look for var() usage
                const varMatches = cssText.match(/var\(--[\w-]+\)/g);
                if (varMatches) {
                  varMatches.forEach(varUsage => {
                    if (varUsage.includes('tpl')) {
                      results.cssCustomProperties.add(varUsage);
                    }
                  });
                }
                
                // Store rule info if it contains TPL references
                if (cssText.includes('tpl')) {
                  results.stylesheetRules.push({
                    selector: rule.selectorText || 'unknown',
                    cssText: cssText,
                    type: rule.type
                  });
                }
              }
            }
          } catch (e) {
            // Cross-origin or other stylesheet access issues
            console.log('Stylesheet access blocked:', sheet.href);
          }
        }
      } catch (e) {
        console.log('Error accessing stylesheets:', e.message);
      }

      // 2. Analyze elements for TPL class usage (existing detection)
      console.log('🎯 Scanning for TPL class usage...');
      const allElements = document.querySelectorAll('*');
      
      allElements.forEach((element, index) => {
        const analysis = {
          index,
          tagName: element.tagName,
          id: element.id || null,
          classes: [],
          tplClasses: [],
          computedStyles: {},
          inlineStyles: {},
          customProperties: []
        };

        // Check class names
        if (element.className && typeof element.className === 'string') {
          analysis.classes = element.className.split(' ').filter(c => c.length > 0);
          analysis.tplClasses = analysis.classes.filter(c => c.includes('tpl'));
        }

        // If this element has TPL classes, analyze it deeply
        if (analysis.tplClasses.length > 0) {
          results.tplClassElements.push(analysis);
          
          // Get computed styles for TPL elements
          const computed = window.getComputedStyle(element);
          analysis.computedStyles = {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize,
            fontFamily: computed.fontFamily,
            fontWeight: computed.fontWeight,
            margin: computed.margin,
            padding: computed.padding,
            borderRadius: computed.borderRadius,
            borderColor: computed.borderColor,
            borderWidth: computed.borderWidth
          };
        }

        // Check for inline style custom properties
        if (element.style && element.style.cssText) {
          const inlineCSS = element.style.cssText;
          analysis.inlineStyles.cssText = inlineCSS;
          
          // Look for custom properties in inline styles
          const customProps = inlineCSS.match(/--[\w-]+/g);
          if (customProps) {
            customProps.forEach(prop => {
              if (prop.includes('tpl')) {
                analysis.customProperties.push(prop);
                results.cssCustomProperties.add(prop);
              }
            });
          }
        }

        // Sample every 100th element for broader analysis
        if (index % 100 === 0) {
          results.elementAnalysis.push(analysis);
        }
      });

      // 3. Look for common TPL color/spacing values in computed styles
      console.log('🎨 Analyzing computed style values...');
      const commonTPLColors = [
        'rgb(50, 104, 145)', // #326891
        'rgb(255, 107, 53)',  // #ff6b35
        'rgb(0, 0, 0)',       // Common text colors
        'rgb(255, 255, 255)', // White
        'rgb(238, 238, 238)', // Light gray
        'rgb(117, 117, 117)'  // Medium gray
      ];

      results.tplClassElements.forEach(element => {
        const styles = element.computedStyles;
        Object.entries(styles).forEach(([property, value]) => {
          if (commonTPLColors.includes(value)) {
            results.potentialTokenValues.add(`${property}: ${value}`);
          }
        });
      });

      // Convert Sets to Arrays for JSON serialization
      return {
        ...results,
        cssCustomProperties: Array.from(results.cssCustomProperties),
        potentialTokenValues: Array.from(results.potentialTokenValues)
      };
    });

    console.log(`✅ Analysis complete!`);
    console.log(`   📊 Found ${analysis.tplClassElements.length} elements with TPL classes`);
    console.log(`   🎨 Found ${analysis.cssCustomProperties.length} CSS custom properties`);
    console.log(`   📝 Found ${analysis.stylesheetRules.length} stylesheet rules with TPL references`);

    return analysis;
  }

  async saveAnalysis(analysis, filename) {
    const outputPath = path.join(__dirname, '..', 'data', 'reports', filename);
    await fs.writeFile(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`💾 Analysis saved to: ${outputPath}`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function main() {
  const analyzer = new ArticleTokenAnalyzer();
  
  try {
    await analyzer.init();
    
    const articleUrl = 'https://www.nytimes.com/2025/09/25/us/politics/trump-argentina-milei-bailout.html';
    const analysis = await analyzer.analyzeTokenUsage(articleUrl);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `article-token-analysis-${timestamp}.json`;
    
    await analyzer.saveAnalysis(analysis, filename);
    
    // Print summary
    console.log('\n📈 ANALYSIS SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`🔗 URL: ${analysis.url}`);
    console.log(`📅 Analyzed: ${analysis.timestamp}`);
    console.log(`🎯 TPL Class Elements: ${analysis.tplClassElements.length}`);
    console.log(`🎨 CSS Custom Properties: ${analysis.cssCustomProperties.length}`);
    console.log(`📝 Stylesheet Rules: ${analysis.stylesheetRules.length}`);
    console.log(`🎨 Potential Token Values: ${analysis.potentialTokenValues.length}`);
    
    if (analysis.cssCustomProperties.length > 0) {
      console.log('\n🔍 CSS Custom Properties Found:');
      analysis.cssCustomProperties.forEach(prop => console.log(`   ${prop}`));
    }
    
    if (analysis.tplClassElements.length > 0) {
      console.log(`\n🎯 Sample TPL Class Elements (first 5):`);
      analysis.tplClassElements.slice(0, 5).forEach((el, i) => {
        console.log(`   ${i + 1}. <${el.tagName}> classes: ${el.tplClasses.join(', ')}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await analyzer.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = ArticleTokenAnalyzer;
