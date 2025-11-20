/**
 * VILLA NODE FINDER - Find DP2, TH1, VL4, etc. nodes in the instance tree
 * These are the actual villa representation nodes we need
 * Usage: await findVillaNodes()
 */

export async function findVillaNodes() {
  console.log('\n=== FINDING VILLA REPRESENTATION NODES ===\n');
  
  const viewerManager = window.viewerManager;
  if (!viewerManager) {
    console.error('❌ viewerManager not found');
    return;
  }
  
  const viewer = viewerManager.viewer;
  if (!viewer || !viewer.model) {
    console.error('❌ viewer.model not found');
    return;
  }
  
  const instanceTree = viewer.model.getInstanceTree();
  if (!instanceTree) {
    console.error('❌ Instance tree not found');
    return;
  }
  
  console.log('🔍 Searching for villa nodes (DP2, TH1, VL4, DP4, VL1, VL2, VL5, TH3, C10, etc.)\n');
  
  const villaPatterns = ['DP', 'TH', 'VL', 'C'];
  const villaNodes = [];
  const allDbIds = await viewerManager.getAllDbIds();
  
  // Search through all DbIds to find villa representation nodes
  for (let i = 0; i < allDbIds.length; i++) {
    const dbId = allDbIds[i];
    
    try {
      const nodeName = instanceTree.getNodeName(dbId);
      
      if (nodeName && nodeName.includes('REPRESENTATION')) {
        // Check if it matches villa patterns
        const nameUpper = nodeName.toUpperCase();
        let isVilla = false;
        
        for (const pattern of villaPatterns) {
          if (nameUpper.includes(pattern)) {
            isVilla = true;
            break;
          }
        }
        
        if (isVilla) {
          villaNodes.push({ dbId, name: nodeName });
        }
      }
    } catch (e) {
      // Skip
    }
    
    // Progress
    if (i % 50000 === 0 && i > 0) {
      console.log(`⏳ Searched ${i}/${allDbIds.length}... Found ${villaNodes.length} villa nodes`);
    }
  }
  
  console.log(`\n✅ FOUND ${villaNodes.length} VILLA REPRESENTATION NODES!\n`);
  
  if (villaNodes.length > 0) {
    console.log('='.repeat(60));
    console.log('🏘️ VILLA NODES FOUND:\n');
    
    // Show first 10 villa nodes with their properties
    for (let i = 0; i < Math.min(10, villaNodes.length); i++) {
      const { dbId, name } = villaNodes[i];
      
      try {
        const props = await viewerManager.getProperties(dbId, null);
        
        console.log(`\n✅ Villa Node: ${name}`);
        console.log(`   DbId: ${dbId}`);
        console.log('   Properties:');
        
        if (props && props.properties) {
          props.properties
            .filter(p => p.displayValue && p.displayValue !== '')
            .forEach(p => {
              console.log(`     "${p.displayName}" = "${p.displayValue}"`);
            });
        } else {
          console.log('     (No properties on this node)');
          
          // Try getting parent properties
          const parentId = instanceTree.getParentId(dbId);
          if (parentId) {
            const parentProps = await viewerManager.getProperties(parentId, null);
            console.log(`   Parent (DbId ${parentId}) properties:`);
            if (parentProps && parentProps.properties) {
              parentProps.properties
                .filter(p => p.displayValue && p.displayValue !== '')
                .forEach(p => {
                  console.log(`     "${p.displayName}" = "${p.displayValue}"`);
                });
            }
          }
        }
      } catch (e) {
        console.log(`   Error getting properties: ${e.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n💡 Summary:`);
    console.log(`   Total villa nodes: ${villaNodes.length}`);
    console.log(`   Types: ${[...new Set(villaNodes.map(n => n.name.match(/[A-Z]+/)[0]))].sort().join(', ')}`);
    console.log('\n💡 Property names shown above are what we need to extract!\n');
    
    // List all villa node names
    console.log('Complete list of villa nodes found:');
    villaNodes.forEach(n => console.log(`  - ${n.name} (DbId: ${n.dbId})`));
  } else {
    console.log('❌ NO VILLA REPRESENTATION NODES FOUND');
    console.log('\n💡 Showing all REPRESENTATION nodes found:');
    
    const allRepNodes = [];
    for (const dbId of allDbIds) {
      try {
        const nodeName = instanceTree.getNodeName(dbId);
        if (nodeName && nodeName.includes('REPRESENTATION')) {
          allRepNodes.push({ dbId, name: nodeName });
        }
      } catch (e) {
        // Skip
      }
    }
    
    if (allRepNodes.length > 0) {
      console.log(`Found ${allRepNodes.length} REPRESENTATION nodes total:`);
      allRepNodes.slice(0, 20).forEach(n => console.log(`  - ${n.name} (DbId: ${n.dbId})`));
    } else {
      console.log('No REPRESENTATION nodes found at all');
    }
  }
  
  console.log('\n');
}

// Make globally accessible
window.findVillaNodes = findVillaNodes;
