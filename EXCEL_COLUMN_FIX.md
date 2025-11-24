# Excel Column Name Fix

## Problem
The "By Status" coloring feature stopped working when using the extended Excel schema with additional columns (Contractor, Precast Factory).

### Root Cause
Excel column headers had **trailing spaces** (e.g., `Status ` instead of `Status`). When SheetJS parses the Excel file, it preserves these spaces in the column names. The code was trying to access `row.Status`, but the actual key was `row['Status ']` (with trailing spaces).

### Why it worked before
In the shorter schema, the column names didn't have trailing spaces, so `row.Status` worked correctly.

## Solution
Created a robust helper function `getColumn()` that:
1. First tries exact column name matches
2. Falls back to case-insensitive matching with trimmed column names
3. Returns empty string if column not found

## Files Modified

### 1. `js/embeddedDataManager.js`
- Added `getColumn()` helper in the `loadExcelData()` method (lines 175-188)
- Now correctly reads Status, PreCaster, Villa, and Block columns regardless of trailing spaces

### 2. `js/dataParser.js`
- Added `getColumn()` as a class method (lines 87-99)
- Updated `processData()` to use helper for all column access (lines 113-128)
- Updated `processScheduleData()` to use helper (lines 223, 233-234, 251, 270-275)
- **Bonus**: Now also captures Contractor and Precast Factory data in the parsed output

## Testing
To verify the fix works:
1. Load your Excel file with the extended schema (with Contractor and Precast Factory columns)
2. Select "By Status" from the color scheme dropdown
3. Villas should now be colored according to their status
4. Precaster labels should appear on the villas

## Supported Excel Schemas
The code now works with **any** of these column name variations:
- `Status` or `status` or `Status ` (with trailing spaces)
- `PreCaster` or `Precaster` or `precaster`
- `Plot` or `plot`
- `Block` or `block`
- `Villa` or `villa`
- `Contractor` or `contractor`
- `Precast Factory` or `PrecastFactory` or `precastFactory`

The helper function handles:
- ✅ Case variations (Status vs status)
- ✅ Trailing/leading whitespace
- ✅ Multiple possible column names
