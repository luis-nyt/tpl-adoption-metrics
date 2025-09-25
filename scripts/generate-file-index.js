#!/usr/bin/env node

/**
 * Generate File Index
 * 
 * Automatically generates an index.json file listing all available data files
 * This enables the dashboard to dynamically discover files without hardcoding
 */

const fs = require('fs');
const path = require('path');

function generateFileIndex() {
    const dailyDir = path.join(__dirname, '..', 'data', 'daily');
    
    if (!fs.existsSync(dailyDir)) {
        console.error('❌ data/daily directory not found');
        process.exit(1);
    }
    
    // Read all files in the directory
    const files = fs.readdirSync(dailyDir)
        .filter(file => file.endsWith('.json') && file !== 'index.json') // Exclude the index file itself
        .sort((a, b) => {
            // Sort by date/time (newest first)
            // Extract date and time for proper sorting
            const extractDateTime = (filename) => {
                const match = filename.match(/(\d{4}-\d{2}-\d{2})(?:-(\d{4}))?/);
                if (match) {
                    const date = match[1];
                    const time = match[2] || '0000';
                    return `${date}-${time}`;
                }
                return filename;
            };
            
            return extractDateTime(b).localeCompare(extractDateTime(a));
        });
    
    const indexPath = path.join(dailyDir, 'index.json');
    const indexContent = JSON.stringify(files, null, 2);
    
    fs.writeFileSync(indexPath, indexContent);
    
    console.log(`✅ Generated index.json with ${files.length} files:`);
    files.slice(0, 5).forEach(file => console.log(`  ${file}`));
    if (files.length > 5) {
        console.log(`  ... and ${files.length - 5} more files`);
    }
    
    return files.length;
}

// Run if called directly
if (require.main === module) {
    generateFileIndex();
}

module.exports = generateFileIndex;
