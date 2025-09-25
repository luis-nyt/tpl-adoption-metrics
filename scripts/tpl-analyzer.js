/**
 * TPL Analyzer - Extracts TPL design system usage metrics from web pages
 * Based on the bookmarklet logic from tpl-highlighter-web.html
 */

class TPLAnalyzer {
  constructor() {
    this.elements = [];
    this.totalCoveragePercent = 0;
  }

  /**
   * Main detection function - finds all TPL elements and calculates coverage
   * This mirrors the detect() function from the bookmarklet
   */
  async analyzePage(page) {
    return await page.evaluate(() => {
      // Inject the TPL detection logic into the page
      const analyzer = {
        elements: [],
        totalCoveragePercent: 0,

        detect: function() {
          const all = document.querySelectorAll('*');
          let totalArea = 0;
          const pageArea = Math.max(
            document.body.scrollHeight || 0,
            document.documentElement.scrollHeight || 0
          ) * Math.max(
            document.body.scrollWidth || 0,
            document.documentElement.scrollWidth || 0
          );

          this.elements = [];

          all.forEach((el) => {
            const cls = el.className;
            if (typeof cls === 'string' && cls.indexOf('tpl') > -1 && 
                !cls.includes('tpl-bottombar') && 
                !cls.includes('tpl-coverage') && 
                !cls.includes('tpl-btn') && 
                !cls.includes('tpl-close')) {
              
              const classes = cls.split(' ').filter((c) => 
                c.indexOf('tpl') > -1 && 
                !c.includes('tpl-bottombar') && 
                !c.includes('tpl-coverage') && 
                !c.includes('tpl-btn') && 
                !c.includes('tpl-close')
              );

              if (classes.length > 0) {
                const rect = el.getBoundingClientRect();
                const area = rect.width * rect.height;
                totalArea += area;

                this.elements.push({
                  id: el.id || `element-${this.elements.length}`,
                  tagName: el.tagName,
                  classes: classes,
                  position: {
                    x: Math.round(rect.left + window.scrollX),
                    y: Math.round(rect.top + window.scrollY),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                  },
                  area: Math.round(area),
                  isVisible: rect.width > 0 && rect.height > 0,
                  inViewport: rect.bottom > 0 && rect.top < window.innerHeight && 
                             rect.right > 0 && rect.left < window.innerWidth
                });
              }
            }
          });

          this.totalCoveragePercent = totalArea > 0 ? (totalArea / pageArea * 100) : 0;
          return this.elements.length;
        },

        calculateViewportCoverage: function() {
          const viewportArea = window.innerWidth * window.innerHeight;
          let visibleTPLArea = 0;

          this.elements.forEach((item) => {
            const rect = {
              left: item.position.x - window.scrollX,
              top: item.position.y - window.scrollY,
              right: item.position.x - window.scrollX + item.position.width,
              bottom: item.position.y - window.scrollY + item.position.height
            };

            if (rect.bottom > 0 && rect.top < window.innerHeight && 
                rect.right > 0 && rect.left < window.innerWidth) {
              const visibleWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
              const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
              
              if (visibleWidth > 0 && visibleHeight > 0) {
                visibleTPLArea += visibleWidth * visibleHeight;
              }
            }
          });

          return visibleTPLArea > 0 ? (visibleTPLArea / viewportArea * 100) : 0;
        },

        getComponentSummary: function() {
          const componentCounts = {};
          const componentAreas = {};

          this.elements.forEach((element) => {
            element.classes.forEach((className) => {
              if (!componentCounts[className]) {
                componentCounts[className] = 0;
                componentAreas[className] = 0;
              }
              componentCounts[className]++;
              componentAreas[className] += element.area;
            });
          });

          const components = Object.keys(componentCounts).map((className) => ({
            selector: `.${className}`,
            count: componentCounts[className],
            totalArea: componentAreas[className],
            averageArea: Math.round(componentAreas[className] / componentCounts[className]),
            coveragePercent: componentAreas[className] / (
              Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0) *
              Math.max(document.body.scrollWidth || 0, document.documentElement.scrollWidth || 0)
            ) * 100
          }));

          // Sort by total area (descending)
          components.sort((a, b) => b.totalArea - a.totalArea);

          return components;
        }
      };

      // Run the analysis
      const elementCount = analyzer.detect();
      const viewportCoverage = analyzer.calculateViewportCoverage();
      const components = analyzer.getComponentSummary();

      // Get top 3 components by usage
      const topComponents = components
        .slice(0, 3)
        .map(comp => comp.selector.replace('.', ''));

      return {
        elementCount,
        totalCoveragePercent: Math.round(analyzer.totalCoveragePercent * 10) / 10,
        viewportCoveragePercent: Math.round(viewportCoverage * 10) / 10,
        topComponents,
        components,
        elements: analyzer.elements
      };
    });
  }

  /**
   * Generate the simplified summary format for daily aggregation
   */
  formatPageSummary(url, pageConfig, analysisResults) {
    return {
      url,
      pageType: pageConfig.type,
      section: pageConfig.section,
      tplCoverage: analysisResults.totalCoveragePercent,
      elementCount: analysisResults.elementCount,
      topComponents: analysisResults.topComponents
    };
  }

  /**
   * Generate the detailed format for raw data storage
   */
  formatDetailedResults(url, pageConfig, analysisResults) {
    return {
      url,
      pageType: pageConfig.type,
      section: pageConfig.section,
      tplCoverage: analysisResults.totalCoveragePercent,
      elementCount: analysisResults.elementCount,
      topComponents: analysisResults.topComponents,
      _detailed: {
        elementCount: analysisResults.elementCount,
        totalCoveragePercent: analysisResults.totalCoveragePercent,
        viewportCoveragePercent: analysisResults.viewportCoveragePercent,
        topComponents: analysisResults.topComponents,
        components: analysisResults.components,
        elements: analysisResults.elements
      }
    };
  }
}

module.exports = TPLAnalyzer;
