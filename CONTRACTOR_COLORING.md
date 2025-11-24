# Contractor-Based Coloring Feature

## Overview
When Gantt chart filters are applied (Look Ahead, Today line drag, or date range filters), blocks are now highlighted in the 3D model with contractor-specific colors in addition to the existing block number labels.

## Color Scheme

| Contractor | Color | RGB Value |
|------------|-------|-----------|
| SPML | Blue | rgb(0, 102, 255) |
| ABR | Golden | rgb(218, 165, 32) |
| Others | Purple | rgb(102, 126, 234) |

## How It Works

### 1. Excel Data Structure
The Excel file must contain a `Contractor` column with values like:
- `SPML`
- `ABR`
- Or any other contractor name

The contractor value is extracted from the Excel file during parsing:

**Location:** [js/dataParser.js:234](js/dataParser.js#L234)
```javascript
contractor: row.Contractor || row.contractor || '',
```

### 2. Gantt Chart Display
Block bars in the Gantt chart already show contractor colors:

**Location:** [js/ganttChart.js:868-883](js/ganttChart.js#L868-L883)
```javascript
const contractorColors = {
  'SPML': '#0066FF',     // Blue for SPML
  'ABR': '#DAA520'       // Golden for ABR
};
```

### 3. 3D Model Coloring (NEW)
When Gantt chart filters are applied, the 3D model now highlights blocks with contractor colors:

**Location:** [js/ganttChart.js:809-857](js/ganttChart.js#L809-L857)

The `applyContractorColors()` function:
1. Iterates through all filtered blocks
2. Gets the contractor for each block from the Excel data
3. Applies the appropriate color (Blue for SPML, Golden for ABR)
4. Colors all elements (dbIds) belonging to that block
5. Logs statistics showing how many blocks were colored per contractor

### 4. Workflow

```
User Action: Apply Gantt Chart Filter
    ↓
Gantt Chart: Filter blocks by date/look-ahead
    ↓
3D Model: Isolate filtered blocks
    ↓
Color Application: Apply contractor colors to blocks
    ↓
Label Creation: Add block number labels
    ↓
Result: Blocks displayed with:
  - Contractor color (Blue/Golden)
  - Block number label
  - Filtered by schedule
```

## Usage

### Step 1: Upload Excel File
1. Click "Upload Schedule" button in the sidebar
2. Select Excel file with columns:
   - `Block`
   - `Plot`
   - `Planned Start`
   - `Planned Finish`
   - `Contractor` (SPML or ABR)
   - Other columns...

### Step 2: Open Gantt Chart
1. Click "📊 Gantt Chart" button in header
2. Chart opens showing blocks with contractor-colored bars

### Step 3: Apply Filters
Choose any of these filter options:

**Option A: Look Ahead Filter**
- Check "Look Ahead" checkbox
- Set weeks (default 12)
- Shows blocks starting within next N weeks
- Applies contractor colors to filtered blocks

**Option B: Drag Today Line**
- Drag the red "Today" line in the Gantt chart
- Filters blocks up to the new date
- Automatically applies contractor colors

**Option C: Date Range Filter**
- Set "From" and "To" dates
- Click "Apply" button
- Applies contractor colors to filtered blocks

**Option D: Jump to Today**
- Click "📅 Today" button
- Filters to show today + 3 months
- Applies contractor colors

### Step 4: View Results
In the 3D model, you'll see:
- **Blue blocks** = SPML contractor
- **Golden blocks** = ABR contractor
- **Purple blocks** = Other contractors
- **White labels** = Block numbers floating on each block

### Step 5: Clear Filters
- Click "Reset" in Gantt chart to show all blocks
- Colors are cleared when filter is disabled
- Labels persist until Gantt chart is closed

## Code Changes

### Modified Files

#### 1. js/ganttChart.js

**Lines 729-762:** Added contractor tracking
```javascript
const contractorBlockMap = new Map(); // Map block to contractor

for (const [blockKey, blockData] of this.filteredData) {
  // ... existing code ...

  // Store contractor for this block
  if (blockData.contractor) {
    contractorBlockMap.set(blockKey, blockData.contractor);
  }
}
```

**Lines 782-783:** Apply contractor colors
```javascript
// Apply contractor-based colors to blocks
this.applyContractorColors(blockMap, contractorBlockMap);
```

**Lines 809-857:** New function `applyContractorColors()`
- Defines contractor color palette
- Iterates through blocks
- Matches contractor name (case-insensitive)
- Applies colors to all block elements
- Logs statistics

**Lines 799-801:** Clear colors when filter disabled
```javascript
window.viewerManager.showAll();
window.viewerManager.clearColors();
```

### Existing Code (Already Working)

#### js/dataParser.js:234
```javascript
contractor: row.Contractor || row.contractor || '',
```
Extracts contractor from Excel file

#### js/ganttChart.js:868-883
```javascript
const contractorColors = {
  'SPML': '#0066FF',     // Blue for SPML
  'ABR': '#DAA520'       // Golden for ABR
};
```
Gantt chart bar colors (already implemented)

## Console Output

When filters are applied, you'll see:

```
🏛️ Filtering model to show 150 scheduled villas from 25 blocks
🎨 Applying contractor-based colors to blocks...
  Block 1: SPML → 450 elements colored
  Block 2: ABR → 380 elements colored
  Block 3: SPML → 420 elements colored
  ...
✅ Applied contractor colors to 25 blocks:
   SPML (Blue): 15 blocks
   ABR (Golden): 10 blocks
✅ Isolated 11,250 elements for 150 scheduled villas
   25 blocks with floating labels and contractor colors
```

## Troubleshooting

### Colors not showing
1. **Check Excel file has Contractor column**
   - Column name must be exactly `Contractor` (case-insensitive)
   - Values should be `SPML` or `ABR`

2. **Check console for errors**
   - Open browser console (F12)
   - Look for color application messages

3. **Verify data is loaded**
   - Check "✅ Loaded X blocks from schedule" message
   - Click "Apply" after uploading Excel file

### Wrong colors
1. **Check contractor spelling in Excel**
   - Must be exactly `SPML` or `ABR` (case-insensitive)
   - Extra spaces are trimmed automatically

2. **Check block matching**
   - Block numbers in Excel must match model plot data
   - Use "Export Data" to verify block numbers

### Labels without colors
1. **Colors are only applied when filter is active**
   - Enable Look Ahead OR
   - Drag Today line OR
   - Set date range

2. **Colors clear when filter is disabled**
   - This is by design
   - Re-apply filter to see colors again

## Technical Details

### Color Application Flow

1. **Gantt Filter Applied** → `filterVillasInModel(enabled)`
2. **Build Block Map** → Groups dbIds by block number
3. **Build Contractor Map** → Maps block to contractor name
4. **Apply Colors** → `applyContractorColors(blockMap, contractorBlockMap)`
5. **For Each Block:**
   - Get contractor name from Excel data
   - Match to color (SPML=Blue, ABR=Golden, Other=Purple)
   - Call `viewerManager.setColor(dbIds, color)`
   - Color all elements belonging to that block

### Color Persistence

- **Colors persist:** While Gantt filter is active
- **Colors clear:** When filter is disabled or Gantt chart is closed
- **Labels persist:** Until Gantt chart is closed (independent of filter state)

### Performance

- Colors are applied once per filter change
- Uses batch coloring via `viewerManager.setColor()`
- Efficient Map-based lookups
- No rendering overhead during camera movement

## Future Enhancements

Potential improvements:
1. **Color Legend** - Show contractor color legend in Gantt chart
2. **Color Scheme Toggle** - Option to disable contractor colors
3. **Custom Colors** - Allow user-defined contractor colors
4. **More Contractors** - Support for additional contractor colors
5. **Mixed Contractors** - Handle blocks with multiple contractors

## Summary

This feature enhances the Gantt chart filtering by:
- ✅ Automatically coloring blocks by contractor when filters are applied
- ✅ Using consistent colors (Blue for SPML, Golden for ABR)
- ✅ Matching Gantt chart bar colors with 3D model colors
- ✅ Providing clear visual distinction between contractors
- ✅ Working seamlessly with existing block labels
- ✅ Clearing colors when filters are removed
