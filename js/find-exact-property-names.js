/**
 * DIAGNOSTIC - Find Exact Property Names
 * Run this in browser console after model loads
 * Usage: await findExactPropertyNames()
 */

export async function findExactPropertyNames() {
  console.log('\n=== FINDING EXACT PROPERTY NAMES ===\n');
  
  // Get viewerManager from the imported module or window
  let viewerManager = null;
  
  // Try different ways to access viewerManager
  if (window.viewerManager) {
    viewerManager = window.viewerManager;
    console.log('✅ Found viewerManager on window.viewerManager');
  } else if (window.dashboard && typeof window.dashboard === 'object') {
    // Try to find it in dashboard object
    for (const key in window.dashboard) {
      if (key === 'viewerManager' || (typeof window.dashboard[key] === 'object' && window.dashboard[key]?.getAllDbIds)) {
        viewerManager = window.dashboard[key];
        console.log(`✅ Found viewerManager at window.dashboard.${key}`);
        break;
      }
    }
  }
  
  if (!viewerManager) {
    console.error('❌ viewerManager not found!');
    console.log('\n💡 Try one of these:');
    console.log('  1. Make sure model is loaded (Load Model button)');
    console.log('  2. Check if dashboard initialized: console.log(window.dashboard)');
    console.log('  3. Check what\'s on window: console.log(Object.keys(window).filter(k => k.includes("viewer")))');
    return;
  }
  
  let allDbIds;
  try {
    allDbIds = await viewerManager.getAllDbIds();
  } catch (e) {
    console.error('❌ Failed to get DbIds:', e.message);
    return;
  }
  
  // Get a few samples from different parts of model
  const samples = [
    allDbIds[100],
    allDbIds[500],
    allDbIds[1000],
    allDbIds[5000]
  ];
  
  console.log('📋 Checking actual property names in model...\n');
  
  for (const dbId of samples) {
    const props = await viewerManager.getProperties(dbId, null);
    
    if (!props || !props.properties) continue;
    
    console.log(`\n🔍 Element DbId ${dbId}:`);
    console.log('─'.repeat(60));
    
    // Group by category
    const categories = {};
    
    props.properties.forEach(p => {
      const category = p.category || 'Other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({
        name: p.displayName,
        value: p.displayValue
      });
    });
    
    // Show all properties
    Object.entries(categories).forEach(([cat, props]) => {
      console.log(`\n  📁 ${cat}:`);
      props.forEach(p => {
        // Highlight the ones we care about
        if (p.name.includes('Block') || 
            p.name.includes('Plot') || 
            p.name.includes('NBH') || 
            p.name.includes('Villa') ||
            p.name.includes('Neighborhood') ||
            p.name.includes('Phase') ||
            p.name.includes('Zone')) {
          console.log(`    ⭐ "${p.name}" = "${p.value}"`);
        }
      });
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('COPY THE EXACT PROPERTY NAMES (with ⭐) TO UPDATE THE CODE');
  console.log('='.repeat(60) + '\n');
}

// Export for easy access
window.findExactPropertyNames = findExactPropertyNames;
