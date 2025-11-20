/**
 * MODEL STRUCTURE EXPLORER
 * Shows the hierarchy and finds villa-related files
 * Usage: await exploreModelStructure()
 */

export async function exploreModelStructure() {
  console.log('\n=== EXPLORING MODEL STRUCTURE ===\n');
  
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
  
  console.log('📋 MODEL HIERARCHY:\n');
  
  // Get root node (usually node 1)
  const rootId = viewer.model.getInstanceTree().getRootId();
  console.log(`Root node ID: ${rootId}\n`);
  
  // Recursively explore tree
  let nodeCount = 0;
  let fileCount = 0;
  let villaFilesFound = [];
  
  function exploreNode(nodeId, depth = 0) {
    nodeCount++;
    
    if (nodeCount > 1000) return; // Limit to prevent timeout
    
    const nodeName = instanceTree.getNodeName(nodeId);
    const indent = '  '.repeat(depth);
    
    // Check if this node is a file
    if (nodeName.includes('.nwd') || nodeName.includes('.nwc') || nodeName.includes('.rvt') || nodeName.includes('.dwg')) {
      fileCount++;
      console.log(`${indent}📁 ${nodeName}`);
      
      // Check if villa-related
      if (nodeName.toLowerCase().includes('villa') || 
          nodeName.toLowerCase().includes('family') ||
          nodeName.includes('Al Arous')) {
        villaFilesFound.push(nodeName);
        console.log(`${indent}   ⭐ VILLA FILE FOUND!`);
      }
    } else if (depth < 5) { // Only show first few levels
      console.log(`${indent}📂 ${nodeName}`);
    }
    
    // Explore children
    instanceTree.enumNodeChildren(nodeId, (childId) => {
      exploreNode(childId, depth + 1);
    });
  }
  
  exploreNode(rootId);
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total nodes explored: ${nodeCount}`);
  console.log(`   Files found: ${fileCount}`);
  console.log(`   Villa files: ${villaFilesFound.length}\n`);
  
  if (villaFilesFound.length > 0) {
    console.log('⭐ VILLA FILES DETECTED:');
    villaFilesFound.forEach(name => console.log(`   - ${name}`));
    console.log('\n💡 These files contain the villa elements we need!');
    console.log('💡 We need to find elements from these files specifically\n');
  }
  
  // Now search for elements from villa files
  console.log('🔍 SEARCHING FOR ELEMENTS FROM VILLA FILES...\n');
  
  const allDbIds = await viewerManager.getAllDbIds();
  let villaElementsFound = 0;
  let sampleVillas = [];
  
  for (let i = 0; i < allDbIds.length && villaElementsFound < 5; i++) {
    const dbId = allDbIds[i];
    
    try {
      const props = await viewerManager.getProperties(dbId, null);
      if (!props || !props.properties) continue;
      
      const sourceFile = props.properties.find(p => 
        p.displayName === 'Source File' && p.displayValue
      );
      
      if (sourceFile) {
        const source = sourceFile.displayValue.toLowerCase();
        // Check if from villa file
        if (source.includes('villa') || source.includes('family') || 
            source.includes('al arous') || source.includes('power bi') ||
            source.includes('.rvt')) {
          
          villaElementsFound++;
          const nameProps = props.properties.find(p => p.displayName === 'Name');
          const categoryProps = props.properties.find(p => p.displayName === 'Category');
          
          console.log(`✅ Element DbId ${dbId}:`);
          console.log(`   Source: ${sourceFile.displayValue}`);
          console.log(`   Name: ${nameProps?.displayValue || 'N/A'}`);
          console.log(`   Category: ${categoryProps?.displayValue || 'N/A'}`);
          console.log(`   ALL PROPERTIES:`);
          
          props.properties
            .filter(p => p.displayValue && p.displayValue !== '')
            .forEach(p => {
              console.log(`     "${p.displayName}" = "${p.displayValue}"`);
            });
          
          sampleVillas.push({
            dbId,
            source: sourceFile.displayValue,
            props: props.properties
          });
          
          console.log('');
        }
      }
    } catch (e) {
      // Skip
    }
  }
  
  if (villaElementsFound === 0) {
    console.log('⚠️ NO ELEMENTS FROM VILLA FILES FOUND IN FIRST 200k ELEMENTS');
    console.log('\n💡 Possible reasons:');
    console.log('   1. Villa file is not currently loaded in the model');
    console.log('   2. Villa file is loaded but hidden/disabled');
    console.log('   3. Property names are different than expected');
    console.log('\n💡 Next step: Check the ACC Browser to see which files are visible');
    console.log('💡 Make sure villa file is checked/visible in the file tree\n');
  } else {
    console.log(`\n✅ Found ${villaElementsFound} villa elements!`);
    console.log('💡 Property names shown above - use these to update the extraction code\n');
  }
  
  console.log('='.repeat(60) + '\n');
}

// Make globally accessible
window.exploreModelStructure = exploreModelStructure;
