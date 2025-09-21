# Supabase Integration Setup for Call-By-Call KPI

## Overview
This document explains how to set up the Supabase integration for the Call-By-Call KPI module to replace the Google Sheets data source.

## Prerequisites
1. A Supabase project with the `job_analysis_summary` table
2. Your Supabase project URL and API key

## Setup Steps

### 1. Configure Script Properties
In your Google Apps Script project:
1. Go to **File > Project Properties > Script properties**
2. Add these two properties:
   - **SUPABASE_URL**: `https://yhfquopntmoptqovgmed.supabase.co`
   - **SUPABASE_API_KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloZnF1b3BudG1vcHRxb3ZnbWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDQ1NTAsImV4cCI6MjA2NjcyMDU1MH0.M1nDM5KCCi2yrLF1xtLpWACow9fl1JJBrhbVaRjN4lI`

### 2. Replace the Call-By-Call File
Replace the existing `Call-By-Call_%` file with `Call-By-Call_%_Supabase` file.

### 3. Table Structure
Your `job_analysis_summary` table has the following relevant columns:
- `tech_name` (text) - The technician's name
- `date_dispatched` (date) - The date of the KPI record
- `score` (numeric) - The KPI score value (0-100 range)

### 4. Data Migration
If migrating from Google Sheets:
1. Export your Google Sheets KPI data to CSV
2. Import into Supabase using the dashboard or SQL commands
3. Ensure technician names match exactly with your payroll system

## How It Works

1. **Date Range**: The system reads the pay period from cell F1 of the Main sheet
2. **API Query**: Fetches data from Supabase for the date range
3. **Caching**: Results are cached in memory to avoid repeated API calls
4. **Calculation**: Averages KPI percentages (excluding zeros)
5. **Output**: Writes to cell B15 (average) and C15 (bonus if > 90%)

## Performance Benefits
- **Faster queries**: Database indexes on technician_name and date
- **Reduced data transfer**: Only fetches relevant date range
- **Better scalability**: Handles large datasets efficiently

## Troubleshooting

### Common Issues
1. **"Supabase configuration missing"**: Check Script Properties setup
2. **No data returned**: Verify table has data for the date range
3. **Authentication errors**: Ensure API key has proper permissions

### Testing
To test a single technician:
```javascript
Modules.TechKPI.processForTechnician("John Doe");
```

To process all technicians:
```javascript
Modules.TechKPI.processAll();
```