/**
 * DEEP INSTANCE TREE EXPLORER
 * Walks the entire instance tree to find all nodes and their names
 * Shows villa-related nodes wherever they are
 * Usage: await exploreInstanceTree()
 */

export async function exploreInstanceTree() {
  console.log('\n=== DEEP INSTANCE TREE EXPLORATION ===\n');
  
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
  
  console.log('📋 Walking entire instance tree...\n');
  
  const rootId = instanceTree.getRootId();
  let nodeCount = 0;
  let villaNodes = [];
  let allNames = [];
  
  function walkTree(nodeId, depth = 0, parent = 'root') {
    if (nodeCount > 10000) return; // Limit to prevent timeout
    
    nodeCount++;
    
    try {
      const nodeName = instanceTree.getNodeName(nodeId);
      const nameUpper = nodeName.toUpperCase();
      
      // Collect all names for analysis
      allNames.push(nodeName);
      
      // Look for villa-related patterns
      const isVilla = nameUpper.includes('DP') || nameUpper.includes('TH') || 
                      nameUpper.includes('VL') || nameUpper.includes('VILLA') ||
                      nameUpper.includes('REPRESENTATION');
      
      // Only show villa-related nodes or first few levels
      if (depth < 4 || isVilla) {
        const indent = '  '.repeat(depth);
        const marker = isVilla ? '⭐ ' : '  ';
        console.log(`${indent}${marker}DbId ${nodeId}: ${nodeName}`);
        
        if (isVilla) {
          villaNodes.push({ dbId: nodeId, name: nodeName, depth });
        }
      }
      
      // Recurse to children
      instanceTree.enumNodeChildren(nodeId, (childId) => {
        walkTree(childId, depth + 1, nodeName);
      });
      
    } catch (e) {
      // Skip on error
    }
  }
  
  walkTree(rootId);
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total nodes walked: ${nodeCount}`);
  console.log(`Villa-related nodes found: ${villaNodes.length}\n`);
  
  if (villaNodes.length > 0) {
    console.log('🏘️ VILLA NODES:\n');
    villaNodes.forEach(node => {
      console.log(`  DbId ${node.dbId}: ${node.name} (depth: ${node.depth})`);
    });
    
    // Now get properties from villa nodes
    console.log(`\n🔍 Getting properties from villa nodes...\n`);
    
    for (let i = 0; i < Math.min(5, villaNodes.length); i++) {
      const node = villaNodes[i];
      console.log(`\n✅ Node: ${node.name} (DbId: ${node.dbId})`);
      
      try {
        const props = await viewerManager.getProperties(node.dbId, null);
        
        if (props && props.properties && props.properties.length > 0) {
          console.log('   Properties:');
          props.properties
            .filter(p => p.displayValue && p.displayValue !== '')
            .forEach(p => {
              console.log(`     "${p.displayName}" = "${p.displayValue}"`);
            });
        } else {
          console.log('   (No properties on this node)');
          
          // Try parent
          try {
            const parentId = instanceTree.getParentId(node.dbId);
            console.log(`   Trying parent (DbId ${parentId})...`);
            const parentProps = await viewerManager.getProperties(parentId, null);
            if (parentProps && parentProps.properties) {
              console.log('   Parent properties:');
              parentProps.properties
                .filter(p => p.displayValue && p.displayValue !== '')
                .forEach(p => {
                  console.log(`     "${p.displayName}" = "${p.displayValue}"`);
                });
            }
          } catch (e2) {
            // Skip parent
          }
        }
      } catch (e) {
        console.log(`   Error: ${e.message}`);
      }
    }
  } else {
    console.log('❌ NO VILLA NODES FOUND in tree');
    console.log('\n📋 Sample of node names found:');
    
    const sampleNames = allNames
      .filter(name => name && name.length > 0)
      .slice(0, 50);
    
    sampleNames.forEach(name => console.log(`  - "${name}"`));
    
    // Look for any interesting patterns
    const interesting = allNames.filter(name => 
      name && (name.includes('DP') || name.includes('TH') || name.includes('VL') ||
               name.includes('Generic') || name.includes('Family'))
    );
    
    if (interesting.length > 0) {
      console.log('\n⭐ Interesting names found:');
      interesting.forEach(name => console.log(`  - "${name}"`));
    }
  }
  
  console.log('\n');
}

// Make globally accessible
window.exploreInstanceTree = exploreInstanceTree;
