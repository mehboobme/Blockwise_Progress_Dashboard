# Gantt Chart Feature Guide

## Overview
The Gantt Chart is a comprehensive scheduling visualization tool integrated into the dashboard that displays block and villa-level schedules in an interactive timeline format.

## Features Implemented

### 1. **Floating Window Controls**
- **Toggle Button**: Click the "📊 Schedule" button (bottom-right corner) to open/close the Gantt chart
- **Minimize (−)**: Collapse the window to just the title bar
- **Maximize (□)**: Expand to full screen
- **Close (×)**: Hide the Gantt chart completely
- **Draggable**: Click and drag the title bar to move the window anywhere on screen
- **Resizable**: Drag the corners or edges to resize the window

### 2. **Date Filtering**
Located in the toolbar at the top of the Gantt window:

- **From Date**: Set the start date for filtering blocks
- **To Date**: Set the end date for filtering blocks
- **Apply Button**: Apply the selected date range filter
- **Reset Button**: Clear all filters and show all blocks

**How it works**: 
- Only blocks that overlap with the selected date range will be displayed
- If a block starts before the "From" date but ends after it, it will still be shown
- If a block starts before the "To" date, it will be shown

### 3. **Look Ahead Schedule**
- **Checkbox**: "Look Ahead Schedule"
- **Function**: When enabled, shows only blocks scheduled to start within the next 3 months
- **Use Case**: Focus on upcoming work and near-term planning

### 4. **Show Villas Option**
- **Checkbox**: "Show Villas"
- **Function**: Displays individual plot/villa schedules under each block
- **Visual**: Villa tasks appear with purple gradient bars and are indented under their parent block
- **Details**: Shows plot number, component type, and date range

### 5. **Interactive Timeline**
- **Horizontal Scrolling**: Scroll left/right to view different time periods
- **Vertical Scrolling**: Scroll up/down to view all blocks
- **Month Headers**: Timeline divided by months with year labels
- **Task Bars**: Colored bars showing duration of each task
  - **Block tasks**: Green gradient bars (teal to green)
  - **Villa tasks**: Purple gradient bars (purple to violet)

### 6. **Task Information**
Each task row displays:
- **Left Column**: Block/Plot number and component type
- **Timeline**: Visual bar showing start and finish dates
- **Hover Tooltip**: Shows full details when hovering over a task bar
- **Bar Label**: Displays date range on the bar itself

## How to Use

### Basic Workflow

1. **Upload Schedule Excel File**:
   - Click "Upload Schedule" in the sidebar
   - Select your Excel file with columns: Block, Plot, Component, Planned Start, Planned Finish
   - Status will show "✅ Loaded X blocks"

2. **Open Gantt Chart**:
   - Click the "📊 Schedule" button at bottom-right
   - The Gantt chart window appears with all blocks displayed

3. **Filter by Date Range**:
   - Select "From" date (e.g., December 1, 2025)
   - Select "To" date (e.g., March 31, 2026)
   - Click "Apply"
   - Only blocks within this range are shown

4. **View Look Ahead**:
   - Check the "Look Ahead Schedule" box
   - See only blocks starting in the next 3 months
   - Useful for weekly/monthly planning meetings

5. **Show Villa Details**:
   - Check the "Show Villas" box
   - Individual plots appear under each block
   - Villa bars are smaller and purple-colored
   - Useful for detailed plot-level tracking

6. **Navigate Timeline**:
   - Scroll horizontally to see different months
   - Scroll vertically to see more blocks
   - Hover over bars to see exact dates
   - Click and drag bars for quick date reference

7. **Window Management**:
   - Minimize: Collapse when not in use but keep accessible
   - Maximize: Full-screen view for presentations
   - Drag: Position anywhere convenient
   - Resize: Adjust to fit your workflow

### Advanced Usage

#### Scenario 1: Weekly Progress Meeting
1. Enable "Look Ahead Schedule" (next 3 months)
2. Maximize window for presentation
3. Show only block-level (uncheck "Show Villas")
4. Discuss upcoming milestones

#### Scenario 2: Detailed Block Review
1. Filter to specific date range (e.g., one month)
2. Enable "Show Villas"
3. Review each plot's schedule within blocks
4. Identify scheduling conflicts or gaps

#### Scenario 3: Quarter Planning
1. Set "From" to start of quarter
2. Set "To" to end of quarter
3. View all blocks scheduled in that period
4. Export or screenshot for planning documents

## Technical Details

### Data Source
- Reads from `dataParser.scheduleByBlock` Map
- Automatically refreshes when new Excel file is uploaded
- Supports multiple Excel row formats (PlannedStart, Planned Start, etc.)

### Date Calculations
- **Pixels per day**: 3px (configurable in code)
- **Timeline generation**: Automatic based on min/max dates in data
- **Month padding**: Extends to full month start/end

### Performance
- Optimized for 50-100 blocks
- Villa mode adds ~10-20 rows per block (depends on Excel data)
- Smooth scrolling with hardware acceleration
- Efficient re-rendering on filter changes

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile: Basic support (best on tablets)

## Troubleshooting

### "No schedule data loaded" message
**Solution**: Upload an Excel file using the "Upload Schedule" button in the sidebar

### Blocks not appearing after filtering
**Solution**: Click "Reset" to clear filters, verify your date range includes block dates

### Villa rows not showing
**Solution**: 
1. Ensure "Show Villas" checkbox is checked
2. Verify Excel file has Plot column data
3. Check that Plot rows have Planned Start and Planned Finish dates

### Window not draggable
**Solution**: Make sure you're clicking the title bar (green header), not the content area

### Dates showing as "N/A"
**Solution**: Excel file may have empty date cells or incorrect format. Check Excel data integrity.

## Excel File Requirements

Your Excel file should have these columns:
- **Block** (required): Block number (e.g., 32, 33, 34)
- **Plot** (optional for villas): Plot/villa number
- **Component** (optional): Type of work (e.g., "Precast", "Foundation")
- **Planned Start** (required): Start date (Excel date format)
- **Planned Finish** (required): Completion date (Excel date format)

### Example Excel Structure
```
| Block | Plot | Component | Planned Start | Planned Finish |
|-------|------|-----------|---------------|----------------|
| 34    | 425  | Precast   | 10/1/2025     | 12/15/2025     |
| 34    | 426  | Precast   | 10/5/2025     | 12/20/2025     |
| 35    | 430  | Precast   | 11/1/2025     | 1/15/2026      |
```

## Keyboard Shortcuts

- **Arrow Keys**: Scroll timeline (when window is focused)
- **Esc**: Close Gantt window
- **Mouse Wheel**: Vertical scroll
- **Shift + Mouse Wheel**: Horizontal scroll

## Future Enhancements

Potential features for future versions:
- Export to PDF/Image
- Print optimization
- Drag-and-drop schedule adjustments
- Critical path highlighting
- Zoom in/out timeline
- Custom color schemes
- Progress tracking overlay
- Milestone markers

## Support

For issues or questions:
1. Check browser console (F12) for error messages
2. Verify Excel data format
3. Refresh page and re-upload Excel file
4. Check that dataParser is available: `window.dataParser` in console

---

**Last Updated**: November 2025  
**Version**: 1.0  
**Module**: `js/ganttChart.js`
