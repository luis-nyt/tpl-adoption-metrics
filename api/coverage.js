/**
 * Vercel API endpoint for storing and retrieving TPL coverage data
 * Supports both JSON storage (simple) and external database integration
 */

const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  return await fn(req, res);
};

// Simple in-memory storage for demo (replace with database in production)
let coverageDataStore = [];

async function handler(req, res) {
  try {
    switch (req.method) {
      case 'POST':
        return await handlePost(req, res);
      case 'GET':
        return await handleGet(req, res);
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

async function handlePost(req, res) {
  const coverageData = req.body;
  
  // Validate required fields
  if (!coverageData.url || !coverageData.timestamp) {
    return res.status(400).json({ error: 'Missing required fields: url, timestamp' });
  }

  // Add server-side metadata
  const enrichedData = {
    ...coverageData,
    id: generateId(),
    serverTimestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'] || 'unknown'
  };

  // Store data (in production, this would go to a database)
  if (process.env.DATABASE_URL) {
    await storeInDatabase(enrichedData);
  } else {
    // Fallback to in-memory storage for development
    coverageDataStore.push(enrichedData);
    
    // Keep only last 1000 entries to prevent memory issues
    if (coverageDataStore.length > 1000) {
      coverageDataStore = coverageDataStore.slice(-1000);
    }
  }

  console.log(`✅ Stored coverage data for ${coverageData.url} - ${coverageData.totalCoveragePercent}% coverage`);
  
  res.status(201).json({ 
    success: true, 
    id: enrichedData.id,
    message: 'Coverage data stored successfully' 
  });
}

async function handleGet(req, res) {
  const { url, since, limit = 100 } = req.query;
  
  let data = coverageDataStore;
  
  // Filter by URL if specified
  if (url) {
    data = data.filter(item => item.url === url);
  }
  
  // Filter by date if specified
  if (since) {
    const sinceDate = new Date(since);
    data = data.filter(item => new Date(item.timestamp) >= sinceDate);
  }
  
  // Sort by timestamp (newest first)
  data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Limit results
  data = data.slice(0, parseInt(limit));
  
  // Calculate summary statistics
  const summary = calculateSummary(data);
  
  res.status(200).json({
    success: true,
    data: data,
    summary: summary,
    total: data.length
  });
}

async function storeInDatabase(data) {
  // Placeholder for database integration
  // This would use your chosen database (Supabase, PlanetScale, etc.)
  
  if (process.env.DATABASE_URL.includes('supabase')) {
    // Supabase integration example
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL, 
      process.env.SUPABASE_ANON_KEY
    );
    
    const { error } = await supabase
      .from('tpl_coverage_data')
      .insert(data);
      
    if (error) throw error;
    
  } else {
    // Generic database storage
    console.log('Database storage not configured, using in-memory store');
    coverageDataStore.push(data);
  }
}

function calculateSummary(data) {
  if (data.length === 0) return {};
  
  const coverageValues = data.map(d => d.totalCoveragePercent).filter(v => typeof v === 'number');
  const elementCounts = data.map(d => d.totalElements).filter(v => typeof v === 'number');
  
  return {
    averageCoverage: coverageValues.length > 0 ? 
      parseFloat((coverageValues.reduce((a, b) => a + b, 0) / coverageValues.length).toFixed(2)) : 0,
    maxCoverage: coverageValues.length > 0 ? Math.max(...coverageValues) : 0,
    minCoverage: coverageValues.length > 0 ? Math.min(...coverageValues) : 0,
    averageElements: elementCounts.length > 0 ? 
      Math.round(elementCounts.reduce((a, b) => a + b, 0) / elementCounts.length) : 0,
    totalDataPoints: data.length,
    dateRange: {
      earliest: data.length > 0 ? data[data.length - 1].timestamp : null,
      latest: data.length > 0 ? data[0].timestamp : null
    }
  };
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default allowCors(handler);
