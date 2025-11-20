/**
 * Explores viewer._curAvDocument structure to find all loaded models in federated setup
 * This is the key to accessing the villa model from the infrastructure model
 */

export async function exploreDocumentStructure() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🔍 EXPLORING VIEWER._CURAVDOCUMENT STRUCTURE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!window.viewerManager || !window.viewerManager.viewer) {
    console.error('❌ Viewer not initialized. Try calling window.exploreDocumentStructure() after loading model.');
    return;
  }

  const viewer = window.viewerManager.viewer;

  // Check _curAvDocument
  if (!viewer._curAvDocument) {
    console.error('❌ viewer._curAvDocument not found');
    return;
  }

  console.log('✅ Found viewer._curAvDocument (the document/workspace containing all models)');
  const doc = viewer._curAvDocument;

  // Explore document structure
  console.log('\n📋 Document Properties:');
  console.log('  - Type:', doc.constructor.name);
  console.log('  - Is Avp.Document:', doc instanceof Autodesk.Viewing.Document ? 'YES' : 'MAYBE');

  // Look for models list in document
  console.log('\n🔍 Searching for models array in document...');

  // Common property names for models array
  const modelProperties = [
    'models',           // Direct models array
    'mModels',          // Private models array
    '_models',          // Private models array
    'allModels',        // All models
    'getLoadedModels',  // Method to get models
    'getRootModel',     // Get root model
    'geometries',       // Geometry list
    'fragments',        // Fragments
  ];

  for (const prop of modelProperties) {
    if (prop in doc) {
      const value = doc[prop];
      if (typeof value === 'function') {
        console.log(`  📌 ${prop}: [FUNCTION]`);
        try {
          const result = value.call(doc);
          console.log(`     Calling ${prop}() returns:`, result);
        } catch (e) {
          console.log(`     Error calling ${prop}():`, e.message);
        }
      } else if (Array.isArray(value)) {
        console.log(`  📌 ${prop}: [ARRAY] Length: ${value.length}`);
        if (value.length > 0) {
          for (let i = 0; i < value.length; i++) {
            const item = value[i];
            const name = item.name || item.documentId || item.guid || `Item ${i}`;
            console.log(`     [${i}]: ${name} (${item.constructor.name})`);
          }
        }
      } else if (value && typeof value === 'object') {
        console.log(`  📌 ${prop}: [OBJECT]`, Object.keys(value).slice(0, 5).join(', '));
      }
    }
  }

  // Try to find villa model specifically
  console.log('\n🔍 Looking for villa model...');
  
  // Check if document has method to get specific models
  if (typeof doc.getLoadedModels === 'function') {
    try {
      const models = doc.getLoadedModels();
      console.log(`\n✅ Found getLoadedModels() - returned ${models.length} models:`);
      
      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        const tree = model.getInstanceTree();
        const rootId = tree.getRootId();
        const rootName = tree.getNodeName(rootId);
        
        console.log(`\n  🏗️  Model ${i}: "${rootName}"`);
        console.log(`     - Constructor: ${model.constructor.name}`);
        console.log(`     - Has getInstanceTree: ${typeof model.getInstanceTree === 'function'}`);
        console.log(`     - DbId count: ${model.getInstanceTree().getNodeCount()}`);
        
        // Look for villa identifiers
        if (rootName.toLowerCase().includes('villa') || rootName.includes('Arous')) {
          console.log(`     🎯 ⭐ VILLA MODEL FOUND! (Index: ${i})`);
        }
        if (rootName.toLowerCase().includes('infrastructure') || rootName.includes('ZZZ') || rootName.includes('SPC')) {
          console.log(`     🏢 INFRASTRUCTURE MODEL (Index: ${i})`);
        }
      }
      
      return models;
    } catch (e) {
      console.error('Error calling getLoadedModels():', e.message);
    }
  }

  // Check viewer's all models if document method didn't work
  console.log('\n🔍 Checking viewer._allModels...');
  if (viewer._allModels) {
    console.log(`✅ Found viewer._allModels: ${viewer._allModels.length} models`);
    for (let i = 0; i < viewer._allModels.length; i++) {
      const model = viewer._allModels[i];
      try {
        const tree = model.getInstanceTree();
        const rootId = tree.getRootId();
        const rootName = tree.getNodeName(rootId);
        console.log(`  [${i}]: "${rootName}"`);
      } catch (e) {
        console.log(`  [${i}]: Unable to get name`);
      }
    }
    return viewer._allModels;
  }

  // Last resort: search viewer properties
  console.log('\n🔍 Searching all viewer properties for model arrays...');
  const allProps = Object.getOwnPropertyNames(viewer);
  let foundModels = [];

  for (const prop of allProps) {
    try {
      const value = viewer[prop];
      if (Array.isArray(value) && value.length > 0) {
        // Check if array contains model-like objects
        if (typeof value[0].getInstanceTree === 'function') {
          console.log(`✅ Found array of models in viewer.${prop}`);
          foundModels.push({ prop, value });
        }
      }
    } catch (e) {
      // Skip error-prone properties
    }
  }

  if (foundModels.length > 0) {
    console.log(`\nFound ${foundModels.length} model arrays:`);
    for (const { prop, value } of foundModels) {
      console.log(`\n  📌 viewer.${prop} (${value.length} models):`);
      for (let i = 0; i < value.length; i++) {
        const model = value[i];
        try {
          const tree = model.getInstanceTree();
          const rootId = tree.getRootId();
          const rootName = tree.getNodeName(rootId);
          console.log(`     [${i}]: "${rootName}"`);
        } catch (e) {
          console.log(`     [${i}]: Model (unable to get name)`);
        }
      }
    }
    return foundModels;
  }

  console.log('\n❌ Could not find clear way to access villa model');
  console.log('Will need to examine document structure more carefully');
}

/**
 * Once villa model is found, extract its DbIds and properties
 */
export async function extractVillaModelData(villaModel) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🏗️  EXTRACTING VILLA MODEL DATA');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!villaModel) {
    console.error('❌ No villa model provided');
    return;
  }

  try {
    const tree = villaModel.getInstanceTree();
    const allDbIds = [];
    tree.enumNodeChildren(tree.getRootId(), (dbId) => {
      allDbIds.push(dbId);
    }, true);

    console.log(`✅ Villa model DbIds found: ${allDbIds.length}`);

    // Sample some villa elements
    const sampleSize = Math.min(20, allDbIds.length);
    console.log(`\n📊 Sampling first ${sampleSize} villa elements:\n`);

    for (let i = 0; i < sampleSize; i++) {
      const dbId = allDbIds[i];
      const props = {};

      villaModel.getProperties(dbId, (result) => {
        if (result.properties) {
          result.properties.forEach((prop) => {
            props[prop.displayName] = prop.displayValue;
          });
        }
      });

      const nodeName = tree.getNodeName(dbId);
      console.log(`[${dbId}] ${nodeName}`);

      // Look for villa-specific properties
      const villaProps = ['Block', 'Plot', 'NBH', 'Villa_Type', 'Element/Block', 'Element/Plot'];
      for (const prop of villaProps) {
        if (props[prop]) {
          console.log(`  ✅ ${prop}: ${props[prop]}`);
        }
      }
    }

    return allDbIds;
  } catch (e) {
    console.error('❌ Error extracting villa data:', e.message);
  }
}

// Expose globally
window.exploreDocumentStructure = exploreDocumentStructure;
window.extractVillaModelData = extractVillaModelData;

export default {
  exploreDocumentStructure,
  extractVillaModelData,
};
