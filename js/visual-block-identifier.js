/**
 * Visual Block Identifier - Robust 3D Label System
 * Features:
 * - Circular badges with block numbers on villa clusters
 * - Block list panel positioned right of sidebar (no overlay)
 * - Draggable and resizable panel
 * - Real-time label position updates as camera moves
 */

import { viewerManager } from './viewer.js';

/**
 * Calculate the center point of a cluster of DBids
 * Uses the actual rendered/colored elements to find the visual cluster
 */
function calculateClusterCenter(dbIds, blockIndex) {
  if (!dbIds || dbIds.length === 0) return null;

  try {
    const viewer = window.viewerManager?.viewer;
    if (!viewer || !viewer.model || !viewer.impl) {
      return null;
    }

    // Get the actual bounds of what's being displayed
    // by checking all the visible fragments in the model
    const scene = viewer.impl.scene;
    if (!scene) return null;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let foundGeometry = false;

    // Traverse all children in the scene to find visible meshes
    scene.traverse((child) => {
      if (child.isMesh && child.userData && child.userData.dbId) {
        // Check if this mesh corresponds to one of our DBids
        if (dbIds.includes(child.userData.dbId)) {
          // Get the bounding box of this mesh
          const box = new THREE.Box3().setFromObject(child);
          if (box.min && box.max && box.isEmpty() === false) {
            minX = Math.min(minX, box.min.x);
            minY = Math.min(minY, box.min.y);
            minZ = Math.min(minZ, box.min.z);
            maxX = Math.max(maxX, box.max.x);
            maxY = Math.max(maxY, box.max.y);
            maxZ = Math.max(maxZ, box.max.z);
            foundGeometry = true;
          }
        }
      }
    });

    // If we found geometry, return the center
    if (foundGeometry && minX < Infinity && maxX > -Infinity) {
      const center = new THREE.Vector3(
        (minX + maxX) / 2,
        (minY + maxY) / 2,
        (minZ + maxZ) / 2
      );
      if (blockIndex === 0) {
        console.log(`✅ Block center from scene meshes`);
      }
      return center;
    }

    // Alternative: iterate through all mesh instances and check materials
    const fragList = viewer.model.getFragmentList();
    if (fragList && fragList.fragments) {
      for (let i = 0; i < fragList.fragments.length; i++) {
        const frag = fragList.fragments[i];
        if (!frag) continue;

        // Check if any DBid in this fragment is in our list
        const fragDbIds = [];
        for (const [dbId, fragId] of Object.entries(fragList.dbIdToFragId)) {
          if (fragId === i) {
            fragDbIds.push(parseInt(dbId));
          }
        }

        if (fragDbIds.some(id => dbIds.includes(id))) {
          const bounds = new THREE.Box3();
          fragList.getWorldBounds(i, bounds);
          
          if (bounds.min && bounds.max && !bounds.isEmpty()) {
            minX = Math.min(minX, bounds.min.x);
            minY = Math.min(minY, bounds.min.y);
            minZ = Math.min(minZ, bounds.min.z);
            maxX = Math.max(maxX, bounds.max.x);
            maxY = Math.max(maxY, bounds.max.y);
            maxZ = Math.max(maxZ, bounds.max.z);
            foundGeometry = true;
          }
        }
      }

      if (foundGeometry && minX < Infinity) {
        const center = new THREE.Vector3(
          (minX + maxX) / 2,
          (minY + maxY) / 2,
          (minZ + maxZ) / 2
        );
        if (blockIndex === 0) {
          console.log(`✅ Block center from fragment iteration`);
        }
        return center;
      }
    }

    if (blockIndex === 0) {
      console.log(`⚠️ Could not find rendered geometry for block (tried scene and fragments)`);
    }

    return null;
  } catch (error) {
    console.error('❌ Error in calculateClusterCenter:', error);
    return null;
  }
}

/**
 * Initialize or return existing labels container positioned in viewer
 */
function getLabelsContainer() {
  const viewer = window.viewerManager.viewer;
  const canvasParent = viewer.canvas.parentElement;

  // Ensure parent is relatively positioned
  if (window.getComputedStyle(canvasParent).position === 'static') {
    canvasParent.style.position = 'relative';
  }

  // Check if container exists
  let container = document.getElementById('blockLabelsContainer');
  if (container) {
    container.innerHTML = ''; // Clear old labels
    return container;
  }

  // Create new container
  container = document.createElement('div');
  container.id = 'blockLabelsContainer';
  container.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
  `;

  canvasParent.appendChild(container);
  console.log('✅ Labels container created and positioned in viewer');
  return container;
}

/**
 * Update all label positions (called in animation loop)
 */
function updateLabelPositions() {
  if (!window._blockLabels || window._blockLabels.length === 0) {
    return;
  }

  const viewer = window.viewerManager.viewer;
  if (!viewer || !viewer.impl || !viewer.impl.camera) {
    window._labelUpdateId = requestAnimationFrame(updateLabelPositions);
    return;
  }

  const camera = viewer.impl.camera;
  let visibleCount = 0;

  for (const labelData of window._blockLabels) {
    try {
      if (!labelData.element || !labelData.worldPosition) continue;

      // Convert 3D world coordinates to 2D screen coordinates
      const screenPos = viewer.worldToClient(labelData.worldPosition, camera);

      if (screenPos && screenPos.x && screenPos.y) {
        labelData.element.style.left = screenPos.x + 'px';
        labelData.element.style.top = screenPos.y + 'px';
        labelData.element.style.display = 'flex';
        labelData.element.style.visibility = 'visible';
        labelData.element.style.opacity = '1';
        visibleCount++;
      } else {
        labelData.element.style.display = 'none';
        labelData.element.style.visibility = 'hidden';
      }
    } catch (e) {
      if (labelData.element) {
        labelData.element.style.display = 'none';
        labelData.element.style.visibility = 'hidden';
      }
    }
  }

  if (visibleCount > 0 && window._labelDebugFirst) {
    console.log(`🎯 ${visibleCount}/${window._blockLabels.length} labels visible on villa clusters`);
    window._labelDebugFirst = false;
  }

  // Continue loop
  window._labelUpdateId = requestAnimationFrame(updateLabelPositions);
}

/**
 * Create 3D labels using bounding box centers of elements
 * This works with the actual geometry bounds in the model
 */
async function createBlockLabelsFromVisibleGeometry(sortedBlockData, colors) {
  try {
    const viewer = window.viewerManager?.viewer;
    if (!viewer || !viewer.model) {
      console.warn('⚠️ Viewer not available for label creation');
      return 0;
    }

    const container = getLabelsContainer();
    window._blockLabels = [];
    const tree = viewer.model.getInstanceTree();

    let colorIndex = 0;
    let labelCount = 0;

    // For each block, get the average position from bounding boxes
    for (const [block, blockInfo] of sortedBlockData) {
      const color = colors[colorIndex % colors.length];

      try {
        const positions = [];
        
        // Sample elements from this block
        const sampleSize = Math.min(blockInfo.dbIds.length, 20);
        for (let i = 0; i < sampleSize; i++) {
          const dbId = blockInfo.dbIds[i];
          
          try {
            // Try to get bounding box for this element
            const box = new THREE.Box3();
            tree.enumNodeFragments(dbId, (fragId) => {
              const fragBox = new THREE.Box3();
              viewer.model.getFragmentList().getWorldBounds(fragId, fragBox);
              if (fragBox.min && fragBox.max) {
                box.union(fragBox);
              }
            }, true); // true = recursive through children

            if (box.min && box.max && 
                box.min.x !== Infinity && box.max.x !== -Infinity) {
              const center = box.getCenter(new THREE.Vector3());
              positions.push(center);
            }
          } catch (e) {
            // Try alternative method: get bounds directly
            try {
              const bounds = viewer.model.getBoundingBox(dbId);
              if (bounds && bounds.min && bounds.max &&
                  bounds.min.x !== Infinity && bounds.max.x !== -Infinity) {
                const center = bounds.getCenter(new THREE.Vector3());
                positions.push(center);
              }
            } catch (e2) {
              continue;
            }
          }
        }

        // Calculate average position from all sampled elements
        if (positions.length > 0) {
          const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
          const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
          const avgZ = positions.reduce((sum, p) => sum + p.z, 0) / positions.length;

          const center = new THREE.Vector3(avgX, avgY, avgZ);

          console.log(`📍 Block ${block}: Center at (${avgX.toFixed(0)}, ${avgY.toFixed(0)}, ${avgZ.toFixed(0)}) from ${positions.length} elements`);

          // Create label element
          const label = createLabelElement(block, color, blockInfo);
          container.appendChild(label);

          // Store label data
          window._blockLabels.push({
            blockNumber: block,
            dbIds: blockInfo.dbIds,
            color: color,
            worldPosition: center,
            element: label
          });

          labelCount++;
        } else {
          console.warn(`⚠️ Block ${block}: No valid positions found`);
        }
      } catch (e) {
        console.warn(`⚠️ Could not get position for block ${block}:`, e);
      }

      colorIndex++;
    }

    // Start animation
    if (window._labelUpdateId) {
      cancelAnimationFrame(window._labelUpdateId);
    }
    if (labelCount > 0) {
      updateLabelPositions();
      console.log(`✅ Created ${labelCount} 3D block labels at actual cluster positions`);
    } else {
      console.warn(`⚠️ Could not create labels - no valid bounding boxes found`);
    }

    return labelCount;
  } catch (error) {
    console.error('❌ Error creating labels:', error);
    return 0;
  }
}

// Helper to create label DOM element
function createLabelElement(block, color, blockInfo) {
  const label = document.createElement('div');
  label.className = 'block-label-badge';
  label.textContent = block;

  // Determine contractor-based color - ONLY two colors: Light Blue for SPML, Golden for ABR
  let finalColor = '#999999'; // Default gray if no contractor

  // Get contractor info from blockInfo if available
  if (blockInfo.contractor) {
    const contractor = blockInfo.contractor.toUpperCase().trim();
    if (contractor === 'SPML') {
      finalColor = '#66B3FF'; // Light Blue for SPML
    } else if (contractor === 'ABR') {
      finalColor = '#FFD700'; // Golden for ABR
    }
  }

  label.style.cssText = `
    position: absolute;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${finalColor};
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 18px;
    color: white;
    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
    box-shadow: 0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
    transform: translate(-50%, -50%);
    z-index: 1000;
    pointer-events: auto;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    border: 2px solid rgba(255,255,255,0.3);
  `;

  label.addEventListener('mouseenter', () => {
    label.style.transform = 'translate(-50%, -50%) scale(1.25)';
    label.style.boxShadow = '0 6px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.4)';
  });

  label.addEventListener('mouseleave', () => {
    label.style.transform = 'translate(-50%, -50%) scale(1)';
    label.style.boxShadow = '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
  });

  label.addEventListener('click', (e) => {
    e.stopPropagation();
    window.isolateBlock(block, blockInfo.dbIds);
  });

  return label;
}

/**
 * Create 3D circular labels for each block (ORIGINAL - kept for reference)
 */
function createBlockLabels(sortedBlockData, colors) {
  try {
    const container = getLabelsContainer();
    window._blockLabels = [];

    let colorIndex = 0;
    let blockIndex = 0;
    for (const [block, blockInfo] of sortedBlockData) {
      const color = colors[colorIndex % colors.length];
      const center = calculateClusterCenter(blockInfo.dbIds, blockIndex);

      if (!center) {
        console.warn(`⚠️ Could not calculate center for block ${block}`);
        colorIndex++;
        blockIndex++;
        continue;
      }

      // Create label element
      const label = document.createElement('div');
      label.className = 'block-label-badge';
      label.textContent = block;

      label.style.cssText = `
        position: absolute;
        width: 50px;
        height: 50px;
        background: ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 18px;
        color: white;
        text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        box-shadow: 0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
        transform: translate(-50%, -50%);
        z-index: 1000;
        pointer-events: auto;
        cursor: pointer;
        user-select: none;
        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: 2px solid rgba(255,255,255,0.3);
      `;

      // Interaction handlers
      label.addEventListener('mouseenter', () => {
        label.style.transform = 'translate(-50%, -50%) scale(1.25)';
        label.style.boxShadow = '0 6px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.4)';
      });

      label.addEventListener('mouseleave', () => {
        label.style.transform = 'translate(-50%, -50%) scale(1)';
        label.style.boxShadow = '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
      });

      label.addEventListener('click', (e) => {
        e.stopPropagation();
        window.isolateBlock(block, blockInfo.dbIds);
      });

      container.appendChild(label);

      // Store label data for position updates
      window._blockLabels.push({
        blockNumber: block,
        dbIds: blockInfo.dbIds,
        color: color,
        worldPosition: center,
        element: label
      });

      // Debug first label position
      if (blockIndex === 0) {
        console.log(`🎯 First label (Block ${block}): 3D pos = (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);
        window._labelDebugFirst = true;
      }

      colorIndex++;
      blockIndex++;
    }

    // Start position update animation
    if (window._labelUpdateId) {
      cancelAnimationFrame(window._labelUpdateId);
    }
    updateLabelPositions();

    console.log(`✅ Created ${window._blockLabels.length} 3D block labels`);
    return window._blockLabels.length;
  } catch (error) {
    console.error('❌ Error creating block labels:', error);
    return 0;
  }
}

/**
 * Get the sidebar width to position panel correctly
 */
function getSidebarWidth() {
  const sidebar = document.querySelector('.sidebar');
  return sidebar ? sidebar.offsetWidth : 320;
}

/**
 * Initialize or get the block info panel
 */
function getBlockInfoPanel() {
  let panel = document.getElementById('blockInfoPanel');

  if (panel) {
    // Clear content but keep panel
    panel.innerHTML = '';
    return panel;
  }

  // Create new panel positioned to the right of sidebar
  panel = document.createElement('div');
  panel.id = 'blockInfoPanel';

  const sidebarWidth = getSidebarWidth();
  const panelLeft = sidebarWidth;

  panel.style.cssText = `
    position: fixed;
    left: ${panelLeft}px;
    bottom: 0;
    width: 220px;
    max-height: 450px;
    z-index: 9999;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    overflow: hidden;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    resize: both;
    cursor: default;
  `;

  document.body.appendChild(panel);

  console.log(`✅ Block panel created at x: ${panelLeft}px`);
  return panel;
}

/**
 * Show schedule panel for a specific block
 */
function showBlockSchedulePanel(blockNumber) {
  // Remove existing schedule panel if any
  const existing = document.getElementById('blockSchedulePanel');
  if (existing) existing.remove();
  
  // Get schedule data from dataParser
  if (!window.dataParser) {
    console.warn('⚠️ DataParser not available');
    return;
  }
  
  const schedule = window.dataParser.getBlockSchedule(blockNumber);
  if (!schedule) {
    console.warn(`⚠️ No schedule data for Block ${blockNumber}`);
    return;
  }
  
  // Format dates
  const startDate = window.dataParser.formatScheduleDate(schedule.plannedStart);
  const finishDate = window.dataParser.formatScheduleDate(schedule.plannedFinish);
  
  // Create panel
  const panel = document.createElement('div');
  panel.id = 'blockSchedulePanel';
  panel.style.cssText = `
    position: fixed;
    top: 100px;
    right: 50px;
    width: 300px;
    background: white;
    border: 2px solid #333;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: Arial, sans-serif;
  `;
  
  panel.innerHTML = `
    <div style="background: white; padding: 12px; border-bottom: 2px solid #333; text-align: center; font-weight: bold; font-size: 16px; position: relative;">
      Block - ${blockNumber}
      <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.1); border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-weight: bold; font-size: 16px; line-height: 1;">✕</button>
    </div>
    <div style="background: white; padding: 8px; text-align: center; font-weight: bold; border-bottom: 1px solid #ccc;">
      Schedule
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px; border: 1px solid #333; border-top: none; font-weight: normal;">Precast Start Date</td>
        <td style="padding: 10px; border: 1px solid #333; border-top: none; border-left: none; text-align: center;">${startDate}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #333; border-top: none; font-weight: normal;">Precast Finish Date</td>
        <td style="padding: 10px; border: 1px solid #333; border-top: none; border-left: none; text-align: center;">${finishDate}</td>
      </tr>
    </table>
  `;
  
  document.body.appendChild(panel);
  console.log(`📅 Schedule panel shown for Block ${blockNumber}: ${startDate} - ${finishDate}`);
}

/**
 * Create permanent schedule panel showing all blocks
 */
function createSchedulePanel(blockMap) {
  // Remove existing schedule panel if any
  const existing = document.getElementById('permanentSchedulePanel');
  if (existing) existing.remove();
  
  if (!window.dataParser || !window.dataParser.scheduleByBlock) {
    console.warn('⚠️ DataParser or schedule data not available');
    return;
  }
  
  console.log(`📅 Creating schedule panel for ${blockMap.size} blocks`);
  console.log(`   Schedule data has ${window.dataParser.scheduleByBlock.size} blocks`);
  
  // Get sorted blocks
  const sortedBlocks = Array.from(blockMap.keys()).sort((a, b) => {
    return (parseInt(a) || 0) - (parseInt(b) || 0);
  });
  
  console.log(`   Block list (first 10):`, sortedBlocks.slice(0, 10));
  
  // Create panel
  const panel = document.createElement('div');
  panel.id = 'permanentSchedulePanel';
  panel.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    width: 175px;
    max-height: calc(100vh - 120px);
    background: white;
    border: 2px solid #004E43;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 9998;
    font-family: Arial, sans-serif;
    display: flex;
    flex-direction: column;
    resize: both;
    overflow: auto;
    min-width: 150px;
    min-height: 200px;
  `;
  
  let html = `
    <div style="background: linear-gradient(135deg, #004E43 0%, #009A84 100%); color: white; padding: 12px; border-bottom: 2px solid #004E43; text-align: center; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center;">
      <span>📅 Schedule</span>
      <button onclick="document.getElementById('permanentSchedulePanel').remove()" style="background: rgba(255,255,255,0.25); color: white; border: none; padding: 3px 7px; border-radius: 3px; cursor: pointer; font-size: 11px; font-weight: bold;">✕</button>
    </div>
    <div style="overflow-y: auto; flex: 1; padding: 10px;">
  `;
  
  let foundSchedules = 0;
  
  // Add schedule for each block
  for (const block of sortedBlocks) {
    const schedule = window.dataParser.getBlockSchedule(block);
    if (!schedule) {
      console.log(`   No schedule for block ${block}`);
      continue;
    }
    
    foundSchedules++;
    const startDate = window.dataParser.formatScheduleDate(schedule.plannedStart);
    const finishDate = window.dataParser.formatScheduleDate(schedule.plannedFinish);
    
    html += `
      <div style="background: #f8f9fa; padding: 10px; margin-bottom: 8px; border-left: 4px solid #009A84; border-radius: 4px;">
        <div style="font-weight: bold; color: #004E43; margin-bottom: 5px;">Block ${block}</div>
        <table style="width: 100%; font-size: 11px;">
          <tr>
            <td style="padding: 3px; color: #666;">Start:</td>
            <td style="padding: 3px; font-weight: 600; text-align: right;">${startDate}</td>
          </tr>
          <tr>
            <td style="padding: 3px; color: #666;">Finish:</td>
            <td style="padding: 3px; font-weight: 600; text-align: right;">${finishDate}</td>
          </tr>
        </table>
      </div>
    `;
  }
  
  if (foundSchedules === 0) {
    html += `
      <div style="padding: 20px; text-align: center; color: #666;">
        <p>⚠️ No schedule data found</p>
        <p style="font-size: 11px; margin-top: 10px;">Please upload the Excel file with schedule data.</p>
      </div>
    `;
  }
  
  html += `</div>`;
  panel.innerHTML = html;
  
  document.body.appendChild(panel);
  console.log(`📅 Permanent schedule panel created with ${foundSchedules} blocks out of ${sortedBlocks.length}`);
}

/**
 * Toggle schedule panel visibility
 */
window.toggleSchedulePanel = function() {
  const panel = document.getElementById('permanentSchedulePanel');
  if (panel) {
    panel.remove();
  } else {
    // Recreate panel if it was closed
    const blockMap = window._currentBlockMap;
    if (blockMap) {
      createSchedulePanel(blockMap);
    }
  }
};

/**
 * Make panel draggable by header
 */
function makePanelDraggable(panel) {
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  // Wait for header to be added
  const attachDragListener = () => {
    const header = panel.querySelector('#blockPanelHeader');
    if (!header) {
      setTimeout(attachDragListener, 50);
      return;
    }

    header.style.cursor = 'move';

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragOffsetX = e.clientX - panel.offsetLeft;
      dragOffsetY = e.clientY - panel.offsetTop;
      header.style.background = 'linear-gradient(135deg, #5a6dcc 0%, #6a3a90 100%)';
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        panel.style.left = (e.clientX - dragOffsetX) + 'px';
        panel.style.top = (e.clientY - dragOffsetY) + 'px';
        panel.style.bottom = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      if (header) {
        header.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      }
    });
  };

  attachDragListener();
}

/**
 * Clear all 3D block labels
 */
function clearBlockLabels() {
  // Stop animation loop
  if (window._labelUpdateId) {
    cancelAnimationFrame(window._labelUpdateId);
    window._labelUpdateId = null;
  }

  // Clear container
  const container = document.getElementById('blockLabelsContainer');
  if (container) {
    container.innerHTML = '';
  }

  window._blockLabels = [];
  console.log('✅ Block labels cleared');
}

/**
 * Main export: Show interactive block list with 3D labels
 */
export async function showInteractiveBlockList(selectedNeighborhood, filteredDbIds) {
  console.log('\n' + '='.repeat(70));
  console.log('📊 Building block list with 3D labels');
  console.log('='.repeat(70));

  if (!window.embeddedDataManager?.elementData || !window.viewerManager?.viewer) {
    console.error('❌ Missing required managers');
    return;
  }

  const neighborhood = String(selectedNeighborhood).trim().toLowerCase();
  console.log(`📍 Neighborhood: ${neighborhood.toUpperCase()}`);

  // Group villa elements by block
  const blockMap = new Map();

  for (const dbId of filteredDbIds) {
    const element = window.embeddedDataManager.elementData.get(dbId);
    if (!element) continue;

    const elementNeighborhood = String(element.sector).trim().toLowerCase();
    if (elementNeighborhood !== neighborhood) continue;

    const block = element.block;
    if (!block) continue;

    if (!blockMap.has(block)) {
      // Get contractor from schedule data
      let contractor = null;
      if (window.dataParser && window.dataParser.scheduleByBlock) {
        const scheduleData = window.dataParser.scheduleByBlock.get(String(block).trim());
        if (scheduleData && scheduleData.villas && scheduleData.villas.length > 0) {
          contractor = scheduleData.villas[0].Contractor;
        }
      }
      
      blockMap.set(block, {
        block: block,
        dbIds: [],
        plots: new Set(),  // Track unique plot numbers
        types: new Set(),
        contractor: contractor  // Add contractor info
      });
    }

    const blockData = blockMap.get(block);
    blockData.dbIds.push(dbId);
    // Track unique plot numbers for accurate villa count
    if (element.plot) {
      blockData.plots.add(String(element.plot).trim());
    }
    blockData.types.add(element.villaType || 'Unknown');
  }

  // Sort blocks numerically
  const sortedBlocks = Array.from(blockMap.keys()).sort((a, b) => {
    return (parseInt(a) || 0) - (parseInt(b) || 0);
  });

  // Create sorted map
  const sortedBlockData = new Map();
  for (const block of sortedBlocks) {
    sortedBlockData.set(block, blockMap.get(block));
  }

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#AED6F1',
    '#FF8C00', '#20B2AA', '#FFD700', '#FF1493', '#00CED1'
  ];

  // Clear old labels
  clearBlockLabels();

  // Create 3D labels based on visible colored geometry
  createBlockLabelsFromVisibleGeometry(sortedBlockData, colors);

  // Save blockMap globally for schedule panel toggle
  window._currentBlockMap = blockMap;

  // Create permanent schedule panel
  createSchedulePanel(blockMap);

  // Create panel
  const panel = getBlockInfoPanel();
  makePanelDraggable(panel);

  // Build panel HTML with Roshn theme and minimize/maximize
  let html = `
    <div id="blockPanelHeader" style="background: linear-gradient(135deg, #004E43 0%, #009A84 100%); color: white; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 12px; border-bottom: 1px solid rgba(0,0,0,0.1);">
      <span>📍 ${neighborhood.toUpperCase()} BLOCKS</span>
      <div style="display: flex; gap: 5px;">
        <button onclick="window.toggleBlockPanel()" style="background: rgba(255,255,255,0.25); color: white; border: none; padding: 3px 7px; border-radius: 3px; cursor: pointer; font-size: 11px; font-weight: bold;">−</button>
        <button onclick="window.hideBlockLabels()" style="background: rgba(255,255,255,0.25); color: white; border: none; padding: 3px 7px; border-radius: 3px; cursor: pointer; font-size: 11px; font-weight: bold;">✕</button>
      </div>
    </div>
    <div id="blockPanelContent" style="background: white; display: flex; flex-direction: column; height: 450px;">
      <div style="overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 10px 10px 50px 10px;">
  `;

  let i = 0;
  for (const block of sortedBlocks) {
    const blockData = blockMap.get(block);
    const color = colors[i % colors.length];
    const villaTypes = Array.from(blockData.types).join(', ');
    const villaCount = blockData.plots ? blockData.plots.size : blockData.dbIds.length;

    html += `
      <div class="block-item" data-block="${block}" data-dbids="${blockData.dbIds.join(',')}" 
           style="background: #f8f9fa; padding: 8px 10px; border-left: 4px solid ${color}; border-radius: 4px; cursor: pointer; font-size: 12px; user-select: none; transition: all 0.15s ease;"
           onmouseover="this.style.backgroundColor='#e8f5f3'; this.style.transform='translateX(2px)'; this.style.boxShadow='0 1px 3px rgba(0,154,132,0.2)';"
           onmouseout="if(!this.classList.contains('selected')) { this.style.backgroundColor='#f8f9fa'; this.style.transform='none'; this.style.boxShadow='none'; }"
           onclick="window.toggleBlockSelection(this, ${block}, [${blockData.dbIds.join(',')}])">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 600; color: ${color}; font-size: 13px;">Block ${block}</div>
          <span class="block-checkbox" style="width: 16px; height: 16px; border: 2px solid #009A84; border-radius: 3px; display: inline-block; background: white;"></span>
        </div>
        <div style="color: #666; font-size: 11px;">${villaCount} villas • ${villaTypes}</div>
      </div>
    `;
    i++;
  }

  html += `
      </div>
      <div style="background: #f8f9fa; padding: 8px 12px; border-top: 1px solid #ddd; display: flex; gap: 8px; position: sticky; bottom: 0;">
        <button onclick="window.fitSelectedBlocks()" style="flex: 1; background: #009A84; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">Fit to View</button>
        <button onclick="window.clearBlockSelection()" style="flex: 1; background: #666; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">Clear</button>
      </div>
    </div>
  `;

  panel.innerHTML = html;

  console.log(`📋 Panel created with ${blockMap.size} blocks`);
  console.log(`🏷️  Labels: Distributed across model (click to isolate blocks)`);
  console.log('='.repeat(70) + '\n');
}

/**
 * Hide block labels and clear display
 */
export function hideBlockLabels() {
  const panel = document.getElementById('blockInfoPanel');
  if (panel) {
    panel.remove(); // Remove instead of hide, so it can be recreated
  }
  
  // Also remove schedule panel
  const schedulePanel = document.getElementById('permanentSchedulePanel');
  if (schedulePanel) {
    schedulePanel.remove();
  }

  clearBlockLabels();
  window._selectedBlocks?.clear();
  console.log('✅ Block labels and panels hidden');
}

/**
 * Isolate and zoom to a specific block
 */
export function isolateBlock(blockNumber, dbIds) {
  console.log(`🔍 Isolating block ${blockNumber} (${dbIds.length} villas)`);

  if (window.viewerManager) {
    window.viewerManager.isolate(dbIds);
    window.viewerManager.fitToView(dbIds);
  }
}

/**
 * Toggle block panel minimize/maximize
 */
export function toggleBlockPanel() {
  const content = document.getElementById('blockPanelContent');
  const btn = event.target;
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    btn.textContent = '−';
  } else {
    content.style.display = 'none';
    btn.textContent = '+';
  }
}

/**
 * Track selected blocks for multi-select
 */
window._selectedBlocks = new Set();

/**
 * Toggle block selection (multi-select with Ctrl/Cmd)
 */
export function toggleBlockSelection(element, blockNumber, dbIds) {
  const isCtrlPressed = event.ctrlKey || event.metaKey;
  
  if (!isCtrlPressed) {
    // Clear all previous selections
    document.querySelectorAll('.block-item.selected').forEach(item => {
      item.classList.remove('selected');
      item.style.backgroundColor = '#f8f9fa';
      const checkbox = item.querySelector('.block-checkbox');
      if (checkbox) checkbox.style.background = 'white';
    });
    window._selectedBlocks.clear();
  }
  
  // Toggle current selection
  if (element.classList.contains('selected')) {
    element.classList.remove('selected');
    element.style.backgroundColor = '#f8f9fa';
    const checkbox = element.querySelector('.block-checkbox');
    if (checkbox) checkbox.style.background = 'white';
    window._selectedBlocks.delete(blockNumber);
  } else {
    element.classList.add('selected');
    element.style.backgroundColor = '#e8f5f3';
    const checkbox = element.querySelector('.block-checkbox');
    if (checkbox) checkbox.style.background = '#009A84';
    window._selectedBlocks.add(blockNumber);
  }
  
  // Isolate all selected blocks
  const allSelectedDbIds = [];
  document.querySelectorAll('.block-item.selected').forEach(item => {
    const dbids = item.dataset.dbids.split(',').map(id => parseInt(id));
    allSelectedDbIds.push(...dbids);
  });
  
  if (allSelectedDbIds.length > 0 && window.viewerManager) {
    window.viewerManager.isolate(allSelectedDbIds);
  }
  
  console.log(`🔍 Selected ${window._selectedBlocks.size} blocks (${allSelectedDbIds.length} villas)`);
}

/**
 * Fit view to selected blocks
 */
export function fitSelectedBlocks() {
  const allSelectedDbIds = [];
  document.querySelectorAll('.block-item.selected').forEach(item => {
    const dbids = item.dataset.dbids.split(',').map(id => parseInt(id));
    allSelectedDbIds.push(...dbids);
  });
  
  if (allSelectedDbIds.length > 0 && window.viewerManager) {
    window.viewerManager.fitToView(allSelectedDbIds);
    console.log(`🎯 Fitted view to ${allSelectedDbIds.length} villas`);
  } else {
    console.warn('⚠️ No blocks selected');
  }
}

/**
 * Clear all block selections
 */
export function clearBlockSelection() {
  document.querySelectorAll('.block-item.selected').forEach(item => {
    item.classList.remove('selected');
    item.style.backgroundColor = '#f8f9fa';
    const checkbox = item.querySelector('.block-checkbox');
    if (checkbox) checkbox.style.background = 'white';
  });
  window._selectedBlocks.clear();
  
  if (window.viewerManager) {
    window.viewerManager.showAll();
  }
  
  console.log('✅ Block selection cleared');
}

// Expose globally
window.showInteractiveBlockList = showInteractiveBlockList;
window.hideBlockLabels = hideBlockLabels;
window.clearBlockLabels = clearBlockLabels;
window.createBlockLabelsFromVisibleGeometry = createBlockLabelsFromVisibleGeometry;
window.isolateBlock = isolateBlock;
window.toggleBlockPanel = toggleBlockPanel;
window.toggleBlockSelection = toggleBlockSelection;
window.fitSelectedBlocks = fitSelectedBlocks;
window.clearBlockSelection = clearBlockSelection;

export default {
  showInteractiveBlockList,
  hideBlockLabels,
  isolateBlock
};
