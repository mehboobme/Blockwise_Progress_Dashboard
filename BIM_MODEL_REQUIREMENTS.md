# 📋 BIM Model Upload Requirements for Dashboard Compatibility

This document outlines the requirements for uploading BIM models that will be compatible with the Blockwise Progress Dashboard.

---

## 📁 File Location (MUST NOT CHANGE)

| Setting | Value |
|---------|-------|
| **ACC Project** | Current project |
| **Folder Path** | `Project Files > 00900 - BIM > 00900-RRE-ZZZ-ZZZ-NWD-ZB-000000` |
| **Filename** | `00900-RRE-ZZZ-ZZZ-3DM-ZB-000000.nwc` |

### ⚠️ Important Rules:
- **Do NOT rename** the file
- **Do NOT move** it to a different folder
- Only upload **new versions** of the same file
- The dashboard automatically detects the latest version

---

## 🏠 Required Element Properties

Each villa element **MUST** have these properties in the `Element` category:

| Property Name | Example Value | Required | Description |
|---------------|---------------|----------|-------------|
| `Block` | `156`, `155`, `165` | ✅ Yes | Block number (numeric only, no letters) |
| `Plot` | `1919`, `1918`, `2039` | ✅ Yes | Plot number (numeric only) |
| `Villa_Type` | `C10`, `DP2`, `VL1`, `TH1` | ✅ Yes | Villa type code |
| `NBH` | `SW02`, `SE03` | ✅ Yes | Neighborhood code |
| `Zone` | `C`, `A`, `B` | Optional | Zone letter |
| `Villa_Plot No.` | `1919` | Optional | Alternative plot field (backup) |

### Property Format in Revit:
```
Category: Element
├── Block = "156"
├── Plot = "1919"
├── Villa_Type = "C10"
├── NBH = "SW02"
└── Zone = "C"
```

---

## 🏗️ Villa Representation Families

Villa elements must use **Generic Models** category with family names following this pattern:

| Family Name | Villa Type |
|-------------|------------|
| `C10 REPRESENTATION` | C10 Villa |
| `DP2 REPRESENTATION` | DP2 Villa |
| `DP4 REPRESENTATION` | DP4 Villa |
| `VL1 REPRESENTATION` | VL1 Villa |
| `VL2 REPRESENTATION` | VL2 Villa |
| `VL4 REPRESENTATION` | VL4 Villa |
| `VL5 REPRESENTATION` | VL5 Villa |
| `TH1 REPRESENTATION` | TH1 Townhouse |
| `TH3 REPRESENTATION` | TH3 Townhouse |

**Note:** The `REPRESENTATION` suffix is required for the dashboard to identify villa elements.

---

## 📂 Model Structure Requirements

The model hierarchy should follow this structure:

```
📁 Root (NWC/NWD file)
│
└── 📁 GR.F (or level name)
     │
     ├── 📁 Floors
     │
     ├── 📁 Generic Models          ← Villa elements go here
     │    ├── 📁 C10 REPRESENTATION
     │    │    ├── C10 REPRESENTATION (Plot 1919, Block 156)
     │    │    ├── C10 REPRESENTATION (Plot 1918, Block 155)
     │    │    └── ... (152 instances)
     │    │
     │    ├── 📁 DP2 REPRESENTATION
     │    ├── 📁 VL1 REPRESENTATION
     │    └── ... (other villa types)
     │
     └── 📁 Walls
```

---

## ✅ DO's

| Action | Description |
|--------|-------------|
| ✅ Keep property names exactly as specified | Use `Block`, `Plot`, `Villa_Type`, `NBH` |
| ✅ Use numeric values | Block and Plot must be numbers only |
| ✅ Upload new versions to same location | Don't create new files |
| ✅ Maintain the hierarchy | `Generic Models > *_REPRESENTATION` |
| ✅ Include all 4 required properties | Every villa element needs all of them |
| ✅ Test before uploading | Verify properties in Revit/Navisworks |

---

## ❌ DON'Ts

| Action | Why It Breaks Dashboard |
|--------|------------------------|
| ❌ Change property names | Dashboard looks for exact names like `Block`, not `Block_Number` |
| ❌ Use text in numeric fields | `"One-Five-Six"` won't work, use `156` |
| ❌ Rename the file | Dashboard uses fixed file path to auto-detect versions |
| ❌ Upload to different folder | Same reason as above |
| ❌ Remove `REPRESENTATION` suffix | Dashboard uses this to identify villa families |
| ❌ Add prefixes to block numbers | Use `156`, not `R156` or `B156` |
| ❌ Leave properties empty | Missing properties will exclude villas from analysis |

---

## 🔍 Quick Validation Checklist

Before uploading to ACC, verify in Revit/Navisworks:

### Element Properties:
- [ ] Element category is `Generic Models`
- [ ] Family name contains `REPRESENTATION`
- [ ] `Block` property exists with **numeric** value (e.g., `156`)
- [ ] `Plot` property exists with **numeric** value (e.g., `1919`)
- [ ] `Villa_Type` property exists (e.g., `C10`, `DP2`)
- [ ] `NBH` property exists (e.g., `SW02`, `SE03`)

### File Upload:
- [ ] Uploading to correct folder: `00900-RRE-ZZZ-ZZZ-NWD-ZB-000000`
- [ ] Filename is exactly: `00900-RRE-ZZZ-ZZZ-3DM-ZB-000000.nwc`
- [ ] Uploading as new **version**, not new file

---

## 📊 Sample Property Values

Here's an example of properly configured villa element:

```
Element: C10 REPRESENTATION
├── Category: Generic Models
├── Family: C10 REPRESENTATION
├── Type: C10 REPRESENTATION
│
├── Block: 156          ✅ Numeric
├── Plot: 1919          ✅ Numeric
├── Villa_Type: C10     ✅ Code format
├── NBH: SW02           ✅ Neighborhood code
├── Zone: C             ✅ Optional
├── Villa_Plot No.: 1919  ✅ Optional backup
└── Level: GR.F
```

---

## 🆕 Adding New Villa Types

If you need to add a new villa type (e.g., `VL6`):

1. Create family with name: `VL6 REPRESENTATION`
2. Place under `Generic Models` category
3. Add all required properties (`Block`, `Plot`, `Villa_Type`, `NBH`)
4. **Contact dashboard developer** to update the system

---

## 📞 Contact

If you need to:
- Add new villa types
- Change property names or structure
- Upload to a different location
- Make any structural changes

**Please contact the dashboard developer FIRST** to ensure compatibility.

---

## 📝 Version History

| Date | Version | Changes |
|------|---------|---------|
| Nov 2025 | 1.0 | Initial requirements document |

---

*Last Updated: November 30, 2025*
