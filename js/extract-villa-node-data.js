/**
 * Extracts villa data from the specific villa reference node
 * DbId: 3 = "Al Arous Project - Familly Villas.nwc"
 */

export async function extractVillaDataFromNode() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🏗️  EXTRACTING VILLA DATA FROM NODE [3]');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!window.viewerManager || !window.viewerManager.viewer) {
    console.error('❌ Viewer not initialized');
    return;
  }

  const viewer = window.viewerManager.viewer;
  const model = viewer.model;
  const tree = model.getInstanceTree();

  // Get the villa node (DbId: 3)
  const villaNodeId = 3;
  const villaNodeName = tree.getNodeName(villaNodeId);

  console.log(`✅ Villa Node: [${villaNodeId}] ${villaNodeName}\n`);

  // Get all DbIds under the villa node
  const villaDbIds = [];
  tree.enumNodeChildren(villaNodeId, (dbId) => {
    villaDbIds.push(dbId);
  }, true); // Recursive - get all descendants

  console.log(`📊 Total villa elements: ${villaDbIds.length}\n`);

  // Sample villa elements and extract properties
  console.log('🔍 Sampling villa elements and their properties:\n');

  const villaElements = [];
  const sampleSize = Math.min(50, villaDbIds.length);

  for (let i = 0; i < sampleSize; i++) {
    const dbId = villaDbIds[i];
    const nodeName = tree.getNodeName(dbId);

    const element = {
      dbId: dbId,
      name: nodeName,
      properties: {}
    };

    // Get properties for this element
    await new Promise((resolve) => {
      model.getProperties(dbId, (result) => {
        if (result.properties) {
          result.properties.forEach((prop) => {
            element.properties[prop.displayName] = prop.displayValue;
          });
        }
        resolve();
      });
    });

    villaElements.push(element);

    // Log this element
    console.log(`[${dbId}] ${nodeName}`);

    // Look for villa-specific properties
    const relevantProps = ['Block', 'Plot', 'NBH', 'Villa_Type', 'Element/Block', 'Element/Plot', 'Name', 'Type', 'Element', 'Category'];
    const found = [];

    for (const prop of relevantProps) {
      if (element.properties[prop]) {
        found.push(`${prop}: ${element.properties[prop]}`);
      }
    }

    if (found.length > 0) {
      console.log('   ✅ PROPERTIES:');
      found.forEach(p => console.log(`     - ${p}`));
    } else {
      console.log('   ℹ️  Properties:');
      Object.entries(element.properties).slice(0, 3).forEach(([k, v]) => {
        console.log(`     - ${k}: ${v}`);
      });
    }
    console.log('');
  }

  // Summary statistics
  console.log('\n═════════════════════════════════════════════════════════════');
  console.log('📈 VILLA DATA SUMMARY\n');

  const uniqueBlocks = new Set();
  const uniquePlots = new Set();
  const uniqueNbh = new Set();
  const uniqueVillaTypes = new Set();

  // Scan all villa elements for property values
  console.log('🔍 Scanning all villa elements for property values...\n');

  for (let i = 0; i < villaDbIds.length; i++) {
    const dbId = villaDbIds[i];
    const element = {
      dbId: dbId,
      properties: {}
    };

    await new Promise((resolve) => {
      model.getProperties(dbId, (result) => {
        if (result.properties) {
          result.properties.forEach((prop) => {
            element.properties[prop.displayName] = prop.displayValue;
          });
        }
        resolve();
      });
    });

    // Check for villa properties
    const blockValue = element.properties['Block'] || element.properties['Element/Block'];
    const plotValue = element.properties['Plot'] || element.properties['Element/Plot'];
    const nbhValue = element.properties['NBH'] || element.properties['Element/NBH'];
    const typeValue = element.properties['Villa_Type'] || element.properties['Element/Villa_Type'];

    if (blockValue) uniqueBlocks.add(blockValue);
    if (plotValue) uniquePlots.add(plotValue);
    if (nbhValue) uniqueNbh.add(nbhValue);
    if (typeValue) uniqueVillaTypes.add(typeValue);

    // Log progress every 10000 elements
    if ((i + 1) % 10000 === 0) {
      console.log(`  Scanned ${i + 1}/${villaDbIds.length} elements...`);
    }
  }

  console.log('\n✅ RESULTS:\n');
  console.log(`📌 Unique Blocks: ${uniqueBlocks.size}`);
  if (uniqueBlocks.size > 0 && uniqueBlocks.size <= 50) {
    console.log(`   Values: ${Array.from(uniqueBlocks).sort().join(', ')}`);
  }

  console.log(`\n📌 Unique Neighborhoods: ${uniqueNbh.size}`);
  if (uniqueNbh.size > 0 && uniqueNbh.size <= 50) {
    console.log(`   Values: ${Array.from(uniqueNbh).sort().join(', ')}`);
  }

  console.log(`\n📌 Unique Plots: ${uniquePlots.size}`);
  if (uniquePlots.size > 0 && uniquePlots.size <= 100) {
    const plotArray = Array.from(uniquePlots).map(p => {
      // Try to sort numerically if they're numbers
      return parseInt(p) || p;
    }).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return String(a).localeCompare(String(b));
    });
    console.log(`   Values: ${plotArray.join(', ')}`);
  }

  console.log(`\n📌 Unique Villa Types: ${uniqueVillaTypes.size}`);
  if (uniqueVillaTypes.size > 0 && uniqueVillaTypes.size <= 50) {
    console.log(`   Values: ${Array.from(uniqueVillaTypes).sort().join(', ')}`);
  }

  console.log('\n═════════════════════════════════════════════════════════════\n');

  return {
    totalElements: villaDbIds.length,
    blocks: Array.from(uniqueBlocks),
    neighborhoods: Array.from(uniqueNbh),
    plots: Array.from(uniquePlots),
    villaTypes: Array.from(uniqueVillaTypes),
    villaDbIds: villaDbIds
  };
}

// Expose globally
window.extractVillaDataFromNode = extractVillaDataFromNode;

export default {
  extractVillaDataFromNode,
};
