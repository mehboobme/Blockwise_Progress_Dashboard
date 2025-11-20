/**
 * Test if coloring works
 */

export function testColoring() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🧪 TESTING COLORING');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!window.viewerManager || !window.embeddedDataManager) {
    console.error('❌ Required managers not found');
    return;
  }

  // Get a few villa elements
  const neighborhoods = window.embeddedDataManager.getAllNeighborhoods();
  if (neighborhoods.length === 0) {
    console.error('❌ No neighborhoods found');
    return;
  }

  const neighborhood = neighborhoods[0];
  const elementsInNbh = window.embeddedDataManager.getElementsByNeighborhood(neighborhood);
  
  if (elementsInNbh.length === 0) {
    console.error('❌ No elements in neighborhood');
    return;
  }

  console.log(`Testing with neighborhood: ${neighborhood}`);
  console.log(`Total elements: ${elementsInNbh.length}\n`);

  // Take just first 10 elements
  const testDbIds = elementsInNbh.slice(0, 10);

  console.log(`Attempting to color ${testDbIds.length} elements RED...\n`);

  const redColor = { r: 255, g: 0, b: 0, a: 0.8 };
  
  try {
    window.viewerManager.setColor(testDbIds, redColor);
    console.log(`✅ setColor() called successfully`);
    console.log(`   DbIds colored: ${testDbIds.join(', ')}`);
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
  }

  // Also try isolating these elements to see them
  console.log(`\nNow isolating these ${testDbIds.length} elements...\n`);
  try {
    window.viewerManager.isolate(testDbIds);
    console.log(`✅ Isolation complete\n`);
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
  }

  console.log('═════════════════════════════════════════════════════════════\n');
}

// Expose globally
window.testColoring = testColoring;

export default {
  testColoring,
};
