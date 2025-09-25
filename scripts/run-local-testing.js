#!/usr/bin/env node

/**
 * Local Testing Script - Runs TPL collection every 5 minutes
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class LocalTesting {
  constructor() {
    this.intervalMinutes = 5;
    this.isRunning = false;
    this.runCount = 0;
    this.startTime = new Date();
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
  }

  async runCollection() {
    if (this.isRunning) {
      this.log('⏸️  Collection already running, skipping...');
      return;
    }

    this.isRunning = true;
    this.runCount++;
    
    this.log(`🚀 Starting collection run #${this.runCount}`);
    
    return new Promise((resolve) => {
      const child = spawn('npm', ['run', 'collect-multiview'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      let output = '';
      
      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        // Only show the key results
        if (text.includes('📱 TPL ADOPTION ANALYSIS') || 
            text.includes('Mobile:') || 
            text.includes('Desktop:') || 
            text.includes('Combined:') ||
            text.includes('✅ Data collection completed!')) {
          process.stdout.write(`    ${text}`);
        }
      });

      child.stderr.on('data', (data) => {
        this.log(`❌ Error: ${data.toString().trim()}`);
      });

      child.on('close', (code) => {
        this.isRunning = false;
        if (code === 0) {
          this.log(`✅ Collection run #${this.runCount} completed successfully`);
        } else {
          this.log(`❌ Collection run #${this.runCount} failed with code ${code}`);
        }
        
        this.logStats();
        resolve(code);
      });
    });
  }

  logStats() {
    const runtime = Math.round((new Date() - this.startTime) / 1000 / 60);
    this.log(`📊 Stats: ${this.runCount} runs in ${runtime} minutes`);
    console.log(''); // Add spacing
  }

  async start() {
    this.log(`🎯 Starting local TPL testing - collecting every ${this.intervalMinutes} minutes`);
    this.log(`⏹️  Press Ctrl+C to stop`);
    console.log('');

    // Run immediately
    await this.runCollection();

    // Then run every 5 minutes
    const interval = setInterval(async () => {
      await this.runCollection();
    }, this.intervalMinutes * 60 * 1000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('🛑 Stopping local testing...');
      clearInterval(interval);
      this.logStats();
      process.exit(0);
    });
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new LocalTesting();
  tester.start().catch(console.error);
}

module.exports = LocalTesting;
