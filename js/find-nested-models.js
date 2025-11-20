/**
 * Explores nested model references within the main NWD file
 * The main file contains two child models: infrastructure and villas
 * This diagnostic finds and accesses both
 */

export async function findNestedModels() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🔍 FINDING NESTED MODELS IN MAIN NWD');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!window.viewerManager || !window.viewerManager.viewer) {
    console.error('❌ Viewer not initialized');
    return;
  }

  const viewer = window.viewerManager.viewer;
  const model = viewer.model;

  if (!model) {
    console.error('❌ No model loaded');
    return;
  }

  console.log('✅ Main model loaded:', model.constructor.name);
  
  const tree = model.getInstanceTree();
  const rootId = tree.getRootId();
  const rootName = tree.getNodeName(rootId);

  console.log(`   Root: "${rootName}" (DbId: ${rootId})\n`);

  // Walk the tree to find child nodes/references
  console.log('🔍 Walking model tree to find nested references...\n');

  const children = [];
  tree.enumNodeChildren(rootId, (childId) => {
    const childName = tree.getNodeName(childId);
    const childType = tree.getNodeType(childId);
    
    console.log(`[${childId}] ${childName}`);
    console.log(`   Type: ${childType}`);
    
    // Get properties to see if it's a reference to another file
    model.getProperties(childId, (result) => {
      if (result.properties) {
        console.log('   Properties:');
        result.properties.forEach((prop) => {
          console.log(`     - ${prop.displayName}: ${prop.displayValue}`);
        });
      }
    });
    
    children.push({ id: childId, name: childName, type: childType });
  });

  console.log(`\n✅ Found ${children.length} direct children of root\n`);

  // Look for nested model references
  console.log('🔍 Searching for referenced models (like Al Arous Family Villas)...\n');

  const villaIndicators = ['villa', 'arous', 'family', 'villas', 'nwc'];
  let villaFound = false;

  for (const child of children) {
    const name = child.name.toLowerCase();
    if (villaIndicators.some(indicator => name.includes(indicator))) {
      console.log(`🎯 VILLA REFERENCE FOUND: [${child.id}] ${child.name}`);
      villaFound = true;

      // Get all descendants of this villa node
      console.log('\n   Exploring villa node structure...');
      const villaDbIds = [];
      
      tree.enumNodeChildren(child.id, (dbId) => {
        villaDbIds.push(dbId);
      }, true); // Recursive

      console.log(`   Total DbIds under villa node: ${villaDbIds.length}`);
      
      // Sample some villa elements
      console.log('\n   Sampling first 20 villa elements:\n');
      for (let i = 0; i < Math.min(20, villaDbIds.length); i++) {
        const dbId = villaDbIds[i];
        const nodeName = tree.getNodeName(dbId);
        console.log(`   [${dbId}] ${nodeName}`);
      }

      // Get properties from villa elements
      console.log('\n🔍 Extracting villa element properties...\n');
      
      for (let i = 0; i < Math.min(5, villaDbIds.length); i++) {
        const dbId = villaDbIds[i];
        const nodeName = tree.getNodeName(dbId);
        
        console.log(`\n   Element [${dbId}]: ${nodeName}`);
        
        model.getProperties(dbId, (result) => {
          if (result.properties) {
            const villaProps = ['Block', 'Plot', 'NBH', 'Villa_Type', 'Element/Block', 'Element/Plot', 'Name', 'Type'];
            
            result.properties.forEach((prop) => {
              // Show all properties first
              console.log(`     ${prop.displayName}: ${prop.displayValue}`);
            });
          }
        });
      }

      return villaDbIds;
    }
  }

  if (!villaFound) {
    console.log('❌ Villa reference not found in direct children');
    console.log('   Looking in deeper tree levels...\n');

    // Walk entire tree looking for villa elements
    let allDbIds = [];
    tree.enumNodeChildren(rootId, (dbId) => {
      allDbIds.push(dbId);
    }, true); // Recursive

    console.log(`Total elements in model: ${allDbIds.length}`);

    // Search by name
    const villaLikeNames = [];
    for (const dbId of allDbIds) {
      const name = tree.getNodeName(dbId);
      if (name && (name.includes('Villa') || name.includes('Arous') || name.includes('DP2') || name.includes('TH1'))) {
        villaLikeNames.push({ id: dbId, name });
      }
    }

    if (villaLikeNames.length > 0) {
      console.log(`\n🎯 Found ${villaLikeNames.length} villa-like elements by name:\n`);
      villaLikeNames.slice(0, 20).forEach((item) => {
        console.log(`   [${item.id}] ${item.name}`);
      });
    }
  }
}

/**
 * Alternative approach: Check if model has external references
 */
export async function checkModelReferences() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🔍 CHECKING FOR EXTERNAL MODEL REFERENCES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!window.viewerManager || !window.viewerManager.viewer) {
    console.error('❌ Viewer not initialized');
    return;
  }

  const viewer = window.viewerManager.viewer;
  const model = viewer.model;

  if (!model) {
    console.error('❌ No model loaded');
    return;
  }

  // Check model properties
  console.log('Model properties:');
  console.log('  - Has getExternalIdMapping:', typeof model.getExternalIdMapping);
  console.log('  - Has getFragmentList:', typeof model.getFragmentList);
  console.log('  - Has getProperties:', typeof model.getProperties);
  console.log('  - Has getInstanceTree:', typeof model.getInstanceTree);

  // Look for references in model metadata
  if (model.myData) {
    console.log('\n  Model metadata:');
    console.log('    - viewerState:', model.myData.viewerState ? 'YES' : 'NO');
    console.log('    - externalReferences:', model.myData.externalReferences ? 'YES' : 'NO');
  }

  // Try to access document's file list
  const doc = viewer._curAvDocument;
  if (doc) {
    console.log('\nDocument file list:');
    
    // Common property names for file/model list
    const props = ['mSheets', 'files', 'models', 'sheets', 'pages', 'references'];
    for (const prop of props) {
      if (prop in doc) {
        console.log(`  - ${prop}: EXISTS`);
      }
    }
  }
}

// Expose globally
window.findNestedModels = findNestedModels;
window.checkModelReferences = checkModelReferences;

export default {
  findNestedModels,
  checkModelReferences,
};
