/**
 * Deep Debug: Block Labels System
 * Run this in console to diagnose issues
 */

export async function debugBlockLabelSystem() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 DEEP DIAGNOSTIC: Block Label System');
  console.log('='.repeat(80) + '\n');

  // 1. Check if viewer exists and is functional
  console.log('1️⃣ VIEWER CHECK:');
  if (window.viewerManager && window.viewerManager.viewer) {
    const viewer = window.viewerManager.viewer;
    console.log('   ✅ Viewer found');
    console.log('   - Viewer type:', viewer.constructor.name);
    console.log('   - Canvas exists:', !!viewer.canvas);
    console.log('   - Canvas parent:', viewer.canvas?.parentElement?.id || viewer.canvas?.parentElement?.className);
    console.log('   - Impl:', !!viewer.impl);
  } else {
    console.log('   ❌ Viewer NOT found');
    return;
  }

  // 2. Check embeddedDataManager
  console.log('\n2️⃣ DATA MANAGER CHECK:');
  if (window.embeddedDataManager && window.embeddedDataManager.elementData) {
    console.log('   ✅ Data manager found');
    console.log('   - Total elements:', window.embeddedDataManager.elementData.size);
    
    // Get sample element
    const [firstDbId, firstElement] = [...window.embeddedDataManager.elementData.entries()][0] || [];
    if (firstElement) {
      console.log('   - Sample element:', {
        dbId: firstDbId,
        name: firstElement.name,
        block: firstElement.block,
        neighborhood: firstElement.neighborhood,
        sector: firstElement.sector
      });
    }
  } else {
    console.log('   ❌ Data manager NOT found');
  }

  // 3. Check HTML structure
  console.log('\n3️⃣ HTML STRUCTURE CHECK:');
  const viewerContainer = document.getElementById('viewerContainer');
  const sidebar = document.querySelector('.sidebar');
  const mainContainer = document.querySelector('.main-container');
  
  console.log('   - viewerContainer:', !!viewerContainer, viewerContainer?.className);
  console.log('   - sidebar:', !!sidebar, sidebar?.className);
  console.log('   - mainContainer:', !!mainContainer, mainContainer?.className);
  
  const viewerParent = window.viewerManager.viewer.canvas.parentElement;
  console.log('   - Canvas parent element:', {
    id: viewerParent.id,
    className: viewerParent.className,
    tagName: viewerParent.tagName,
    position: window.getComputedStyle(viewerParent).position,
    width: viewerParent.clientWidth,
    height: viewerParent.clientHeight
  });

  // 4. Check if labels container exists
  console.log('\n4️⃣ LABELS CONTAINER CHECK:');
  const labelContainer = document.getElementById('blockLabelsContainer');
  console.log('   - blockLabelsContainer exists:', !!labelContainer);
  if (labelContainer) {
    console.log('   - Position:', window.getComputedStyle(labelContainer).position);
    console.log('   - Z-index:', window.getComputedStyle(labelContainer).zIndex);
    console.log('   - Width:', labelContainer.clientWidth);
    console.log('   - Height:', labelContainer.clientHeight);
    console.log('   - Children count:', labelContainer.children.length);
  }

  // 5. Check block info panel
  console.log('\n5️⃣ BLOCK INFO PANEL CHECK:');
  const blockPanel = document.getElementById('blockInfoPanel');
  console.log('   - blockInfoPanel exists:', !!blockPanel);
  if (blockPanel) {
    console.log('   - Display:', window.getComputedStyle(blockPanel).display);
    console.log('   - Position:', window.getComputedStyle(blockPanel).position);
    console.log('   - Z-index:', window.getComputedStyle(blockPanel).zIndex);
    console.log('   - Width:', blockPanel.clientWidth);
    console.log('   - Height:', blockPanel.clientHeight);
    console.log('   - Top:', blockPanel.style.top || 'not set');
    console.log('   - Left:', blockPanel.style.left || 'not set');
    console.log('   - Bottom:', blockPanel.style.bottom || 'not set');
    console.log('   - Right:', blockPanel.style.right || 'not set');
  }

  // 6. Test worldToClient function
  console.log('\n6️⃣ WORLD TO CLIENT TEST:');
  try {
    const testPoint = { x: 0, y: 0, z: 0 };
    const camera = window.viewerManager.viewer.impl.camera;
    const result = window.viewerManager.viewer.worldToClient(testPoint, camera);
    console.log('   ✅ worldToClient function works');
    console.log('   - Result:', result);
  } catch (e) {
    console.log('   ❌ worldToClient error:', e.message);
  }

  // 7. Check global block labels array
  console.log('\n7️⃣ GLOBAL BLOCK LABELS CHECK:');
  console.log('   - window._blockLabels:', window._blockLabels?.length || 0, 'labels');
  console.log('   - window._blockLabelsAnimating:', !!window._blockLabelsAnimating);
  if (window._blockLabels && window._blockLabels.length > 0) {
    console.log('   - Sample label:', {
      blockNumber: window._blockLabels[0].blockNumber,
      hasElement: !!window._blockLabels[0].element,
      elementType: window._blockLabels[0].element?.tagName,
      elementClass: window._blockLabels[0].element?.className
    });
  }

  // 8. Check CSS z-index and positioning
  console.log('\n8️⃣ CSS/LAYOUT CHECK:');
  const blockLabels = document.querySelectorAll('.block-label');
  console.log('   - Block labels found:', blockLabels.length);
  if (blockLabels.length > 0) {
    const firstLabel = blockLabels[0];
    console.log('   - First label styles:', {
      display: window.getComputedStyle(firstLabel).display,
      position: window.getComputedStyle(firstLabel).position,
      zIndex: window.getComputedStyle(firstLabel).zIndex,
      left: firstLabel.style.left,
      top: firstLabel.style.top,
      opacity: window.getComputedStyle(firstLabel).opacity,
      pointerEvents: window.getComputedStyle(firstLabel).pointerEvents
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Diagnostic complete');
  console.log('='.repeat(80) + '\n');
}

/**
 * Simple test: Create a single label at a fixed screen position
 */
export function testSingleLabel() {
  console.log('\n🧪 Testing single label creation...\n');

  const viewer = window.viewerManager?.viewer;
  if (!viewer) {
    console.log('❌ Viewer not found');
    return;
  }

  // Create container
  let container = document.getElementById('blockLabelsContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'blockLabelsContainer';
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;
    viewer.canvas.parentElement.style.position = 'relative';
    viewer.canvas.parentElement.appendChild(container);
    console.log('✅ Created labels container');
  }

  // Create test label at fixed position (top-left corner)
  const label = document.createElement('div');
  label.className = 'block-label';
  label.style.cssText = `
    position: absolute;
    width: 60px;
    height: 60px;
    background: #FF6B6B;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 24px;
    color: white;
    text-shadow: 0 0 4px rgba(0,0,0,0.5);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    left: 100px;
    top: 100px;
    z-index: 1000;
    pointer-events: auto;
  `;
  label.textContent = 'TEST';
  container.appendChild(label);
  
  console.log('✅ Test label created at position (100, 100)');
  console.log('   If you see a red circle with "TEST" in the viewer, the label system is working');
}

/**
 * Fix panel positioning to not overlay sidebar
 */
export function fixPanelPosition() {
  console.log('\n🔧 Fixing panel position...\n');

  const blockPanel = document.getElementById('blockInfoPanel');
  if (!blockPanel) {
    console.log('❌ Block panel not found');
    return;
  }

  const sidebar = document.querySelector('.sidebar');
  const mainContainer = document.querySelector('.main-container');

  if (!sidebar || !mainContainer) {
    console.log('❌ Sidebar or main container not found');
    return;
  }

  // Calculate position to the right of sidebar
  const sidebarWidth = sidebar.offsetWidth;
  const mainTop = mainContainer.offsetTop;
  const mainHeight = mainContainer.offsetHeight;

  // Position panel in the viewer area
  blockPanel.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: ${sidebarWidth + 20}px;
    width: 200px;
    max-height: 450px;
    z-index: 10000;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    padding: 0;
    resize: both;
    overflow: auto;
  `;

  console.log('✅ Panel repositioned');
  console.log('   - Sidebar width:', sidebarWidth);
  console.log('   - Panel left position:', sidebarWidth + 20);
}

// Export for global access
window.debugBlockLabelSystem = debugBlockLabelSystem;
window.testSingleLabel = testSingleLabel;
window.fixPanelPosition = fixPanelPosition;

export default {
  debugBlockLabelSystem,
  testSingleLabel,
  fixPanelPosition
};
