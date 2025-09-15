-- TPL Coverage Data Schema
-- This schema can be used with PostgreSQL (Supabase) or adapted for other databases

-- Main table for storing coverage data
CREATE TABLE tpl_coverage_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Coverage metrics
    total_elements INTEGER DEFAULT 0,
    total_coverage_percent DECIMAL(5,2) DEFAULT 0.00,
    viewport_coverage_percent DECIMAL(5,2) DEFAULT 0.00,
    page_area BIGINT DEFAULT 0,
    total_tpl_area BIGINT DEFAULT 0,
    
    -- Page metadata
    page_title TEXT,
    page_description TEXT,
    viewport_width INTEGER,
    viewport_height INTEGER,
    user_agent TEXT,
    
    -- Screenshot reference
    screenshot_path TEXT,
    
    -- Raw data (JSONB for flexible storage of elements array)
    elements_data JSONB,
    
    -- Indexing for performance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_tpl_coverage_url ON tpl_coverage_data(url);
CREATE INDEX idx_tpl_coverage_timestamp ON tpl_coverage_data(timestamp DESC);
CREATE INDEX idx_tpl_coverage_created_at ON tpl_coverage_data(created_at DESC);
CREATE INDEX idx_tpl_coverage_url_timestamp ON tpl_coverage_data(url, timestamp DESC);

-- Composite index for dashboard queries
CREATE INDEX idx_tpl_coverage_dashboard ON tpl_coverage_data(url, timestamp DESC, total_coverage_percent);

-- Table for storing page metadata and monitoring configuration
CREATE TABLE tpl_monitored_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT UNIQUE NOT NULL,
    display_name TEXT,
    category TEXT, -- e.g., 'homepage', 'section', 'article'
    is_active BOOLEAN DEFAULT TRUE,
    monitoring_frequency_hours INTEGER DEFAULT 6,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default monitored pages
INSERT INTO tpl_monitored_pages (url, display_name, category) VALUES
('https://www.nytimes.com/', 'Homepage', 'homepage'),
('https://www.nytimes.com/section/world', 'World News', 'section'),
('https://www.nytimes.com/section/politics', 'Politics', 'section'),
('https://www.nytimes.com/section/technology', 'Technology', 'section'),
('https://www.nytimes.com/section/business', 'Business', 'section'),
('https://www.nytimes.com/section/opinion', 'Opinion', 'section'),
('https://www.nytimes.com/section/sports', 'Sports', 'section');

-- Table for storing aggregated daily statistics
CREATE TABLE tpl_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    url TEXT NOT NULL,
    
    -- Aggregated metrics
    avg_coverage_percent DECIMAL(5,2),
    max_coverage_percent DECIMAL(5,2),
    min_coverage_percent DECIMAL(5,2),
    avg_elements INTEGER,
    max_elements INTEGER,
    min_elements INTEGER,
    
    -- Counts
    measurement_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(date, url)
);

-- Index for daily stats
CREATE INDEX idx_tpl_daily_stats_date ON tpl_daily_stats(date DESC);
CREATE INDEX idx_tpl_daily_stats_url_date ON tpl_daily_stats(url, date DESC);

-- View for easy dashboard queries
CREATE OR REPLACE VIEW tpl_coverage_summary AS
SELECT 
    url,
    COUNT(*) as total_measurements,
    AVG(total_coverage_percent) as avg_coverage,
    MAX(total_coverage_percent) as max_coverage,
    MIN(total_coverage_percent) as min_coverage,
    AVG(total_elements) as avg_elements,
    MAX(timestamp) as latest_measurement,
    MIN(timestamp) as earliest_measurement
FROM tpl_coverage_data 
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY url
ORDER BY avg_coverage DESC;

-- Function to update daily stats (can be called by a trigger or scheduled job)
CREATE OR REPLACE FUNCTION update_daily_stats()
RETURNS VOID AS $$
BEGIN
    INSERT INTO tpl_daily_stats (
        date, url, 
        avg_coverage_percent, max_coverage_percent, min_coverage_percent,
        avg_elements, max_elements, min_elements, measurement_count
    )
    SELECT 
        DATE(timestamp) as date,
        url,
        AVG(total_coverage_percent),
        MAX(total_coverage_percent),
        MIN(total_coverage_percent),
        ROUND(AVG(total_elements)),
        MAX(total_elements),
        MIN(total_elements),
        COUNT(*)
    FROM tpl_coverage_data 
    WHERE DATE(timestamp) = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY DATE(timestamp), url
    ON CONFLICT (date, url) 
    DO UPDATE SET
        avg_coverage_percent = EXCLUDED.avg_coverage_percent,
        max_coverage_percent = EXCLUDED.max_coverage_percent,
        min_coverage_percent = EXCLUDED.min_coverage_percent,
        avg_elements = EXCLUDED.avg_elements,
        max_elements = EXCLUDED.max_elements,
        min_elements = EXCLUDED.min_elements,
        measurement_count = EXCLUDED.measurement_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies for Supabase
ALTER TABLE tpl_coverage_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE tpl_monitored_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tpl_daily_stats ENABLE ROW LEVEL SECURITY;

-- Allow public read access (adjust based on your security needs)
CREATE POLICY "Allow public read access" ON tpl_coverage_data
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON tpl_monitored_pages
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON tpl_daily_stats
    FOR SELECT USING (true);

-- Allow insert for the API (you might want to restrict this to service role)
CREATE POLICY "Allow insert for API" ON tpl_coverage_data
    FOR INSERT WITH CHECK (true);

-- Example queries for the dashboard:

-- Get recent coverage data for all pages
/*
SELECT 
    url,
    timestamp,
    total_coverage_percent,
    total_elements,
    viewport_coverage_percent
FROM tpl_coverage_data 
WHERE timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC
LIMIT 100;
*/

-- Get average coverage by page for the last 30 days
/*
SELECT 
    mp.display_name,
    tcd.url,
    AVG(tcd.total_coverage_percent) as avg_coverage,
    COUNT(*) as measurements
FROM tpl_coverage_data tcd
JOIN tpl_monitored_pages mp ON tcd.url = mp.url
WHERE tcd.timestamp >= NOW() - INTERVAL '30 days'
GROUP BY mp.display_name, tcd.url
ORDER BY avg_coverage DESC;
*/

-- Get daily trends for a specific page
/*
SELECT 
    DATE(timestamp) as date,
    AVG(total_coverage_percent) as avg_coverage,
    COUNT(*) as measurements
FROM tpl_coverage_data 
WHERE url = 'https://www.nytimes.com/' 
    AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date;
*/
