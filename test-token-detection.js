/**
 * Test script to validate token detection logic
 * Run this to check what tokens we might be missing
 */

// Load our token database
const fs = require('fs');
const path = require('path');

// Load the token database we created
const tokenConfig = JSON.parse(fs.readFileSync('./config/tpl-tokens.json', 'utf8'));

// Load the article analysis we did earlier
const reportFiles = fs.readdirSync('./data/reports/').filter(f => f.includes('article-token-analysis'));
const latestReport = reportFiles.sort().pop();
const articleData = JSON.parse(fs.readFileSync(`./data/reports/${latestReport}`, 'utf8'));

console.log('🔍 TESTING TOKEN DETECTION LOGIC');
console.log('='.repeat(50));

// Extract unique token names from article analysis
const foundTokenNames = new Set();
articleData.cssCustomProperties.forEach(prop => {
  if (prop.startsWith('--tpl-')) {
    foundTokenNames.add(prop);
  } else if (prop.startsWith('var(--tpl-')) {
    const tokenName = prop.match(/var\((--tpl-[^)]+)\)/)?.[1];
    if (tokenName) foundTokenNames.add(tokenName);
  }
});

console.log(`📊 Tokens found in article: ${foundTokenNames.size}`);
console.log(`📊 Tokens in our database: ${Object.keys(tokenConfig.categories.colors.tokens).length + Object.keys(tokenConfig.categories.typography.tokens).length}`);

// Check which tokens from the article are missing from our database
const dbTokens = new Set([
  ...Object.keys(tokenConfig.categories.colors.tokens),
  ...Object.keys(tokenConfig.categories.typography.tokens),
  ...Object.keys(tokenConfig.categories.interactive.tokens),
  ...Object.keys(tokenConfig.categories.spacing.categories.dialog.tokens),
  ...Object.keys(tokenConfig.categories.spacing.categories.toast.tokens),
  ...Object.keys(tokenConfig.categories.spacing.categories['story-list'].tokens)
]);

const missingFromDB = Array.from(foundTokenNames).filter(token => !dbTokens.has(token));
const extraInDB = Array.from(dbTokens).filter(token => !foundTokenNames.has(token));

console.log('\n❌ TOKENS MISSING FROM OUR DATABASE:');
console.log('-'.repeat(40));
missingFromDB.forEach(token => console.log(`  ${token}`));

console.log('\n📝 TOKENS IN DB BUT NOT FOUND IN ARTICLE:');
console.log('-'.repeat(40));
extraInDB.slice(0, 10).forEach(token => console.log(`  ${token}`));
if (extraInDB.length > 10) {
  console.log(`  ... and ${extraInDB.length - 10} more`);
}

// Analyze stylesheet rules to see what's actually being used
console.log('\n🎨 ANALYZING STYLESHEET RULES WITH TPL USAGE:');
console.log('-'.repeat(50));

const ruleAnalysis = {
  colorRules: 0,
  spacingRules: 0,
  typographyRules: 0,
  otherRules: 0
};

articleData.stylesheetRules.forEach(rule => {
  const cssText = rule.cssText;
  
  if (cssText.includes('var(--tpl-color') || cssText.includes('--tpl-color')) {
    ruleAnalysis.colorRules++;
  } else if (cssText.includes('var(--tpl-') && (cssText.includes('padding') || cssText.includes('margin') || cssText.includes('spacing') || cssText.includes('gap'))) {
    ruleAnalysis.spacingRules++;
  } else if (cssText.includes('cheltenham') || cssText.includes('franklin') || cssText.includes('imperial') || cssText.includes('karnak')) {
    ruleAnalysis.typographyRules++;
  } else {
    ruleAnalysis.otherRules++;
  }
});

console.log(`Color rules: ${ruleAnalysis.colorRules}`);
console.log(`Spacing rules: ${ruleAnalysis.spacingRules}`);
console.log(`Typography rules: ${ruleAnalysis.typographyRules}`);
console.log(`Other rules: ${ruleAnalysis.otherRules}`);

// Look for common patterns we might be missing
console.log('\n🔍 POTENTIAL MISSING VALUE PATTERNS:');
console.log('-'.repeat(40));

const allCSSTexts = articleData.stylesheetRules.map(r => r.cssText).join(' ');

// Look for color values that might be TPL tokens
const colorPatterns = [
  /rgb\(\d+,\s*\d+,\s*\d+\)/g,
  /rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)/g,
  /#[0-9a-fA-F]{6}/g,
  /#[0-9a-fA-F]{3}/g,
  /hsla?\([^)]+\)/g
];

const foundColors = new Set();
colorPatterns.forEach(pattern => {
  const matches = allCSSTexts.match(pattern) || [];
  matches.forEach(color => foundColors.add(color));
});

console.log(`Found ${foundColors.size} unique color values in CSS`);
console.log('Sample colors:');
Array.from(foundColors).slice(0, 10).forEach(color => console.log(`  ${color}`));

// Check spacing values
const spacingPattern = /(?:padding|margin|gap|width|height):\s*([^;]+)/g;
const spacingValues = new Set();
let match;
while ((match = spacingPattern.exec(allCSSTexts)) !== null) {
  spacingValues.add(match[1].trim());
}

console.log(`\nFound ${spacingValues.size} unique spacing values`);
console.log('Sample spacing values:');
Array.from(spacingValues).slice(0, 10).forEach(value => console.log(`  ${value}`));

console.log('\n✅ ANALYSIS COMPLETE');
console.log('Check the missing tokens above to update your detection logic!');
