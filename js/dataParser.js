/**
 * Data Parser Module
 * Handles Excel file parsing and data transformation
 */

import { CONFIG } from './config.js';

class DataParser {
  constructor() {
    this.rawData = null;
    this.parsedData = null;
    this.dataByPlot = new Map();
    this.dataByBlock = new Map();
    this.scheduleByBlock = new Map(); // New: Store schedule data per block
  }

  /**
   * Parse Excel file using SheetJS
   * @param {File} file - Excel file from input
   * @returns {Promise<Array>} Parsed data array
   */
  async parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          console.log('📊 EXCEL FILE ANALYSIS:');
          console.log('Sheet names:', workbook.SheetNames);
          
          // Get first sheet
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          
          console.log(`✅ Parsed ${jsonData.length} rows from Excel`);
          
          // Log first 5 rows to see structure
          console.log('\n=== FIRST 5 ROWS OF EXCEL DATA ===');
          jsonData.slice(0, 5).forEach((row, i) => {
            console.log(`Row ${i}:`, row);
          });
          
          // Log all unique column names
          if (jsonData.length > 0) {
            const columns = Object.keys(jsonData[0]);
            console.log('\n=== ALL COLUMN NAMES ===');
            console.log(columns);
            
            // Check for date columns specifically
            const dateColumns = columns.filter(col => 
              col.toLowerCase().includes('start') || 
              col.toLowerCase().includes('finish') ||
              col.toLowerCase().includes('planned') ||
              col.toLowerCase().includes('actual')
            );
            console.log('\n=== DATE-RELATED COLUMNS ===');
            console.log(dateColumns);
          }
          
          this.rawData = jsonData;
          this.processData();
          resolve(this.parsedData);
          
        } catch (error) {
          console.error('❌ Excel parsing error:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('❌ File reading error:', error);
        reject(error);
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Process and index raw data
   */
  processData() {
    if (!this.rawData) {
      console.warn('⚠️ No raw data to process');
      return;
    }

    this.parsedData = this.rawData.map(row => {
      // Extract columns based on CONFIG
      const cols = CONFIG.EXCEL.COLUMNS;
      
      return {
        project: row[cols.PROJECT],
        phase: row[cols.PHASE],
        neighborhood: row[cols.NEIGHBORHOOD],
        sector: row[cols.SECTOR],
        block: row[cols.BLOCK],
        plot: row[cols.PLOT],
        villa: row[cols.VILLA],
        component: row[cols.COMPONENT],
        plannedStart: this.parseDate(row[cols.PLANNED_START]),
        plannedFinish: this.parseDate(row[cols.PLANNED_FINISH]),
        actualStart: this.parseDate(row[cols.ACTUAL_START]),
        actualFinish: this.parseDate(row[cols.ACTUAL_FINISH]),
        // Original row for reference
        _original: row
      };
    });

    // Index by plot number
    this.indexByPlot();
    
    // Index by block
    this.indexByBlock();
    
    // Process schedule data
    this.processScheduleData();
    
    console.log(`✅ Processed data: ${this.dataByPlot.size} plots, ${this.dataByBlock.size} blocks`);
  }

  /**
   * Index data by plot number for quick lookup
   */
  indexByPlot() {
    this.dataByPlot.clear();
    
    this.parsedData.forEach(item => {
      const plotKey = this.normalizeKey(item.plot);
      
      if (!this.dataByPlot.has(plotKey)) {
        this.dataByPlot.set(plotKey, []);
      }
      
      this.dataByPlot.get(plotKey).push(item);
    });
  }

  /**
   * Index data by block for aggregation
   */
  indexByBlock() {
    this.dataByBlock.clear();
    
    this.parsedData.forEach(item => {
      const blockKey = this.normalizeKey(item.block);
      
      if (!this.dataByBlock.has(blockKey)) {
        this.dataByBlock.set(blockKey, {
          block: item.block,
          items: [],
          stats: {
            total: 0,
            completed: 0,
            inProgress: 0,
            notStarted: 0
          }
        });
      }
      
      const blockData = this.dataByBlock.get(blockKey);
      blockData.items.push(item);
      blockData.stats.total++;
      
      // Update stats based on actual dates
      if (item.actualFinish) {
        blockData.stats.completed++;
      } else if (item.actualStart) {
        blockData.stats.inProgress++;
      } else {
        blockData.stats.notStarted++;
      }
    });
  }

  /**
   * Process schedule data from raw Excel
   */
  processScheduleData() {
    if (!this.rawData || this.rawData.length === 0) {
      console.log('⚠️ No raw data available for schedule processing');
      return;
    }
    
    console.log('📅 Processing block schedule data...');
    console.log(`   Raw data rows: ${this.rawData.length}`);
    
    // Log first row to see structure
    if (this.rawData.length > 0) {
      console.log('   First row sample:', this.rawData[0]);
      console.log('   Available columns:', Object.keys(this.rawData[0]));
    }
    
    const schedules = new Map();
    let processedCount = 0;
    
    this.rawData.forEach((row, index) => {
      const block = row.Block || row.block;
      if (!block) {
        if (index < 3) console.log(`   Row ${index}: No block found`, row);
        return;
      }
      
      // Normalize block number to string for consistent lookup
      const blockKey = String(block).trim();
      
      // Try multiple column name variations for Planned Start
      const plannedStart = this.parseExcelDate(
        row['Planned Start'] || row['PlannedStart'] || row['Planned_Start'] || 
        row['PLANNED START'] || row['planned start']
      );
      
      // Try multiple column name variations for Planned Finish
      const plannedFinish = this.parseExcelDate(
        row['Planned Finish'] || row['PlannedFinish'] || row['Planned_Finish'] || 
        row['PLANNED FINISH'] || row['planned finish']
      );
      
      if (index < 3) {
        console.log(`   Row ${index}: Block=${blockKey}`);
        console.log(`      Planned Start=${plannedStart} (from: ${row['Planned Start'] || 'not found'})`);
        console.log(`      Planned Finish=${plannedFinish} (from: ${row['Planned Finish'] || 'not found'})`);
      }
      
      if (!schedules.has(blockKey)) {
        schedules.set(blockKey, {
          blockNumber: block,
          plannedStart: plannedStart,
          plannedFinish: plannedFinish,
          component: row.Component || 'Precast'
        });
        processedCount++;
      } else {
        const existing = schedules.get(blockKey);
        // Keep earliest start
        if (plannedStart && (!existing.plannedStart || plannedStart < existing.plannedStart)) {
          existing.plannedStart = plannedStart;
        }
        // Keep latest finish
        if (plannedFinish && (!existing.plannedFinish || plannedFinish > existing.plannedFinish)) {
          existing.plannedFinish = plannedFinish;
        }
      }
    });
    
    this.scheduleByBlock = schedules;
    console.log(`✅ Processed schedules for ${schedules.size} blocks (${processedCount} unique blocks)`);
    console.log('   Block keys (first 20):', Array.from(schedules.keys()).slice(0, 20));
    
    // DETAILED DIAGNOSTIC: Show actual schedule data for each block
    console.log('\n=== SCHEDULE DATA DIAGNOSTIC ===');
    for (const [blockKey, scheduleData] of schedules.entries()) {
      console.log(`Block ${blockKey}:`, {
        plannedStart: scheduleData.plannedStart,
        plannedFinish: scheduleData.plannedFinish,
        formattedStart: this.formatScheduleDate(scheduleData.plannedStart),
        formattedFinish: this.formatScheduleDate(scheduleData.plannedFinish),
        component: scheduleData.component
      });
    }
    console.log('=== END DIAGNOSTIC ===\n');
  }

  /**
   * Get schedule data for a specific block
   */
  getBlockSchedule(blockNumber) {
    // Normalize block number to string for lookup
    const blockKey = String(blockNumber).trim();
    const result = this.scheduleByBlock.get(blockKey) || null;
    
    if (!result) {
      console.log(`⚠️ No schedule for block "${blockKey}" (type: ${typeof blockNumber})`);
      console.log(`   Available blocks:`, Array.from(this.scheduleByBlock.keys()).slice(0, 20));
    }
    
    return result;
  }

  /**
   * Parse Excel date (serial number or date string)
   */
  parseExcelDate(dateValue) {
    if (!dateValue) return null;
    
    // If already a Date object
    if (dateValue instanceof Date) return dateValue;
    
    // If Excel serial number (days since 1900-01-01)
    if (typeof dateValue === 'number') {
      // Excel incorrectly considers 1900 a leap year
      // Excel serial 1 = January 1, 1900
      // Excel serial 60 = February 29, 1900 (doesn't exist)
      // Excel serial 61 = March 1, 1900
      const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30)); // December 30, 1899
      const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
      
      // Adjust for Excel's leap year bug (dates after Feb 29, 1900)
      const adjustedValue = dateValue > 59 ? dateValue - 1 : dateValue;
      
      const milliseconds = adjustedValue * MILLISECONDS_PER_DAY;
      const date = new Date(EXCEL_EPOCH.getTime() + milliseconds);
      
      // Validate the date
      if (isNaN(date.getTime())) {
        console.warn(`⚠️ Invalid Excel date number: ${dateValue}`);
        return null;
      }
      
      return date;
    }
    
    // If string, try to parse
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    
    return null;
  }

  /**
   * Format date to DD-MMM-YY format (e.g., "1-Dec-25")
   */
  formatScheduleDate(date) {
    if (!date) return 'N/A';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    
    return `${day}-${month}-${year}`;
  }

  /**
   * Get data for a specific plot
   * @param {string|number} plotNumber - Plot number
   * @returns {Array} Data items for the plot
   */
  getDataByPlot(plotNumber) {
    const key = this.normalizeKey(plotNumber);
    return this.dataByPlot.get(key) || [];
  }

  /**
   * Get data for a specific block
   * @param {string|number} blockNumber - Block number
   * @returns {object} Block data with stats
   */
  getDataByBlock(blockNumber) {
    const key = this.normalizeKey(blockNumber);
    return this.dataByBlock.get(key);
  }

  /**
   * Get all unique blocks
   * @returns {Array} Array of block numbers
   */
  getAllBlocks() {
    return Array.from(this.dataByBlock.keys());
  }

  /**
   * Get statistics for all data
   * @returns {object} Overall statistics
   */
  getOverallStats() {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;

    this.dataByBlock.forEach(blockData => {
      total += blockData.stats.total;
      completed += blockData.stats.completed;
      inProgress += blockData.stats.inProgress;
      notStarted += blockData.stats.notStarted;
    });

    return {
      total,
      completed,
      inProgress,
      notStarted,
      blocks: this.dataByBlock.size,
      plots: this.dataByPlot.size,
      completionRate: total > 0 ? (completed / total * 100).toFixed(1) : 0
    };
  }

  /**
   * Normalize key for consistent lookup
   * @param {string|number} key - Key to normalize
   * @returns {string} Normalized key
   */
  normalizeKey(key) {
    if (key === null || key === undefined) return '';
    return String(key).trim().toLowerCase();
  }

  /**
   * Parse date from various formats
   * @param {string|number} dateValue - Date value
   * @returns {Date|null} Parsed date
   */
  parseDate(dateValue) {
    if (!dateValue) return null;
    
    // Handle Excel serial date numbers
    if (typeof dateValue === 'number') {
      return this.excelDateToJSDate(dateValue);
    }
    
    // Handle date strings
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Convert Excel serial date to JavaScript Date
   * @param {number} serial - Excel date serial
   * @returns {Date} JavaScript date
   */
  excelDateToJSDate(serial) {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
  }

  /**
   * Clear all data
   */
  clear() {
    this.rawData = null;
    this.parsedData = null;
    this.dataByPlot.clear();
    this.dataByBlock.clear();
    console.log('🧹 Data cleared');
  }
}

// Export singleton instance
export const dataParser = new DataParser();
export default dataParser;

// Make available globally immediately
if (typeof window !== 'undefined') {
  window.dataParser = dataParser;
}
