/**
 * Gantt Chart Module
 * Provides interactive schedule visualization with filtering and look-ahead capabilities
 */

import { dataParser } from './dataParser.js';

class GanttChart {
  constructor() {
    this.window = null;
    this.content = null;
    this.timeline = null;
    this.tasksContainer = null;
    this.toggleBtn = null;
    
    this.isMinimized = false;
    this.isMaximized = false;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    
    this.scheduleData = new Map();
    this.filteredData = new Map();
    this.villaData = []; // Store villa-level data
    this.dateRange = { start: null, end: null };
    this.showLookAhead = false;
    this.showVillas = false;
    
    this.timelineMonths = [];
    this.pixelsPerDay = 3;
    this.todayLinePosition = null; // Store today line position
    this.currentBlockMap = null; // Store block map to persist labels
    
    this.init();
  }
  
  init() {
    console.log('📊 Initializing Gantt Chart...');
    
    // Get DOM elements
    this.window = document.getElementById('ganttWindow');
    this.content = document.getElementById('ganttContent');
    this.timeline = document.getElementById('ganttTimeline');
    this.tasksContainer = document.getElementById('ganttTasks');
    this.toggleBtn = document.getElementById('ganttToggle');
    
    if (!this.window) {
      console.error('❌ Gantt window element not found');
      return;
    }
    
    this.setupEventListeners();
    this.setupDragging();
    
    console.log('✅ Gantt Chart initialized');
  }
  
  setupEventListeners() {
    // Toggle button
    this.toggleBtn?.addEventListener('click', () => this.toggleWindow());
    
    // Window controls
    document.getElementById('ganttClose')?.addEventListener('click', () => this.close());
    
    // Today button
    document.getElementById('ganttTodayBtn')?.addEventListener('click', () => this.jumpToToday());
    
    // Reset Today button
    document.getElementById('ganttResetTodayBtn')?.addEventListener('click', () => this.resetTodayLine());
    
    // Filter controls
    document.getElementById('ganttApplyFilter')?.addEventListener('click', () => this.applyDateFilter());
    document.getElementById('ganttResetFilter')?.addEventListener('click', () => this.resetFilter());
    
    // View options
    document.getElementById('ganttLookAhead')?.addEventListener('change', (e) => {
      this.showLookAhead = e.target.checked;
      this.renderChart();
    });
    
    document.getElementById('ganttLookAheadWeeks')?.addEventListener('change', () => {
      if (this.showLookAhead) {
        this.renderChart();
      }
    });
    
    document.getElementById('ganttShowVillas')?.addEventListener('change', (e) => {
      this.showVillas = e.target.checked;
      this.renderChart();
    });
    
    document.getElementById('ganttFilterModel')?.addEventListener('change', (e) => {
      this.filterVillasInModel(e.target.checked);
    });
  }
  
  setupDragging() {
    const header = this.window.querySelector('.gantt-header');
    
    header.addEventListener('mousedown', (e) => {
      if (this.isMaximized) return;
      
      this.isDragging = true;
      this.dragOffset.x = e.clientX - this.window.offsetLeft;
      this.dragOffset.y = e.clientY - this.window.offsetTop;
      
      document.addEventListener('mousemove', this.handleDrag);
      document.addEventListener('mouseup', this.handleDragEnd);
    });
  }
  
  handleDrag = (e) => {
    if (!this.isDragging) return;
    
    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;
    
    // Keep window within viewport
    const maxX = window.innerWidth - this.window.offsetWidth;
    const maxY = window.innerHeight - this.window.offsetHeight;
    
    this.window.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    this.window.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    this.window.style.right = 'auto';
    this.window.style.bottom = 'auto';
  };
  
  handleDragEnd = () => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.handleDragEnd);
  };
  
  jumpToToday() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Set date range: today to 3 months ahead
    const threeMonthsAhead = new Date(today);
    threeMonthsAhead.setMonth(today.getMonth() + 3);
    const endStr = threeMonthsAhead.toISOString().split('T')[0];
    
    document.getElementById('ganttStartDate').value = todayStr;
    document.getElementById('ganttEndDate').value = endStr;
    
    this.dateRange.start = today;
    this.dateRange.end = threeMonthsAhead;
    
    console.log(`📅 Jumped to today: ${todayStr} to ${endStr}`);
    
    this.applyFilters();
    this.renderChart();
  }
  
  resetTodayLine() {
    // Reset to actual today
    this.todayLinePosition = null;
    console.log('🔄 Today line reset to actual date');
    this.renderChart();
  }
  
  toggleWindow() {
    if (this.window.classList.contains('visible')) {
      this.close();
    } else {
      this.open();
    }
  }
  
  open() {
    this.window.classList.add('visible');
    this.toggleBtn.style.display = 'none';
    this.loadScheduleData();
  }
  
  close() {
    this.window.classList.remove('visible');
    this.toggleBtn.style.display = 'block';
    // Clear labels when closing window
    this.clearBlockLabels();
    this.currentBlockMap = null;
  }
  
  minimize() {
    this.isMinimized = !this.isMinimized;
    
    if (this.isMinimized) {
      this.window.classList.add('minimized');
    } else {
      this.window.classList.remove('minimized');
    }
  }
  
  maximize() {
    this.isMaximized = !this.isMaximized;
    
    if (this.isMaximized) {
      this.window.classList.add('maximized');
      this.window.style.left = '';
      this.window.style.top = '';
      this.window.style.right = '';
      this.window.style.bottom = '';
    } else {
      this.window.classList.remove('maximized');
    }
  }
  
  loadScheduleData() {
    console.log('📅 Loading schedule data for Gantt chart...');
    
    // Get data from dataParser
    if (!dataParser || !dataParser.scheduleByBlock) {
      this.showEmptyState('No schedule data loaded. Please upload an Excel file.');
      return;
    }
    
    this.scheduleData = new Map(dataParser.scheduleByBlock);
    
    // Extract villa-level data from block structure
    this.villaData = [];
    for (const [blockKey, blockData] of this.scheduleData.entries()) {
      if (blockData.villas && Array.isArray(blockData.villas)) {
        // Add block key to each villa for easy lookup
        blockData.villas.forEach(villa => {
          this.villaData.push({
            ...villa,
            Block: blockKey
          });
        });
      }
    }
    
    console.log(`📋 Loaded ${this.villaData.length} villa-level records from ${this.scheduleData.size} blocks`);
    
    if (this.scheduleData.size === 0) {
      this.showEmptyState('No schedule data found. Please upload an Excel file with block schedules.');
      return;
    }
    
    console.log(`✅ Loaded ${this.scheduleData.size} blocks from schedule`);
    
    // Debug: Log first block's data structure
    if (this.scheduleData.size > 0) {
      const firstBlock = Array.from(this.scheduleData.entries())[0];
      console.log('📋 Sample block data:', firstBlock);
      console.log('   plannedStart type:', typeof firstBlock[1].plannedStart);
      console.log('   plannedStart value:', firstBlock[1].plannedStart);
      console.log('   plannedFinish type:', typeof firstBlock[1].plannedFinish);
      console.log('   plannedFinish value:', firstBlock[1].plannedFinish);
      console.log('   villas count:', firstBlock[1].villas?.length || 0);
    }
    
    // Apply filters and render
    this.applyFilters();
    this.renderChart();
  }
  
  applyDateFilter() {
    const startInput = document.getElementById('ganttStartDate');
    const endInput = document.getElementById('ganttEndDate');
    
    const startDate = startInput.value ? new Date(startInput.value) : null;
    const endDate = endInput.value ? new Date(endInput.value) : null;
    
    if (startDate && endDate && startDate > endDate) {
      alert('Start date must be before end date');
      return;
    }
    
    this.dateRange.start = startDate;
    this.dateRange.end = endDate;
    
    console.log(`📅 Applying date filter: ${startDate?.toDateString() || 'none'} to ${endDate?.toDateString() || 'none'}`);
    console.log('   Filter active:', !!(this.dateRange.start || this.dateRange.end));
    
    this.applyFilters();
    this.renderChart();
  }
  
  resetFilter() {
    document.getElementById('ganttStartDate').value = '';
    document.getElementById('ganttEndDate').value = '';
    this.dateRange.start = null;
    this.dateRange.end = null;
    
    console.log('🔄 Resetting date filters');
    
    this.applyFilters();
    this.renderChart();
  }
  
  applyFilters() {
    this.filteredData = new Map();
    
    for (const [blockKey, blockData] of this.scheduleData.entries()) {
      let { plannedStart, plannedFinish } = blockData;
      
      // Ensure dates are Date objects
      if (plannedStart && !(plannedStart instanceof Date)) {
        plannedStart = new Date(plannedStart);
      }
      if (plannedFinish && !(plannedFinish instanceof Date)) {
        plannedFinish = new Date(plannedFinish);
      }
      
      // Skip if dates are invalid
      if (!plannedStart || !plannedFinish || isNaN(plannedStart.getTime()) || isNaN(plannedFinish.getTime())) {
        console.warn(`⚠️ Block ${blockKey} has invalid dates:`, { plannedStart, plannedFinish });
        continue;
      }
      
      // Apply date range filter
      if (this.dateRange.start || this.dateRange.end) {
        const startDate = this.dateRange.start;
        const endDate = this.dateRange.end;
        
        // Check if block overlaps with filter range
        const blockInRange = 
          (!startDate || plannedFinish >= startDate) &&
          (!endDate || plannedStart <= endDate);
        
        if (!blockInRange) continue;
      }
      
      // Apply look-ahead filter (adjustable weeks)
      if (this.showLookAhead) {
        const today = new Date();
        const weeksInput = document.getElementById('ganttLookAheadWeeks');
        const weeks = parseInt(weeksInput?.value || 12);
        const lookAheadDate = new Date(today);
        lookAheadDate.setDate(today.getDate() + (weeks * 7));
        
        if (plannedStart > lookAheadDate) continue;
      }
      
      // Update blockData with converted dates
      this.filteredData.set(blockKey, {
        ...blockData,
        plannedStart,
        plannedFinish
      });
    }
    
    console.log(`📊 Filtered data: ${this.filteredData.size} blocks`);
  }
  
  renderChart() {
    if (this.filteredData.size === 0) {
      this.showEmptyState('No blocks match the current filters.');
      return;
    }
    
    // Calculate timeline range
    const { minDate, maxDate } = this.calculateDateRange();
    
    // Generate timeline
    this.renderTimeline(minDate, maxDate);
    
    // Render tasks
    this.renderTasks(minDate, maxDate);
    
    // Add today line
    this.renderTodayLine(minDate, maxDate);
  }
  
  calculateDateRange() {
    let minDate = new Date();
    let maxDate = new Date();
    
    for (const [, blockData] of this.filteredData) {
      const { plannedStart, plannedFinish } = blockData;
      
      if (plannedStart && plannedStart < minDate) {
        minDate = new Date(plannedStart);
      }
      
      if (plannedFinish && plannedFinish > maxDate) {
        maxDate = new Date(plannedFinish);
      }
    }
    
    // Add padding
    minDate.setDate(1); // Start of month
    maxDate.setMonth(maxDate.getMonth() + 1);
    maxDate.setDate(0); // End of month
    
    return { minDate, maxDate };
  }
  
  renderTimeline(minDate, maxDate) {
    this.timeline.innerHTML = '';
    this.timelineMonths = [];
    
    // Header label
    const header = document.createElement('div');
    header.className = 'gantt-timeline-header';
    header.textContent = 'Blocks';
    this.timeline.appendChild(header);
    
    // Timeline grid
    const grid = document.createElement('div');
    grid.className = 'gantt-timeline-grid';
    
    const currentDate = new Date(minDate);
    
    while (currentDate <= maxDate) {
      const monthStart = new Date(currentDate);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const daysInMonth = monthEnd.getDate();
      const monthWidth = daysInMonth * this.pixelsPerDay;
      
      const monthCell = document.createElement('div');
      monthCell.className = 'gantt-timeline-month';
      monthCell.style.width = monthWidth + 'px';
      monthCell.innerHTML = `
        <div class="gantt-month-name">${monthStart.toLocaleDateString('en-US', { month: 'short' })}-${monthStart.getFullYear()}</div>
      `;
      
      grid.appendChild(monthCell);
      
      this.timelineMonths.push({
        date: new Date(monthStart),
        width: monthWidth,
        days: daysInMonth
      });
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    this.timeline.appendChild(grid);
  }
  
  renderTasks(minDate, maxDate) {
    this.tasksContainer.innerHTML = '';
    
    // Sort blocks by number
    const sortedBlocks = Array.from(this.filteredData.entries()).sort((a, b) => {
      const numA = parseInt(a[0]) || 0;
      const numB = parseInt(b[0]) || 0;
      return numA - numB;
    });
    
    for (const [blockKey, blockData] of sortedBlocks) {
      const taskRow = this.createTaskRow(blockKey, blockData, minDate, maxDate);
      this.tasksContainer.appendChild(taskRow);
      
      // Add villa rows if "Show Villas" is enabled
      if (this.showVillas) {
        const villaRows = this.createVillaRows(blockKey, minDate, maxDate);
        villaRows.forEach(row => this.tasksContainer.appendChild(row));
      }
    }
  }
  
  createVillaRows(blockKey, minDate, maxDate) {
    const rows = [];
    
    // Get villas from the block's data structure
    const blockData = this.scheduleData.get(blockKey);
    if (!blockData || !blockData.villas || blockData.villas.length === 0) {
      return rows;
    }
    
    const blockVillas = blockData.villas;
    
    // Sort by plot number
    blockVillas.sort((a, b) => {
      const plotA = parseInt(a.Plot) || 0;
      const plotB = parseInt(b.Plot) || 0;
      return plotA - plotB;
    });
    
    blockVillas.forEach((villa, index) => {
      const startDate = villa['Planned Start'];
      const finishDate = villa['Planned Finish'];
      
      if (!startDate || !finishDate) return;
      
      // Get status and precaster from villa data
      const status = villa.Status || '';
      const precaster = villa.PreCaster || '';
      
      // Debug first villa
      if (index === 0) {
        console.log('🏠 First villa in block:', {
          Plot: villa.Plot,
          Status: status,
          PreCaster: precaster,
          rawVilla: villa
        });
      }
      
      // Define status colors - exact match and partial match
      const statusColors = {
        'Raft Completed': '#0066FF',
        'Pre-Cast in Progress': '#66FFFF',
        'Pre-Cast Completed': '#CCCC00',
        'MEP & Finishes in Progress': '#FF66CC',
        'MEP & Finishes Completed': '#66FF33',
        'Villa Handover': '#339966'
      };
      
      // Try exact match first, then partial match
      let barColor = statusColors[status];
      if (!barColor) {
        // Partial match
        const statusLower = status.toLowerCase();
        if (statusLower.includes('raft')) barColor = '#0066FF';
        else if (statusLower.includes('pre-cast') && statusLower.includes('progress')) barColor = '#66FFFF';
        else if (statusLower.includes('pre-cast') && statusLower.includes('completed')) barColor = '#CCCC00';
        else if (statusLower.includes('mep') && statusLower.includes('progress')) barColor = '#FF66CC';
        else if (statusLower.includes('mep') && statusLower.includes('completed')) barColor = '#66FF33';
        else if (statusLower.includes('handover')) barColor = '#339966';
        else barColor = '#667eea'; // Default gray
      }
      
      const row = document.createElement('div');
      row.className = 'gantt-task-row';
      row.style.background = '#f9f9f9';
      
      // Villa label
      const label = document.createElement('div');
      label.className = 'gantt-task-label';
      label.style.paddingLeft = '30px'; // Indent to show hierarchy
      label.innerHTML = `
        <div class="gantt-task-name" style="font-size: 11px;">Plot ${villa.Plot}</div>
        <div class="gantt-task-meta">${precaster ? 'PC: ' + precaster : ''}</div>
      `;
      row.appendChild(label);
      
      // Villa timeline
      const timeline = document.createElement('div');
      timeline.className = 'gantt-task-timeline';
      
      const barPosition = this.calculateBarPosition(startDate, minDate);
      const barWidth = this.calculateBarWidth(startDate, finishDate);
      
      const bar = document.createElement('div');
      bar.className = 'gantt-task-bar villa-task';
      bar.style.left = barPosition + 'px';
      bar.style.width = barWidth + 'px';
      bar.style.background = barColor;
      
      const startStr = this.formatDate(startDate);
      const endStr = this.formatDate(finishDate);
      
      bar.innerHTML = `<span>${precaster || ''}</span>`;
      bar.title = `Plot ${villa.Plot}\nStatus: ${status}\nPrecaster: ${precaster}\nStart: ${startStr}\nFinish: ${endStr}`;
      
      timeline.appendChild(bar);
      row.appendChild(timeline);
      
      rows.push(row);
    });
    
    return rows;
  }
  
  renderTodayLine(minDate, maxDate) {
    // Remove existing today line
    const existingLine = this.tasksContainer.querySelector('.gantt-today-line');
    if (existingLine) {
      existingLine.remove();
    }
    
    // Use stored position or calculate from today's date
    let todayDate;
    if (this.todayLinePosition !== null) {
      // Use stored date
      todayDate = new Date(this.todayLinePosition);
    } else {
      // Use actual today
      todayDate = new Date();
      this.todayLinePosition = todayDate.getTime();
    }
    
    // Check if today is within the visible range
    if (todayDate < minDate || todayDate > maxDate) {
      console.log('ℹ️ Today line outside visible range');
      return;
    }
    
    // Calculate position
    const position = this.calculateBarPosition(todayDate, minDate);
    
    // Create today line
    const line = document.createElement('div');
    line.className = 'gantt-today-line';
    line.style.left = position + 'px';
    
    // Make it draggable
    let isDragging = false;
    let startX = 0;
    let startLeft = 0;
    
    line.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startLeft = position;
      line.classList.add('dragging');
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const newLeft = startLeft + deltaX;
      
      // Update line position
      line.style.left = newLeft + 'px';
      
      // Calculate new date
      const daysMoved = Math.round(deltaX / this.pixelsPerDay);
      const newDate = new Date(todayDate);
      newDate.setDate(newDate.getDate() + daysMoved);
      
      // Update tooltip
      line.title = `Today Line: ${this.formatDate(newDate)} (drag to adjust)`;
    });
    
    document.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      
      isDragging = false;
      line.classList.remove('dragging');
      
      // Calculate final date based on position
      const deltaX = e.clientX - startX;
      const daysMoved = Math.round(deltaX / this.pixelsPerDay);
      const newDate = new Date(todayDate);
      newDate.setDate(newDate.getDate() + daysMoved);
      
      // Store new position
      this.todayLinePosition = newDate.getTime();
      
      console.log(`📅 Today line moved to: ${this.formatDate(newDate)}`);
      
      // Filter blocks up to the moved date
      this.filterBlocksByTodayLine(newDate);
    });
    
    line.title = `Today: ${this.formatDate(todayDate)} (drag to adjust)`;
    
    this.tasksContainer.appendChild(line);
  }
  
  filterBlocksByTodayLine(todayDate) {
    // Filter to show only blocks that start before or on the today line date
    console.log(`📊 Filtering blocks up to ${this.formatDate(todayDate)}`);
    
    const originalFilteredSize = this.filteredData.size;
    const newFilteredData = new Map();
    
    for (const [blockKey, blockData] of this.scheduleData.entries()) {
      let { plannedStart, plannedFinish } = blockData;
      
      // Ensure dates are Date objects
      if (plannedStart && !(plannedStart instanceof Date)) {
        plannedStart = new Date(plannedStart);
      }
      if (plannedFinish && !(plannedFinish instanceof Date)) {
        plannedFinish = new Date(plannedFinish);
      }
      
      if (!plannedStart || isNaN(plannedStart.getTime())) continue;
      
      // Include blocks that start on or before the today line
      if (plannedStart <= todayDate) {
        newFilteredData.set(blockKey, {
          ...blockData,
          plannedStart,
          plannedFinish
        });
      }
    }
    
    this.filteredData = newFilteredData;
    console.log(`✅ Filtered from ${originalFilteredSize} to ${this.filteredData.size} blocks`);
    
    // Re-render chart with filtered data
    this.renderChart();
  }
  
  filterVillasInModel(enabled) {
    // Check if viewer and data managers are available
    if (!window.viewerManager || !window.viewerManager.viewer) {
      console.warn('⚠️ Viewer not available for villa filtering');
      return;
    }
    
    if (!window.embeddedDataManager) {
      console.warn('⚠️ Embedded data manager not available. Please analyze the model first.');
      return;
    }
    
    const viewer = window.viewerManager.viewer;
    const model = viewer.model;
    
    if (!model) {
      console.warn('⚠️ No model loaded');
      return;
    }
    
    if (enabled && this.filteredData.size > 0) {
      // Get all scheduled plot numbers from filtered data
      const scheduledPlots = new Set();
      const blockMap = new Map();
      
      for (const [blockKey] of this.filteredData) {
        const blockVillas = this.villaData.filter(row => {
          const blockNum = String(row.Block || row.block).trim();
          return blockNum === blockKey;
        });
        
        const blockDbIds = [];
        
        blockVillas.forEach(villa => {
          const plotNum = String(villa.Plot || villa.plot).trim();
          scheduledPlots.add(plotNum);
          
          // Get DBIDs for this plot
          const plotDbIds = window.embeddedDataManager.getElementsByPlot(plotNum);
          if (plotDbIds && plotDbIds.length > 0) {
            blockDbIds.push(...plotDbIds);
          }
        });
        
        // Store block data for labels
        if (blockDbIds.length > 0) {
          blockMap.set(blockKey, {
            block: blockKey,
            dbIds: blockDbIds,
            types: new Set()
          });
        }
      }
      
      console.log(`🏛️ Filtering model to show ${scheduledPlots.size} scheduled villas from ${this.filteredData.size} blocks`);
      
      // Use embeddedDataManager to get DBIDs (same as sidebar filters)
      const dbIdsToShow = [];
      
      for (const plotNum of scheduledPlots) {
        const plotDbIds = window.embeddedDataManager.getElementsByPlot(plotNum);
        if (plotDbIds && plotDbIds.length > 0) {
          dbIdsToShow.push(...plotDbIds);
        }
      }
      
      if (dbIdsToShow.length > 0) {
        // Use isolate() and fitToView() - same as sidebar filters
        window.viewerManager.isolate(dbIdsToShow);
        window.viewerManager.fitToView(dbIdsToShow);
        
        // Create block labels (same as visual-block-identifier)
        this.currentBlockMap = blockMap;
        this.createBlockLabels(blockMap);
        
        console.log(`✅ Isolated ${dbIdsToShow.length} elements for ${scheduledPlots.size} scheduled villas`);
        console.log(`   ${blockMap.size} blocks with floating labels`);
      } else {
        console.warn('⚠️ No elements found for scheduled plots');
        console.log('   Scheduled plots:', Array.from(scheduledPlots).slice(0, 10));
        console.log('   Available plots in model:', window.embeddedDataManager.getAllPlots().slice(0, 10));
        console.log('   💡 TIP: Make sure plot numbers in Excel match the model (e.g., "425" vs "425")');
      }
    } else {
      // Show all when filter is off, but KEEP labels visible
      window.viewerManager.showAll();
      console.log('🔄 Showing all elements (filter disabled, labels persist)');
    }
  }
  
  createBlockLabels(blockMap) {
    // Use the same label system as visual-block-identifier
    if (window.clearBlockLabels) {
      window.clearBlockLabels();
    }
    
    if (!blockMap || blockMap.size === 0) return;
    
    // Define colors for blocks
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#AED6F1',
      '#FF8C00', '#20B2AA', '#FFD700', '#FF1493', '#00CED1'
    ];
    
    // Sort blocks numerically
    const sortedBlocks = Array.from(blockMap.keys()).sort((a, b) => {
      return (parseInt(a) || 0) - (parseInt(b) || 0);
    });
    
    const sortedBlockData = new Map();
    for (const block of sortedBlocks) {
      sortedBlockData.set(block, blockMap.get(block));
    }
    
    // Create labels using the global function if available
    if (window.createBlockLabelsFromVisibleGeometry) {
      window.createBlockLabelsFromVisibleGeometry(sortedBlockData, colors);
      console.log(`✅ Created ${blockMap.size} block labels`);
    } else {
      console.warn('⚠️ Block label creation function not available');
    }
  }
  
  clearBlockLabels() {
    if (window.clearBlockLabels) {
      window.clearBlockLabels();
    }
  }
  
  createTaskRow(blockKey, blockData, minDate, maxDate) {
    const { blockNumber, plannedStart, plannedFinish, component } = blockData;
    
    // Get villa info for this block
    const blockVillas = this.villaData.filter(row => {
      const blockNum = String(row.Block || row.block).trim();
      return blockNum === blockKey;
    });
    
    const villaCount = blockVillas.length;
    const villaTypes = new Set(blockVillas.map(v => v['Villa Type'] || v.Villa || 'N/A'));
    const villaTypeStr = Array.from(villaTypes).join(', ');
    
    const row = document.createElement('div');
    row.className = 'gantt-task-row';
    
    // Task label with villa info
    const label = document.createElement('div');
    label.className = 'gantt-task-label';
    label.innerHTML = `
      <div class="gantt-task-name">Block ${blockNumber}</div>
      <div class="gantt-task-meta">${villaCount} villa${villaCount !== 1 ? 's' : ''} • ${villaTypeStr}</div>
    `;
    row.appendChild(label);
    
    // Task timeline
    const timeline = document.createElement('div');
    timeline.className = 'gantt-task-timeline';
    
    // Calculate bar position and width
    const barPosition = this.calculateBarPosition(plannedStart, minDate);
    const barWidth = this.calculateBarWidth(plannedStart, plannedFinish);
    
    // Task bar
    const bar = document.createElement('div');
    bar.className = 'gantt-task-bar';
    bar.style.left = barPosition + 'px';
    bar.style.width = barWidth + 'px';
    
    const startStr = this.formatDate(plannedStart);
    const endStr = this.formatDate(plannedFinish);
    
    bar.innerHTML = `
      <span>${startStr} - ${endStr}</span>
    `;
    
    bar.title = `Block ${blockNumber}\nStart: ${startStr}\nFinish: ${endStr}`;
    
    timeline.appendChild(bar);
    row.appendChild(timeline);
    
    return row;
  }
  
  calculateBarPosition(startDate, timelineStart) {
    const daysDiff = Math.floor((startDate - timelineStart) / (1000 * 60 * 60 * 24));
    return daysDiff * this.pixelsPerDay;
  }
  
  calculateBarWidth(startDate, endDate) {
    const duration = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    return duration * this.pixelsPerDay;
  }
  
  formatDate(date) {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short', 
      year: '2-digit' 
    });
  }
  
  showEmptyState(message) {
    this.timeline.innerHTML = '';
    this.tasksContainer.innerHTML = `
      <div class="gantt-empty-state">
        <div class="gantt-empty-state-icon">📊</div>
        <div class="gantt-empty-state-text">${message}</div>
        <div class="gantt-empty-state-hint">Upload an Excel file with schedule data to visualize the timeline.</div>
      </div>
    `;
  }
  
  // Public method to refresh chart when new data is loaded
  refresh() {
    console.log('🔄 Refreshing Gantt chart...');
    this.loadScheduleData();
  }
}

// Create singleton instance
export const ganttChart = new GanttChart();

// Make available globally for debugging
window.ganttChart = ganttChart;
