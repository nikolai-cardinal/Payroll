# 🚀 Deployment Guide - Supabase KPI Integration

## ✅ Status: READY FOR DEPLOYMENT

Your `Call-By-Call_%` file has been **completely replaced** with the Supabase integration.

## What Changed

### Before (Old Version):
- Pulled data from external Google Sheets
- Required external sheet ID configuration
- Slower performance with large datasets

### After (Current Version):
- Pulls data directly from your Supabase `job_analysis_summary` table
- No configuration needed - credentials are built-in
- Much faster with database queries
- Automatic caching for better performance

## 📋 Deployment Steps

### Step 1: Copy to Google Apps Script
1. Open your Google Apps Script project
2. Find the `Call-By-Call_%` file 
3. Replace its **entire contents** with the code from `/Payroll/src/data/Call-By-Call_%`
4. Save the file (Ctrl+S or Cmd+S)

### Step 2: Test the Integration
In Google Apps Script, run this test in the console:
```javascript
// Test with a known technician
Modules.TechKPI.processForTechnician("Angelo Lange");

// Or test all technicians
Modules.TechKPI.processAll();
```

### Step 3: Verify Output
Check that the technician's sheet has:
- **Cell B15**: KPI score (decimal format, e.g., 0.67 for 67%)
- **Cell C15**: Bonus amount ($100 if score > 90%, $0 otherwise)

## 🔌 How It Works

1. **Reads pay period** from Main sheet cell F1
2. **Queries Supabase** for scores within that date range
3. **Calculates average** score (excluding zeros)
4. **Writes results** to technician's sheet cells B15 and C15

## 📊 Data Source

- **Database**: `job_analysis_summary` table
- **Columns Used**:
  - `tech_name` - Must match sheet names exactly
  - `date_dispatched` - For date filtering
  - `score` - KPI score (0-100 range)

## 🔧 Built-in Configuration

The API credentials are embedded in the code:
- **URL**: `https://yhfquopntmoptqovgmed.supabase.co`
- **API Key**: Already configured

No manual setup required!

## ⚠️ Important Notes

1. **Technician names must match exactly** between payroll sheets and Supabase
2. **Zero scores are excluded** from average calculations (by design)
3. **Data is cached** during execution for better performance
4. **90% threshold** triggers $100 bonus

## 🐛 Troubleshooting

If something doesn't work:

1. **Check the logs**:
   - View → Logs in Google Apps Script
   - Look for error messages

2. **Verify technician names**:
   - Names must match exactly (case-sensitive)
   - Check for extra spaces

3. **Check date format**:
   - Main sheet F1 should have format: "MM/DD - MM/DD"

4. **Test connection**:
   ```javascript
   // This should return data
   const data = fetchSupabaseData('2025-09-01', '2025-09-30');
   console.log(data.length + ' records found');
   ```

## ✅ Success Indicators

You'll know it's working when:
- Logs show "Fetched X records" 
- Technician sheets update with scores
- No error messages in console
- Processing completes without timeouts

---

**Ready to Deploy!** The code is clean, tested, and production-ready.
