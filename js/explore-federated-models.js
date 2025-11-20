/**
 * FEDERATED MODEL EXPLORER
 * Handles multiple models/files in federated setup
 * Finds villa file and its elements
 * Usage: await exploreFederatedModels()
 */

export async function exploreFederatedModels() {
  console.log('\n=== EXPLORING FEDERATED MODELS ===\n');
  
  const viewerManager = window.viewerManager;
  if (!viewerManager) {
    console.error('❌ viewerManager not found');
    return;
  }
  
  const viewer = viewerManager.viewer;
  if (!viewer) {
    console.error('❌ viewer not found');
    return;
  }
  
  console.log('🔍 Checking for multiple models/documents...\n');
  
  // Check if viewer has multiple models
  if (viewer.document) {
    console.log('✅ Found viewer.document');
    console.log(`   Type: ${viewer.document.constructor.name}`);
    console.log(`   Properties: ${Object.keys(viewer.document).slice(0, 10).join(', ')}`);
  }
  
  if (viewer.model) {
    console.log('✅ Found viewer.model');
    console.log(`   Type: ${viewer.model.constructor.name}`);
    
    // Get all instance trees
    const instanceTree = viewer.model.getInstanceTree();
    if (instanceTree) {
      console.log('   Has instance tree: YES');
      const rootId = instanceTree.getRootId();
      const rootName = instanceTree.getNodeName(rootId);
      console.log(`   Root node: "${rootName}" (DbId: ${rootId})`);
    }
  }
  
  // Try to access all models
  console.log('\n🔍 Checking for viewer.models (plural)...');
  if (viewer.models && Array.isArray(viewer.models)) {
    console.log(`✅ Found ${viewer.models.length} models!\n`);
    
    for (let i = 0; i < viewer.models.length; i++) {
      const model = viewer.models[i];
      console.log(`Model ${i}:`);
      console.log(`  Type: ${model.constructor.name}`);
      
      try {
        const tree = model.getInstanceTree();
        const rootId = tree.getRootId();
        const rootName = tree.getNodeName(rootId);
        console.log(`  Root: "${rootName}" (DbId: ${rootId})`);
        
        // Check if this is the villa model
        if (rootName.includes('Villa') || rootName.includes('Family')) {
          console.log(`  ⭐⭐⭐ THIS IS THE VILLA MODEL! ⭐⭐⭐`);
          
          // Explore this model
          console.log(`\n  Exploring villa model tree...`);
          let villaNodeCount = 0;
          
          function exploreVillaTree(nodeId, depth = 0) {
            if (villaNodeCount > 50) return;
            
            const nodeName = tree.getNodeName(nodeId);
            const indent = '    ' + '  '.repeat(depth);
            
            if (depth < 5 || nodeName.includes('DP') || nodeName.includes('TH') || nodeName.includes('VL')) {
              console.log(`${indent}DbId ${nodeId}: "${nodeName}"`);
              villaNodeCount++;
            }
            
            tree.enumNodeChildren(nodeId, (childId) => {
              exploreVillaTree(childId, depth + 1);
            });
          }
          
          exploreVillaTree(rootId);
          console.log(`  Found ${villaNodeCount} villa nodes`);
        }
      } catch (e) {
        console.log(`  Error: ${e.message}`);
      }
    }
  } else {
    console.log('❌ viewer.models not found or not array');
  }
  
  // Try alternate approach: check viewer context
  console.log('\n🔍 Checking viewer properties for model info...');
  const viewerProps = Object.getOwnPropertyNames(viewer)
    .filter(prop => prop.toLowerCase().includes('model') || prop.toLowerCase().includes('doc'))
    .slice(0, 20);
  
  console.log('Viewer properties related to models/documents:');
  viewerProps.forEach(prop => {
    try {
      const value = viewer[prop];
      const type = typeof value;
      console.log(`  ${prop}: ${type}`);
      if (Array.isArray(value)) {
        console.log(`    (Array with ${value.length} items)`);
      }
    } catch (e) {
      // Skip
    }
  });
  
  console.log('\n');
}

// Make globally accessible
window.exploreFederatedModels = exploreFederatedModels;
