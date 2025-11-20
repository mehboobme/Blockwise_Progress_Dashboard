/**
 * Debug color application and neighborhood filtering
 */

export async function debugColorByNeighborhood() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🔍 DEBUG: COLOR BY NEIGHBORHOOD');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!window.embeddedDataManager) {
    console.error('❌ embeddedDataManager not found');
    return;
  }

  // Get all neighborhoods
  const neighborhoods = window.embeddedDataManager.getAllNeighborhoods();
  console.log(`✅ Available neighborhoods: ${neighborhoods.join(', ')}\n`);

  if (neighborhoods.length === 0) {
    console.error('❌ No neighborhoods found in data');
    return;
  }

  // Pick first neighborhood for testing
  const testNeighborhood = neighborhoods[0];
  console.log(`🧪 Testing with neighborhood: ${testNeighborhood}\n`);

  // Get elements in this neighborhood
  const elementsInNbh = window.embeddedDataManager.getElementsByNeighborhood(testNeighborhood);
  console.log(`📊 Elements in ${testNeighborhood}: ${elementsInNbh.length}\n`);

  if (elementsInNbh.length === 0) {
    console.error('❌ No elements found in neighborhood');
    return;
  }

  // Group by block
  const blockToDbIds = new Map();
  
  for (const dbId of elementsInNbh) {
    const elementInfo = window.embeddedDataManager.elementData.get(dbId);
    
    if (elementInfo) {
      const block = elementInfo.block;
      if (block) {
        if (!blockToDbIds.has(block)) {
          blockToDbIds.set(block, []);
        }
        blockToDbIds.get(block).push(dbId);
      }
    }
  }

  console.log(`📌 Blocks in ${testNeighborhood}:`);
  for (const [block, dbIds] of blockToDbIds.entries()) {
    console.log(`   Block ${block}: ${dbIds.length} elements`);
    if (dbIds.length <= 5) {
      console.log(`     DbIds: ${dbIds.join(', ')}`);
    }
  }

  console.log('\n🎨 Attempting to apply colors...\n');

  // Try to color first block
  if (blockToDbIds.size > 0) {
    const firstBlock = Array.from(blockToDbIds.keys())[0];
    const firstBlockDbIds = blockToDbIds.get(firstBlock);
    
    console.log(`Testing color on Block ${firstBlock} (${firstBlockDbIds.length} elements)`);
    
    const testColor = { r: 255, g: 0, b: 0, a: 0.7 };
    console.log(`Color to apply: ${JSON.stringify(testColor)}`);
    
    try {
      if (window.viewerManager && window.viewerManager.setColor) {
        window.viewerManager.setColor(firstBlockDbIds, testColor);
        console.log(`✅ setColor called successfully`);
      } else {
        console.error('❌ viewerManager.setColor not available');
      }
    } catch (e) {
      console.error(`❌ Error calling setColor: ${e.message}`);
    }
  }

  console.log('\n═════════════════════════════════════════════════════════════\n');
}

// Expose globally
window.debugColorByNeighborhood = debugColorByNeighborhood;

export default {
  debugColorByNeighborhood,
};
