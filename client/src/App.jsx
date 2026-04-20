import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { login as apiLogin, logout as apiLogout, getMe, loadData as apiLoadData, saveData as apiSaveData, getToken, setToken } from "./api";

/* ── PRODUCT CATEGORIES ── */
const CATEGORIES = [
  { id: "dpd-reagents", name: "DPD Reagents (Chlorine)", icon: "🧪", color: "#3b82f6" },
  { id: "micro-kits", name: "Microbiology Test Kits", icon: "🦠", color: "#10b981" },
  { id: "micro-trays", name: "Microbiology Trays", icon: "🧫", color: "#8b5cf6" },
];

/* ── KIT COMPONENTS ── */
const DEF_COMPONENTS = {
  "liq-cl": {
    name: "Free Chlorine Kit - Liquid", type: "Free Chlorine", format: "Liquid", category: "dpd-reagents",
    items: [
      { id: "indicator", name: "Indicator Solution", icon: "🟡", desc: "Acidic indicator solution (5L batch → ~10 kits)" },
      { id: "buffer", name: "Buffer Solution", icon: "🔵", desc: "Phosphate buffer solution (5L batch → ~10 kits)" },
      { id: "dpd", name: "DPD Compound", icon: "🟤", desc: "DPD powder reagent mixture" },
    ]
  },
  "liq-ct": {
    name: "Total Chlorine Kit - Liquid", type: "Total Chlorine", format: "Liquid", category: "dpd-reagents",
    items: [
      { id: "indicator", name: "Indicator Solution", icon: "🟡", desc: "Acidic indicator solution" },
      { id: "buffer", name: "Buffer Solution", icon: "🔵", desc: "Phosphate buffer solution" },
      { id: "dpd", name: "DPD Compound", icon: "🟤", desc: "DPD powder reagent mixture" },
      { id: "iodide", name: "Potassium Iodide", icon: "⚪", desc: "KI solution for total chlorine" },
    ]
  },
  "pow-cl": {
    name: "Free Chlorine Kit - Powder", type: "Free Chlorine", format: "Powder", category: "dpd-reagents",
    items: [
      { id: "fc-indicator", name: "DPD Indicator", icon: "🟤", desc: "DPD Sulfate + EDTA mix (49 bottles × 3.48g)" },
      { id: "fc-buffer", name: "Buffer Powder", icon: "🔵", desc: "Phosphate buffer (49 bottles × 102g)" },
    ]
  },
  "pow-ct": {
    name: "Total Chlorine Kit - Powder", type: "Total Chlorine", format: "Powder", category: "dpd-reagents",
    items: [
      { id: "powder-reagent", name: "Powder Reagent (DPD)", icon: "🟤", desc: "DPD Sulfate + Disodium EDTA mix (52 bottles × 6.35g)" },
      { id: "buffer-powder", name: "Buffer Powder (with KI)", icon: "🔵", desc: "Phosphate buffer with Potassium Iodide (2 bottles × 158.75g)" },
    ]
  },
  "micro-pa": {
    name: "Presence/Absence Test Kit", type: "P/A Test", format: "Kit", category: "micro-kits",
    items: [
      { id: "media-prep", name: "Media Preparation", icon: "🧫", desc: "Prepare culture media" },
      { id: "kit-assembly", name: "Kit Assembly", icon: "📦", desc: "Assemble test components" },
    ]
  },
  "micro-col": {
    name: "Coliform Test Kit", type: "Coliform", format: "Kit", category: "micro-kits",
    items: [
      { id: "media-prep", name: "Media Preparation", icon: "🧫", desc: "Prepare selective media" },
      { id: "kit-assembly", name: "Kit Assembly", icon: "📦", desc: "Assemble test components" },
    ]
  },
  "micro-hpc": {
    name: "HPC Test Kit", type: "HPC", format: "Kit", category: "micro-kits",
    items: [
      { id: "media-prep", name: "Media Preparation", icon: "🧫", desc: "Prepare HPC media" },
      { id: "kit-assembly", name: "Kit Assembly", icon: "📦", desc: "Assemble test components" },
    ]
  },
  "tray-qt": {
    name: "Quanti-Tray", type: "Quanti-Tray", format: "Tray", category: "micro-trays",
    items: [
      { id: "tray-mold", name: "Tray Molding", icon: "🏭", desc: "Mold/form the trays" },
      { id: "tray-qc", name: "Tray Inspection", icon: "🔍", desc: "Quality check trays" },
      { id: "tray-pack", name: "Tray Packaging", icon: "📦", desc: "Seal and package trays" },
    ]
  },
  "tray-2k": {
    name: "Quanti-Tray/2000", type: "Quanti-Tray/2000", format: "Tray", category: "micro-trays",
    items: [
      { id: "tray-mold", name: "Tray Molding", icon: "🏭", desc: "Mold/form the trays" },
      { id: "tray-qc", name: "Tray Inspection", icon: "🔍", desc: "Quality check trays" },
      { id: "tray-pack", name: "Tray Packaging", icon: "📦", desc: "Seal and package trays" },
    ]
  },
};

const KIT_PROCESSES = [
  { id: "bottling", name: "Bottling / Assembly", icon: "🧴", desc: "Fill and assemble final kit" },
  { id: "qc-verification", name: "QC Verification (DR 3900)", icon: "🔬", desc: "Reagent performance test with chlorine standard" },
  { id: "label-print", name: "Label Printing", icon: "🖨️", desc: "Print product labels", hasLabelPdf: true },
  { id: "labeling", name: "Labeling", icon: "🏷️", desc: "Apply labels to containers" },
  { id: "packaging", name: "Packaging", icon: "📦", desc: "Package final product" },
];

const BRANDS = ["Ultra", "AWS", "Policontrol"];

const DEF_PRODUCTS = [];
for (const [compKey, comp] of Object.entries(DEF_COMPONENTS)) {
  if (comp.category === "dpd-reagents") {
    for (const brand of BRANDS) {
      DEF_PRODUCTS.push({
        id: `${compKey}-${brand.toLowerCase()}`, name: comp.name, brand,
        format: comp.format, type: comp.type, category: comp.category,
        emoji: comp.format === "Liquid" ? "🧪" : "⚗️", componentKey: compKey,
      });
    }
  } else {
    // Microbiology products - single brand for now (Policontrol)
    DEF_PRODUCTS.push({
      id: `${compKey}-pol`, name: comp.name, brand: "Policontrol",
      format: comp.format, type: comp.type, category: comp.category,
      emoji: comp.category === "micro-kits" ? "🦠" : "🧫", componentKey: compKey,
    });
  }
}

/* ── EQUIPMENT LOCATION GUIDE ── */
const DEF_EQUIPMENT = [
  { id: "eq-1", name: "Semi-Analytical Balance", location: "Main Blue Bench", shelf: "", icon: "⚖️", notes: "Accuracy ±0.01g, capacity 5000g. Calibrate before each use." },
  { id: "eq-2", name: "Beaker (various sizes)", location: "Materials Cabinet 1", shelf: "Shelf 2", icon: "🧪", notes: "Glass beakers: 500mL, 1L, 2L" },
  { id: "eq-3", name: "Erlenmeyer Flask", location: "Materials Cabinet 1", shelf: "Shelf 2", icon: "🧪", notes: "" },
  { id: "eq-4", name: "Volumetric Balloon (100mL / 1000mL)", location: "Materials Cabinet 1", shelf: "Shelf 3", icon: "🧪", notes: "" },
  { id: "eq-5", name: "5L Pre-Graduated Pitcher/Jar", location: "Materials Cabinet 1", shelf: "Shelf 4", icon: "🫙", notes: "Used for Indicator and Buffer solutions" },
  { id: "eq-6", name: "Spatula", location: "Materials Cabinet 1", shelf: "Shelf 1", icon: "🥄", notes: "" },
  { id: "eq-7", name: "Glass/Plastic Rod", location: "Materials Cabinet 1", shelf: "Shelf 1", icon: "🪄", notes: "" },
  { id: "eq-8", name: "pH Meter", location: "Main Blue Bench", shelf: "", icon: "📊", notes: "Buffer solutions 4, 7, 10 for calibration" },
  { id: "eq-9", name: "Magnetic Stirrer (heated)", location: "Main Blue Bench", shelf: "", icon: "🔄", notes: "Set to ~101°F for buffer preparation" },
  { id: "eq-10", name: "Wash Bottle", location: "Main Blue Bench", shelf: "", icon: "💧", notes: "Fill with DI water" },
  { id: "eq-11", name: "Funnel", location: "Materials Cabinet 1", shelf: "Shelf 2", icon: "🔽", notes: "For bottling" },
  { id: "eq-12", name: "DI Water Supply", location: "Materials Shelf 2", shelf: "", icon: "💧", notes: "Deionized water" },
  { id: "eq-13", name: "Oven", location: "Main Blue Bench Area", shelf: "", icon: "🌡️", notes: "Keep at 90-95°F for overnight storage" },
  { id: "eq-14", name: "PPE (Gloves, Glasses, Mask, Apron)", location: "Personal Safety Materials Shelf", shelf: "Main Blue Bench", icon: "🧤", notes: "ALWAYS wear before handling chemicals" },
  { id: "eq-15", name: "Ceramic Spheres", location: "Materials Cabinet 1", shelf: "Shelf 1", icon: "⚪", notes: "For DPD mixing (min 3 per batch)" },
  { id: "eq-16", name: "PVC Film", location: "Materials Cabinet 1", shelf: "Shelf 5", icon: "📦", notes: "Cover jars for storage" },
  { id: "eq-17", name: "Zebra Label Printer", location: "Printing Station PC", shelf: "", icon: "🖨️", notes: "PC Password: Policontrol515" },
];

/* ── PRE-LOADED INSTRUCTIONS (per component) ── */
const PRE_INSTR = {
  "indicator": [
    { title:"1. Materials & Equipment Needed", description:"Gather ALL items below before starting:\n\nEQUIPMENT:\n⚖️ Semi-Analytical Balance → Main Blue Bench\n🧪 Erlenmeyer Flask → Materials Cabinet 1 / Shelf 2\n🫙 5L Pre-Graduated Pitcher → Materials Cabinet 1 / Shelf 4\n💧 Wash Bottle → Main Blue Bench\n📦 PVC Film → Materials Cabinet 1 / Shelf 5\n\nRAW MATERIALS:\n💧 DI Water → Materials Shelf 2\n🧪 Sulfuric Acid (Analytical Grade) — 40 mL\n\nPPE:\n🧤 Gloves, Glasses, Mask, Apron → Personal Safety Shelf (Main Blue Bench)", warning:"PUT ON ALL PPE BEFORE touching any chemicals!", notes:"All glassware must be pre-washed with neutral detergent, rinsed with DI water, and dried.", observations:"", images:[] },
    { title:"2. Add 3L DI Water", description:"Add approximately 3 liters of DI water to the 5L pre-graduated pitcher.\n\n📍 Pitcher: Materials Cabinet 1 / Shelf 4\n📍 DI Water: Materials Shelf 2", warning:"", notes:"", observations:"", images:[] },
    { title:"3. Measure 40mL Sulfuric Acid", description:"Slowly add 40 mL of Analytical Grade Sulfuric Acid to an Erlenmeyer flask.\n\n📍 Erlenmeyer: Materials Cabinet 1 / Shelf 2\n📍 Sulfuric Acid: Chemical Storage Cabinet", warning:"Handle sulfuric acid with EXTREME care!\nAlways add acid TO water, never water to acid!", notes:"", observations:"", images:[] },
    { title:"4. Mix Acid into Water", description:"Slowly pour the 40mL acid from the Erlenmeyer into the pitcher containing DI water.\n\nUse the wash bottle (📍 Main Blue Bench) to rinse remaining acid from the Erlenmeyer — ensure 100% is transferred.", warning:"Pour very slowly to avoid splashing. Solution will generate heat.", notes:"", observations:"", images:[] },
    { title:"5. Complete to 5L", description:"Add DI water until reaching the 5-liter graduation mark.\n\nMark the jar clearly: \"INDICATOR SOLUTION\"", warning:"", notes:"", observations:"", images:[] },
    { title:"6. Storage", description:"Cover the jar with PVC film (📍 Materials Cabinet 1 / Shelf 5).\n\nIf storing overnight, place in oven at 90°F.\n📍 Oven: Main Blue Bench Area", warning:"Overnight storage MUST be at 90°F.", notes:"", observations:"", images:[] },
  ],
  "buffer": [
    { title:"1. Materials & Equipment Needed", description:"Gather ALL items below before starting:\n\nEQUIPMENT:\n⚖️ Semi-Analytical Balance → Main Blue Bench\n🧪 Beakers (1L and 2L) → Materials Cabinet 1 / Shelf 2\n🫙 5L Pre-Graduated Pitcher → Materials Cabinet 1 / Shelf 4\n🔄 Heated Magnetic Stirrer → Main Blue Bench\n💧 Wash Bottle → Main Blue Bench\n📦 PVC Film → Materials Cabinet 1 / Shelf 5\n\nRAW MATERIALS:\n💧 DI Water (warm, ~95°F) → Materials Shelf 2 + Oven\n🧪 KH2PO4 (Potassium Monobasic Phosphate) — 500g\n🧪 Na2HPO4 (Disodium Bibasic Phosphate) — 500g\n🧪 Disodium EDTA — 12g\n\nPPE:\n🧤 Gloves, Glasses, Mask, Apron → Personal Safety Shelf (Main Blue Bench)", warning:"PUT ON ALL PPE BEFORE starting!", notes:"Salts crystallize below 20°C — always use WARM DI water (~95°F / 35°C).", observations:"", images:[] },
    { title:"2. Prepare Warm DI Water", description:"Ensure a 5L jar of DI water is in the oven at ~95°F (35°C).\n\n📍 Oven: Main Blue Bench Area\n📍 DI Water: Materials Shelf 2", warning:"Check oven temperature before starting.", notes:"", observations:"", images:[] },
    { title:"3. Dissolve 500g KH2PO4", description:"In a 1L beaker (📍 Cabinet 1 / Shelf 2), add ~600mL warm DI water.\nPlace on heated magnetic stirrer (📍 Main Blue Bench) set to ~101°F.\n\nWeigh 500g of KH2PO4 on the balance (📍 Main Blue Bench).\nSlowly add to the water. Wait for full dissolution before adding more.", warning:"", notes:"If dissolution is difficult, transfer to a larger beaker and add ~500mL more DI water.", observations:"", images:[] },
    { title:"4. Dissolve 500g Na2HPO4", description:"In a separate 1L beaker (📍 Cabinet 1 / Shelf 2), add ~800mL warm DI water on stirrer at 101°F.\n\nWeigh 500g Na2HPO4 on the balance (📍 Main Blue Bench).\nSlowly add. Wait for dissolution between additions.", warning:"", notes:"Same technique as KH2PO4 — patience is key.", observations:"", images:[] },
    { title:"5. Dissolve 12g EDTA", description:"Weigh 12g of Disodium EDTA on the balance (📍 Main Blue Bench).\nDissolve in 500mL DI water on the magnetic stirrer.\n\nUse wash bottle (📍 Main Blue Bench) to ensure all 12g are transferred.", warning:"", notes:"", observations:"", images:[] },
    { title:"6. Combine & Complete to 5L", description:"Transfer ALL solutions into the 5L jar (📍 Cabinet 1 / Shelf 4).\nMark jar: \"BUFFER SOLUTION\"\n\nAdd DI water to reach 5L mark.\nUse wash bottle to clean all remaining crystals from beakers.", warning:"If storing overnight → oven at 95°F.", notes:"", observations:"", images:[] },
    { title:"7. Cover & Store", description:"Cover with PVC film (📍 Cabinet 1 / Shelf 5) to protect from dust.\nStore in oven (📍 Main Blue Bench Area) at 95°F if not using immediately.", warning:"", notes:"", observations:"", images:[] },
  ],
  "dpd": [
    { title:"1. Materials & Equipment Needed", description:"Gather ALL items below before starting:\n\nEQUIPMENT:\n⚖️ Semi-Analytical Balance → Main Blue Bench\n🥄 Spatula → Materials Cabinet 1 / Shelf 1\n⚪ Ceramic Spheres (min 3) → Materials Cabinet 1 / Shelf 1\n📦 Plastic Mixing Container with lid\n\nRAW MATERIALS:\n🧪 Disodium EDTA — 3.789g\n🧪 DPD Sulfate — 56.76g\n🧪 Boric Acid — 179.456g\n\nPPE:\n🧤 Gloves, Glasses, Mask, Apron → Personal Safety Shelf (Main Blue Bench)", warning:"DPD is LIGHT-SENSITIVE — minimize exposure to light during entire process!", notes:"Calibrate balance before weighing.", observations:"", images:[] },
    { title:"2. Weigh Disodium EDTA", description:"In a clean plastic mixing container, weigh exactly 3.789g of Disodium EDTA.\n\n📍 Balance: Main Blue Bench\n📍 Spatula: Materials Cabinet 1 / Shelf 1", warning:"", notes:"", observations:"", images:[] },
    { title:"3. Weigh DPD Sulfate", description:"Weigh exactly 56.76g of DPD Sulfate.\nAdd to the same mixing container.\n\n📍 Balance: Main Blue Bench", warning:"DPD is light-sensitive — work quickly.", notes:"", observations:"", images:[] },
    { title:"4. Weigh Boric Acid", description:"Weigh exactly 179.456g of Boric Acid.\nAdd to the same container.\n\n📍 Balance: Main Blue Bench", warning:"", notes:"", observations:"", images:[] },
    { title:"5. Mix Thoroughly", description:"Add at least 3 ceramic spheres (📍 Cabinet 1 / Shelf 1) to the container.\nClose the lid tightly.\nShake vigorously for at least 5 minutes.", warning:"", notes:"Ensure thorough mixing for uniform reagent.", observations:"", images:[] },
    { title:"6. Store", description:"Store the sealed container in a closed cabinet PROTECTED FROM SUNLIGHT.\n\nLabel container with batch number and date.", warning:"DPD degrades rapidly in direct sunlight!", notes:"", observations:"", images:[] },
  ],
  "bottling": [
    { title:"1. Materials & Equipment Needed", description:"Gather ALL items below before starting:\n\nEQUIPMENT:\n⚖️ Semi-Analytical Balance → Main Blue Bench\n🧪 Pre-graduated Glass Beaker (473mL mark) → Materials Cabinet 1 / Shelf 2\n🔽 Funnel → Materials Cabinet 1 / Shelf 2\n📊 pH Meter → Main Blue Bench (for verification if needed)\n\nMATERIALS:\n🧴 Bottles (16oz) — 3 per kit\n🫙 Indicator Solution (produced)\n🫙 Buffer Solution (produced)\n🟤 DPD Compound (produced)\n📦 Dark Ziplock Bags\n🏷️ Labels (printed)\n\nPPE:\n🧤 Gloves, Glasses → Personal Safety Shelf (Main Blue Bench)", warning:"CONFIRM QC APPROVAL before starting!", notes:"Use clean beaker for each solution to avoid cross-contamination.", observations:"", images:[] },
    { title:"2. Measure 473mL Solutions", description:"Transfer each solution from the 5L jar to a pre-graduated glass beaker at exactly 473 mL.\n\n📍 Beaker: Materials Cabinet 1 / Shelf 2\n\nUse a clean beaker for Indicator, then a clean beaker for Buffer.", warning:"", notes:"", observations:"", images:[] },
    { title:"3. Fill Bottles", description:"Transfer from beaker to bottle using a funnel.\n\n📍 Funnel: Materials Cabinet 1 / Shelf 2\n📍 Bottles: Packaging Materials Storage", warning:"", notes:"", observations:"", images:[] },
    { title:"4. Cap & Segregate", description:"Cap all bottles tightly.\n\n⚠️ CRITICAL: Segregate Buffer from Indicator before labeling!\nThey look IDENTICAL in color.\n\nIf in doubt, measure pH with the pH Meter (📍 Main Blue Bench):\n• Buffer ≈ 6.45 pH\n• Indicator ≈ 1.5-2.5 pH", warning:"KEEP BUFFER AND INDICATOR PHYSICALLY SEPARATED!", notes:"", observations:"", images:[] },
    { title:"5. DPD Powder Bottle", description:"Weigh exactly 24g of DPD powder mixture on the balance (📍 Main Blue Bench).\nTransfer into a bottle using a funnel (📍 Cabinet 1 / Shelf 2).\nCap tightly.", warning:"Store away from sunlight — DPD is light-sensitive.", notes:"", observations:"", images:[] },
    { title:"6. Kit Assembly", description:"Place 3 labeled bottles (2 solutions + 1 powder) into a dark ziplock bag.\nLabel the bag with lot number and date.\n\nPlace finished kit in designated finished goods area.", warning:"", notes:"", observations:"", images:[] },
  ],

  /* ───── POWDER TOTAL CHLORINE INDICATOR (pow-ct components) ───── */
  "powder-reagent": [
    { title:"1. Materials & Equipment Needed", description:"INDICATOR — Powder Reagent for Total Chlorine Analyzer\n\nEQUIPMENT:\n⚖️ Analytical Balance → Main Blue Bench\n🌀 V-Shape Mill → Main Blue Bench\n🥛 Beaker → Materials Cabinet 1 / Shelf 2\n🥄 Spatula → Materials Cabinet 1 / Shelf 2\n📋 FORM PQ 001 → Office Cabinet\n\nRAW MATERIALS (per batch):\n🟤 DPD Sulfate P.A — 1,423 g\n🧪 Disodium EDTA P.A — 83 g\n\nPPE:\n🧤 Rubber Gloves, 🥽 Safety Glasses, 🥼 Lab Apron, 🥾 Safety Boots\n📍 PPE: Personal Safety Shelf (Main Blue Bench)", warning:"PUT ON ALL PPE BEFORE handling chemicals!\nSalts must be ANHYDROUS — replace if wet/hygroscopic.", notes:"", observations:"", images:[] },
    { title:"2. Weigh DPD Sulfate (1,423 g)", description:"On the analytical balance, weigh exactly 1,423 g of DPD Sulfate P.A.\n\n📍 Balance: Main Blue Bench\n📍 DPD Sulfate: Chemical Storage Cabinet\n\nUse a clean, tared beaker. Reserve in a covered container.", warning:"DPD is hygroscopic and light-sensitive — avoid prolonged air/light exposure.", notes:"", observations:"", images:[] },
    { title:"3. Weigh Disodium EDTA (83 g)", description:"On the same balance, weigh exactly 83 g of Disodium EDTA P.A.\n\nUse a SEPARATE clean, tared beaker. Reserve covered.", warning:"Use a different beaker than DPD to prevent cross-contamination.", notes:"", observations:"", images:[] },
    { title:"4. Mill in V-Shape Mill", description:"Transfer both weighed salts to the V-Shape Mill.\n\n📍 V-Shape Mill: Main Blue Bench\n\n1. Add salts to the mill chamber\n2. Close the mill securely\n3. Press the RED button on the back to turn on\n4. Set rotation control (\"rotação\") to 1 HOUR\n5. Press START (\"Iniciar\")\n6. Let run for 1 hour\n7. After milling, transfer blended powder to a clean container", warning:"Confirm mill is CLEAN and DRY before adding salts.\nVerify lid is properly sealed before starting.", notes:"Total mixture: 1,506 g", observations:"", images:[] },
    { title:"5. Bottle — 5.8 g per bottle", description:"Fill each bottle with the indicator powder.\n\n📏 WEIGHT SPECIFICATION:\n• Nominal weight: 5.8 g\n• Tolerance: ±2%\n• ✅ Minimum: 5.684 g\n• ✅ Maximum: 5.916 g\n• 👉 Acceptable range: 5.684 g – 5.916 g\n\nWeigh each bottle on the analytical balance.\nReject any bottle outside the acceptable range.\n\nCap tightly and label.", warning:"EVERY bottle must be within 5.684 – 5.916 g — verify on balance!", notes:"Expected yield: ~260 bottles (1,506g / 5.8g).", observations:"", images:[] },
    { title:"6. Document & Forward to QC", description:"Fill out FORM PQ 001:\n• Lot number\n• Quantity produced\n• Operator name\n• Date\n• Raw material lot numbers\n\nForward to Quality Control.", warning:"", notes:"", observations:"", images:[] },
  ],

  "buffer-powder": [
    { title:"1. Materials & Equipment Needed", description:"BUFFER POWDER (with KI) for Total Chlorine Analyzer\n\nThis buffer INCLUDES Potassium Iodide — no separate KI needed.\n\nEQUIPMENT:\n⚖️ Analytical Balance → Main Blue Bench\n🌀 V-Shape Mill → Main Blue Bench\n🥛 Beaker → Materials Cabinet 1 / Shelf 2\n🥄 Spatula → Materials Cabinet 1 / Shelf 2\n📋 FORM PQ 001 → Office Cabinet\n\nRAW MATERIALS (per batch):\n🧪 Na2HPO4 (Anhydrous Sodium Phosphate P.A) — 1,572.33 g\n🧪 KH2PO4 (Monopotassium Phosphate P.A) — 3,144.65 g\n🧪 Disodium EDTA P.A — 70.75 g\n🧪 KI (Potassium Iodide P.A) — 204.4 g\n\nPPE:\n🧤 Rubber Gloves, 🥽 Safety Glasses, 🥼 Lab Apron, 🥾 Safety Boots", warning:"PUT ON ALL PPE BEFORE handling chemicals!\nAll salts must be ANHYDROUS. KI must NOT be yellow/brown (oxidized).", notes:"Total batch: 4,992.13 g", observations:"", images:[] },
    { title:"2. Weigh Na2HPO4 (1,572.33 g)", description:"Weigh exactly 1,572.33 g of Anhydrous Sodium Phosphate P.A.\n\nUse a clean, tared beaker. Reserve covered.", warning:"", notes:"", observations:"", images:[] },
    { title:"3. Weigh KH2PO4 (3,144.65 g)", description:"Weigh exactly 3,144.65 g of Monopotassium Phosphate P.A.\n\nUse a SEPARATE clean, tared beaker. Reserve covered.", warning:"Largest single ingredient (~63% of batch).", notes:"", observations:"", images:[] },
    { title:"4. Weigh Disodium EDTA (70.75 g)", description:"Weigh exactly 70.75 g of Disodium EDTA P.A.\n\nClean, tared beaker. Reserve covered.", warning:"", notes:"", observations:"", images:[] },
    { title:"5. Weigh Potassium Iodide (204.4 g)", description:"Weigh exactly 204.4 g of Potassium Iodide P.A (KI).\n\nWORK QUICKLY — KI absorbs moisture from air.\nReserve in a tightly covered container.\n\n📍 KI: Chemical Storage Cabinet (light-protected area)", warning:"KI is hygroscopic AND light-sensitive — minimize exposure!\nDISCARD if yellow/brown (oxidized).", notes:"", observations:"", images:[] },
    { title:"6. Mill in V-Shape Mill (1 hour)", description:"Transfer ALL four weighed salts to the V-Shape Mill.\n\n📍 V-Shape Mill: Main Blue Bench\n\n1. Add salts ONE BY ONE to the mill chamber\n2. Close the mill securely\n3. Press the RED button on the back to turn on\n4. Set rotation control (\"rotação\") to 1 HOUR\n5. Press START (\"Iniciar\")\n6. Let run for the full hour\n7. After milling, transfer blended powder to a clean container\n\nVerify homogeneity — uniform color, no visible streaks.", warning:"Confirm mill is CLEAN and DRY. Verify lid sealed before starting.", notes:"Total mixture: ~4,992 g", observations:"", images:[] },
    { title:"7. Bottle — 141 g per bottle", description:"Fill each bottle with the buffer powder.\n\n📏 WEIGHT SPECIFICATION:\n• Nominal weight: 141 g\n• Tolerance: ±2%\n• ✅ Minimum: 138.18 g\n• ✅ Maximum: 143.82 g\n• 👉 Acceptable range: 138.18 g – 143.82 g\n\nWeigh each bottle on the analytical balance.\nReject any bottle outside the acceptable range.\n\nCap tightly and label.", warning:"EVERY bottle must be within 138.18 – 143.82 g!", notes:"Expected yield: ~35 bottles (4,992g / 141g).", observations:"", images:[] },
    { title:"8. Document & Forward to QC", description:"Fill out FORM PQ 001:\n• Lot number\n• Quantity produced (g and number of bottles)\n• Operator name, Date\n• All 4 raw material lot numbers\n\nForward to QC.", warning:"All 4 raw material lots MUST be documented.", notes:"", observations:"", images:[] },
  ],

  "qc-verification": [
    { title:"1. Buffer Verification — Dissolve", description:"QC PROCEDURE — Buffer Verification\n\na) Weigh 31.8 g of the Buffer into a beaker\nb) Add 50 mL ultrapure water\nc) Stir until completely dissolved\nd) Transfer the solution to a 100 mL volumetric flask\ne) Fill to the mark with ultrapure water\nf) Mix until fully homogeneous", warning:"Use ultrapure water only (Type I or equivalent).", notes:"This prepares the buffer solution for the chlorine verification test.", observations:"", images:[] },
    { title:"2. Indicator Verification — Dissolve", description:"QC PROCEDURE — Indicator Verification\n\na) Weigh 1.27 g of the Indicator into a beaker\nb) Add 50 mL ultrapure water\nc) Transfer to a 100 mL volumetric flask\nd) Fill to the mark with ultrapure water\ne) Mix until fully homogeneous", warning:"Handle DPD solution carefully — it stains.", notes:"", observations:"", images:[] },
    { title:"3. Instrument Setup (DR 3900)", description:"QC PROCEDURE — Instrument Preparation\n\na) Power on the DR 3900 instrument\nb) Allow startup diagnostics to complete\nc) Select stored program 080 — Chlorine F & T PP\nd) Prepare blank: 10 mL DI water in a clean cuvette\ne) Press ZERO\nf) Confirm reading = 0.00 mg/L", warning:"Do NOT proceed if ZERO calibration fails.", notes:"Program 080 = Chlorine Free & Total PP", observations:"", images:[] },
    { title:"4. Prepare Chlorine Standard (1.00 mg/L)", description:"QC PROCEDURE — Standard Preparation\n\na) Pipette 1 mL of 1000 mg/L chlorine standard into a 1000 mL volumetric flask\nb) Fill to the mark with DI water\nc) Mix briefly and cap immediately\n\nFinal concentration: 1.00 mg/L", warning:"⚡ PERFORM QUICKLY — the chlorine standard is HIGHLY UNSTABLE!\nCap immediately after mixing.", notes:"1 mL of 1000 mg/L in 1000 mL = 1.00 mg/L", observations:"", images:[] },
    { title:"5. Reference Check (Hach Powder Pillow)", description:"QC PROCEDURE — Verification with Powder Pillow\n\na) Prepare 3 clean cuvettes, add one Hach powder pillow in each\n\nBLANK TEST:\nb) Add 10 mL DI water to one cuvette\nc) Mix for 20 seconds, read using program 080\n👉 Acceptable result: 0.00 – 0.04 mg/L\n\nSTANDARD TEST:\nd) Add 10 mL of 1.00 mg/L standard to the other two cuvettes\ne) Mix for 20 seconds, read\nf) Record results and calculate the average\n\nThis average = TRUE VALUE of the standard", warning:"Clean cuvettes thoroughly before use.", notes:"The Hach powder pillow serves as the reference — your reagents must match this performance.", observations:"", images:[] },
    { title:"6. Reagent Performance Test", description:"QC PROCEDURE — Test Your Produced Reagents\n\na) Select curve 082 — Free & Total Chlorine (RL) on DR 3900\nb) Zero using a cuvette with DI water (Type I)\n\nPREPARATION:\nc) Add 2 drops of YOUR BUFFER into 6 cuvettes, set aside\n\nBLANK READING:\nd) In 1 cuvette, add 2 drops of YOUR INDICATOR\ne) Add 7.8 mL of 0.00 mg/L standard (Type I water)\nf) Cap, mix thoroughly\ng) Clean cuvette exterior, read IMMEDIATELY\nh) Record result\ni) Measure and record pH of the 0.00 mg/L reaction\n\nSTANDARD READINGS:\nj) Add 2 drops of YOUR INDICATOR to the remaining 5 cuvettes\nk) Add 7.8 mL of the prepared 1.00 mg/L chlorine standard\n\n⚡ PERFORM QUICKLY to avoid chlorine loss!\n\nl) Cap, mix, clean, and read each cuvette\nm) Record all results", warning:"⚡ SPEED IS CRITICAL — chlorine degrades rapidly in solution.\nRead within 60 seconds of adding the standard.", notes:"Compare your reagent results against the Hach powder pillow average from Step 5.\nResults should be within ±10% of the reference value.", observations:"Curve 082 = Free & Total Chlorine (RL)\nThis is different from program 080 used for the powder pillow check.", images:[] },
  ],

  /* ───── FREE CHLORINE POWDER (pow-cl components) ───── */
  "fc-buffer": [
    { title:"1. Materials & Equipment Needed", description:"BUFFER for Free Chlorine Powder Kit — CL-17 Online Analyzers\n\nEQUIPMENT:\n⚖️ Semi-Analytical Balance (±0.01g, 5000g capacity) → Main Blue Bench\n🌀 V-Shape Mill → Main Blue Bench\n🥛 5-quart container\n🥄 Spatula → Materials Cabinet 1 / Shelf 2\n📋 Production Log → Office Cabinet\n\nRAW MATERIALS (for 49 kits):\n🧪 Na2HPO4 (Anhydrous Sodium Phosphate PA ACS) — 980.4 g\n🧪 KH2PO4 (Monopotassium Phosphate PA ACS) — 3,921.6 g\n🧪 Disodium EDTA PA ACS — 98 g\n\nPPE:\n🧤 Thin Rubber Gloves, 🥽 Safety Glasses, 🥼 Lab Apron, 🥾 Safety Footwear", warning:"PUT ON ALL PPE! Salts must be ANHYDROUS.", notes:"Produces 49 bottles × 102 g. Expiration: 60 months.", observations:"", images:[] },
    { title:"2. Weigh Na2HPO4 (980.4 g)", description:"In the 5-quart container, weigh exactly 980.4 g of Anhydrous Sodium Phosphate PA ACS.\n\nTare the container first.", warning:"", notes:"", observations:"", images:[] },
    { title:"3. Weigh KH2PO4 (3,921.6 g)", description:"In the SAME container, add 3,921.6 g of Monopotassium Phosphate PA ACS.", warning:"Largest ingredient — verify scale capacity.", notes:"", observations:"", images:[] },
    { title:"4. Weigh Disodium EDTA (98 g)", description:"Weigh 98 g of Disodium EDTA PA ACS. Reserve separately.", warning:"", notes:"", observations:"", images:[] },
    { title:"5. V-Shape Mill — 1 Hour", description:"Transfer ALL salts to the V-Shape Mill.\n\n1. Close the Mill\n2. Press RED button on the back\n3. Set rotation (\"rotação\") to 1 hour\n4. Press START (\"Iniciar\")\n5. Run for full hour\n6. Transfer blended powder to clean container", warning:"Mill must be CLEAN and DRY. Verify lid sealed.", notes:"Total: ~5,000 g → 49 bottles × 102 g", observations:"", images:[] },
    { title:"6. Document", description:"Fill out Production Log with all materials, lots, operator, date.\nForward to QC.", warning:"", notes:"", observations:"", images:[] },
  ],

  "fc-indicator": [
    { title:"1. Materials & Equipment Needed", description:"DPD INDICATOR for Free Chlorine Powder Kit\n\nEQUIPMENT:\n⚖️ Balance (±0.01g) → Main Blue Bench\n🥛 Plastic container with cap\n⚪ Ceramic spheres (min 3)\n\nRAW MATERIALS (for 49 kits):\n🟤 DPD Sulfate — 161.8 g\n🧪 Disodium EDTA — 8.82 g\n\nPPE: Gloves, Glasses, Apron, Safety Footwear", warning:"PUT ON ALL PPE!", notes:"Produces 49 bottles × 3.48 g. Expiration: 60 months.", observations:"", images:[] },
    { title:"2. Weigh DPD Sulfate (161.8 g)", description:"Weigh 161.8 g of DPD Sulfate in a plastic container with cap.", warning:"DPD is light-sensitive — keep covered.", notes:"", observations:"", images:[] },
    { title:"3. Add EDTA (8.82 g)", description:"Add 8.82 g of Disodium EDTA (analytical grade) to the SAME container.", warning:"", notes:"", observations:"", images:[] },
    { title:"4. Add Spheres & Shake (5 min)", description:"Add at least 3 ceramic spheres.\nCap the container.\nShake vigorously for at least 5 MINUTES.\n\nVerify uniform mixture.", warning:"Cap must be secure before shaking!", notes:"Total: 170.62 g → 49 bottles × 3.48 g", observations:"", images:[] },
    { title:"5. Document", description:"Fill out Production Log. Forward to QC.", warning:"", notes:"", observations:"", images:[] },
  ],

  "fc-bottling": [
    { title:"1. QC Approval Required", description:"Confirm QC has APPROVED this lot before bottling.", warning:"⛔ DO NOT BOTTLE without QC approval!", notes:"", observations:"", images:[] },
    { title:"2. Buffer Bottling (102 g)", description:"Using funnel in 500 mL flask:\na) Weigh 102 g of buffer powder\nb) Transfer to bottle, cap tightly\nc) Label (expiration: 60 months)\nd) Place in Dark Ziplock Bag", warning:"Verify weight: 102 g per bottle.", notes:"49 bottles total.", observations:"", images:[] },
    { title:"3. DPD Indicator Bottling (3.48 g)", description:"Using funnel in 500 mL flask:\na) Weigh 3.48 g of DPD indicator powder\nb) Transfer to bottle, cap tightly\nc) Label (expiration: 60 months)\nd) Place in Dark Ziplock Bag", warning:"DPD is light-sensitive.", notes:"49 bottles total.", observations:"", images:[] },
    { title:"4. Label Printing (Zebra)", description:"Start PC connected to Zebra Printer (password: Policontrol515)\n\n1. Open File Explorer\n2. Open the Word file for the desired label\n3. Edit LOT, EXP fields\n4. File → Print → Zdesigner (Zebra thermos printer)\n5. Choose quantity → PRINT\n\nApply labels to bottles.", warning:"Verify correct label orientation.", notes:"Or use app Label Printing (🖨️) for Epson CW-C4000.", observations:"", images:[] },
    { title:"5. Kit Assembly", description:"Assemble each kit:\n• 1 Buffer bottle (102 g) in dark ziplock\n• 1 DPD Indicator bottle (3.48 g) in dark ziplock\n\nPlace in finished goods area.\nComplete FORM PQ 001.", warning:"", notes:"Store cool, dry, light-protected.", observations:"", images:[] },
  ],

};

/* ── RAW MATERIALS & BOM ── */
const DEF_RAW = [
  { id:"rm-001", code:"RM-001", name:"Sulfuric Acid (Analytical Grade)", unit:"mL", minStock:200, vendor:"Sigma", entries:[] },
  { id:"rm-002", code:"RM-002", name:"DPD Sulfate P.A", unit:"g", minStock:1500, vendor:"Sigma", entries:[] },
  { id:"rm-003", code:"RM-003", name:"Boric Acid", unit:"g", minStock:1000, vendor:"Sigma/Synth", entries:[] },
  { id:"rm-004", code:"RM-004", name:"Disodium EDTA P.A", unit:"g", minStock:500, vendor:"Sigma/Synth/Cromato/Neon", entries:[] },
  { id:"rm-005", code:"RM-005", name:"KH2PO4 (Monopotassium Phosphate P.A ACS)", unit:"g", minStock:5000, vendor:"Sigma/Synth/Cromato/Neon", entries:[] },
  { id:"rm-006", code:"RM-006", name:"Na2HPO4 (Anhydrous Sodium Phosphate P.A ACS)", unit:"g", minStock:3000, vendor:"Sigma/Synth/Cromato", entries:[] },
  { id:"rm-007", code:"RM-007", name:"Bottles 500mL (16oz)", unit:"pcs", minStock:200, vendor:"", entries:[] },
  { id:"rm-008", code:"RM-008", name:"Dark Ziplock Bag", unit:"pcs", minStock:100, vendor:"", entries:[] },
  { id:"rm-009", code:"RM-009", name:"Labels (Printed)", unit:"pcs", minStock:200, vendor:"", entries:[] },
  { id:"rm-010", code:"RM-010", name:"DI Water (Type I Ultrapure)", unit:"mL", minStock:50000, vendor:"", entries:[] },
  { id:"rm-011", code:"RM-011", name:"Ceramic Spheres", unit:"pcs", minStock:20, vendor:"", entries:[] },
  { id:"rm-012", code:"RM-012", name:"PVC Film Roll", unit:"pcs", minStock:10, vendor:"", entries:[] },
  { id:"rm-013", code:"RM-013", name:"Potassium Iodide P.A (KI)", unit:"g", minStock:500, vendor:"Synth", entries:[] },
  { id:"rm-014", code:"RM-014", name:"Hach Powder Pillows (Free Chlorine DPD 10mL)", unit:"pcs", minStock:50, vendor:"Hach", entries:[] },
  { id:"rm-015", code:"RM-015", name:"Chlorine Standard 1000 mg/L (ISOGUIDE)", unit:"mL", minStock:500, vendor:"ISOGUIDE", entries:[] },
  { id:"rm-016", code:"RM-016", name:"pH Buffer Solution 4.0", unit:"mL", minStock:500, vendor:"", entries:[] },
  { id:"rm-017", code:"RM-017", name:"pH Buffer Solution 7.0", unit:"mL", minStock:500, vendor:"", entries:[] },
  { id:"rm-018", code:"RM-018", name:"pH Buffer Solution 10.0", unit:"mL", minStock:500, vendor:"", entries:[] },
  { id:"rm-019", code:"RM-019", name:"Dropper Bottles (60mL)", unit:"pcs", minStock:100, vendor:"", entries:[] },
  { id:"rm-020", code:"RM-020", name:"Plastic Container with Cap (for DPD mixing)", unit:"pcs", minStock:20, vendor:"", entries:[] },
];

const DEF_QC = {
  "liq-cl-ultra":[{id:"ph-ind",name:"Indicator pH",min:1.5,max:2.5,unit:"pH",type:"range"},{id:"ph-buf",name:"Buffer pH",min:6.2,max:6.7,unit:"pH",type:"range"},{id:"vis",name:"Visual Inspection",type:"visual",expected:"Clear/Slight yellow"}],
};

const LIQ_CL_BOM = [
  // Based on IT: 5L batch = ~10 kits (5000mL ÷ 473mL)
  // Indicator: 40mL H2SO4 per 5L batch → 4.0mL/kit
  {rawMaterialId:"rm-001",qtyPerUnit:4.0, component:"Indicator Solution"},
  // DPD Compound: 56.76g per batch of 10 → 5.676g/kit  
  {rawMaterialId:"rm-002",qtyPerUnit:5.676, component:"DPD Compound"},
  // Boric Acid: 179.456g per batch → 17.946g/kit
  {rawMaterialId:"rm-003",qtyPerUnit:17.946, component:"DPD Compound"},
  // EDTA: 3.789g (DPD) + 12g (Buffer) = 15.789g per batch → 1.579g/kit
  {rawMaterialId:"rm-004",qtyPerUnit:1.579, component:"DPD + Buffer"},
  // KH2PO4: 500g per 5L buffer batch → 50g/kit
  {rawMaterialId:"rm-005",qtyPerUnit:50.0, component:"Buffer Solution"},
  // Na2HPO4: 500g per 5L buffer batch → 50g/kit
  {rawMaterialId:"rm-006",qtyPerUnit:50.0, component:"Buffer Solution"},
  // Bottles: 3 per kit (Indicator + Buffer + DPD)
  {rawMaterialId:"rm-007",qtyPerUnit:3, component:"Bottling"},
  // Ziplock bag: 1 per kit
  {rawMaterialId:"rm-008",qtyPerUnit:1, component:"Packaging"},
  // Labels: 3 per kit
  {rawMaterialId:"rm-009",qtyPerUnit:3, component:"Labeling"},
  // DI Water: ~5L indicator + ~5L buffer = 10L per batch → 1000mL/kit
  {rawMaterialId:"rm-010",qtyPerUnit:1000, component:"Indicator + Buffer"},
];

const DEF_BOM = {
  "liq-cl-ultra": LIQ_CL_BOM,
  "liq-cl-aws": LIQ_CL_BOM,
  "liq-cl-pol": LIQ_CL_BOM,
  // ── POWDER TOTAL CHLORINE BOM ──
  // Per IT_PQ_324 (Reagent): 312g DPD + 36.4g EDTA → 52 bottles × 6.35g = 348.4g total
  //   Per kit (1 reagent bottle of 6.35g): DPD = 312/52 = 6.0g, EDTA = 36.4/52 = 0.7g
  // Per IT_PQ_325 (Buffer): 2,600g Na2HPO4 + 5,200g KH2PO4 + 117g EDTA + 338g KI → 2 bottles × 158.75g = 317.5g
  //   Wait: total weight is 8,255g but only 317.5g is bottled? The IT says 2 bottles × 158.75g per BATCH.
  //   So scaling: per kit (1 buffer bottle) = 158.75g out of 4,127.5g/bottle of mixed salt.
  //   Per kit: Na2HPO4 = 50.0g, KH2PO4 = 100.0g, EDTA = 2.25g, KI = 6.5g (proportional to 158.75g final)
  // Plus packaging
  "pow-ct-ultra": [
    // Reagent bottle ingredients (6.35g final = ~6.0g DPD + ~0.35g EDTA per kit)
    {rawMaterialId:"rm-002", qtyPerUnit:6.0,  component:"Powder Reagent (DPD)"},
    {rawMaterialId:"rm-004", qtyPerUnit:0.7,  component:"Reagent + Buffer (EDTA)"},
    // Buffer bottle ingredients (158.75g final per kit)
    {rawMaterialId:"rm-006", qtyPerUnit:50.0,  component:"Buffer Powder (Na2HPO4)"},
    {rawMaterialId:"rm-005", qtyPerUnit:100.0, component:"Buffer Powder (KH2PO4)"},
    {rawMaterialId:"rm-013", qtyPerUnit:6.5,   component:"Buffer Powder (KI)"},
    // Packaging
    {rawMaterialId:"rm-007", qtyPerUnit:2,     component:"Bottling (1 reagent + 1 buffer)"},
    {rawMaterialId:"rm-008", qtyPerUnit:1,     component:"Packaging (ziplock)"},
    {rawMaterialId:"rm-009", qtyPerUnit:2,     component:"Labeling"},
  ],
};
// Auto-sync to AWS and Policontrol
DEF_BOM["pow-ct-aws"] = DEF_BOM["pow-ct-ultra"];
DEF_BOM["pow-ct-pol"] = DEF_BOM["pow-ct-ultra"];

// ── FREE CHLORINE POWDER BOM (per kit out of 49-kit batch) ──
// Buffer: 980.4g Na2HPO4 + 3921.6g KH2PO4 + 98g EDTA → 49 bottles × 102g
// Indicator: 161.8g DPD + 8.82g EDTA → 49 bottles × 3.48g
DEF_BOM["pow-cl-ultra"] = [
  {rawMaterialId:"rm-002", qtyPerUnit:3.3,   component:"DPD Indicator (161.8g/49)"},
  {rawMaterialId:"rm-004", qtyPerUnit:2.18,  component:"Indicator + Buffer (EDTA)"},
  {rawMaterialId:"rm-006", qtyPerUnit:20.0,  component:"Buffer (Na2HPO4 980.4g/49)"},
  {rawMaterialId:"rm-005", qtyPerUnit:80.0,  component:"Buffer (KH2PO4 3921.6g/49)"},
  {rawMaterialId:"rm-007", qtyPerUnit:2,     component:"Bottling (1 buffer + 1 indicator)"},
  {rawMaterialId:"rm-008", qtyPerUnit:1,     component:"Packaging (ziplock)"},
  {rawMaterialId:"rm-009", qtyPerUnit:2,     component:"Labeling"},
];
DEF_BOM["pow-cl-aws"] = DEF_BOM["pow-cl-ultra"];
DEF_BOM["pow-cl-pol"] = DEF_BOM["pow-cl-ultra"];

/* ── STORAGE (API) ── */
async function loadAll() { try { const d = await apiLoadData(); return d && Object.keys(d).length > 1 ? d : null; } catch { return null; } }
async function saveAll(data) { try { await apiSaveData(data); } catch(e) { console.error("Save:",e); } }

/* Helper: get componentKey from product (handles old products without it) */
function getCompKey(p) {
  if (p.componentKey && DEF_COMPONENTS[p.componentKey]) return p.componentKey;
  // Derive from ID: "liq-cl-ultra" → try "liq-cl", "liq-ct", "pow-cl", "pow-ct"
  for (const key of Object.keys(DEF_COMPONENTS)) {
    if (p.id?.startsWith(key)) return key;
  }
  // Fallback: match by format+type
  for (const [key, comp] of Object.entries(DEF_COMPONENTS)) {
    if (comp.format === p.format && comp.type === p.type) return key;
  }
  return Object.keys(DEF_COMPONENTS)[0];
}

/* Get sibling product IDs that share same formulation (same componentKey, different brand) */
function getSiblings(productId, allProducts) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) return [];
  const ck = getCompKey(p);
  return allProducts.filter(x => x.id !== productId && getCompKey(x) === ck).map(x => x.id);
}

/* ── THEME (Light) ── */
const K = {
  bg:"#f0f4f8", cd:"#ffffff", hv:"#f1f5f9", inp:"#ffffff",
  pri:"#0057a8", prD:"#004080", prL:"#3b82f6", acc:"#00a5b5",
  tx:"#1e293b", txM:"#64748b", txD:"#94a3b8", bd:"#e2e8f0",
  ok:"#16a34a", wr:"#d97706", er:"#dc2626", wh:"#ffffff",
};
const FN = "'Segoe UI',system-ui,sans-serif";

/* ── Policontrol Logo ── */
function PolicontrolLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:"#0057a8"}} />
          <stop offset="100%" style={{stopColor:"#00a5b5"}} />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="24" fill="url(#pcGrad)" />
      {/* Stylized "P" flask icon */}
      <path d="M45 28 L45 52 L35 72 Q30 82 35 90 Q40 98 50 98 L70 98 Q80 98 85 90 Q90 82 85 72 L75 52 L75 28 Z" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round"/>
      <path d="M40 28 L80 28" stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
      {/* Liquid level */}
      <path d="M38 75 Q50 68 60 75 Q70 82 82 75 L85 72 Q90 82 85 90 Q80 98 70 98 L50 98 Q40 98 35 90 Q30 82 35 72 Z" fill="rgba(255,255,255,0.35)"/>
      {/* Bubbles */}
      <circle cx="55" cy="80" r="3" fill="rgba(255,255,255,0.5)"/>
      <circle cx="65" cy="85" r="2" fill="rgba(255,255,255,0.4)"/>
      <circle cx="58" cy="70" r="2" fill="rgba(255,255,255,0.3)"/>
    </svg>
  );
}
const si_ = { background:K.inp, border:`1px solid ${K.bd}`, borderRadius:8, padding:"10px 14px", color:K.tx, fontSize:14, fontFamily:FN, outline:"none" };
const ss_ = { background:K.inp, border:`1px solid ${K.bd}`, borderRadius:8, padding:"8px 12px", color:K.tx, fontSize:13, fontFamily:FN, outline:"none", cursor:"pointer" };
const sl_ = { display:"block", fontSize:11, fontWeight:600, color:K.txM, marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 };
const sb_ = { background:K.pri, color:"#ffffff", border:"none", borderRadius:8, padding:"9px 18px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:FN };
const so_ = { background:"transparent", color:K.txM, border:`1px solid ${K.bd}`, borderRadius:8, padding:"8px 16px", fontSize:13, cursor:"pointer", fontFamily:FN };
const sn_ = { background:K.cd, color:K.tx, border:`1px solid ${K.bd}`, borderRadius:10, padding:"12px 24px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:FN, boxShadow:"0 1px 3px rgba(0,0,0,0.08)" };
const sbk_ = { background:"transparent", color:K.txM, border:"none", padding:"4px 0", fontSize:13, cursor:"pointer", fontFamily:FN };
const sm_ = { background:"transparent", border:`1px solid ${K.bd}`, borderRadius:6, color:K.txM, width:28, height:28, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, padding:0 };

/* ── SHARED UI ── */
function PW({ title, sub, children }) {
  return (<div style={{ padding:"28px 24px", maxWidth:1100 }}>{title && <div style={{ marginBottom:22 }}><h1 style={{ fontSize:22, fontWeight:700, color:K.tx, margin:0 }}>{title}</h1>{sub && <p style={{ fontSize:14, color:K.txM, margin:"6px 0" }}>{sub}</p>}</div>}{children}</div>);
}
function Crd({ children, onClick, row, highlight }) {
  return (<div onClick={onClick} style={{ background:K.cd, borderRadius:12, padding:18, cursor:onClick?"pointer":"default", border:`1px solid ${highlight||K.bd}`, transition:"all .2s", display:"flex", flexDirection:row?"row":"column", gap:row?16:0, alignItems:row?"center":"stretch", marginBottom:10, boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}
    onMouseEnter={e => { if(onClick) { e.currentTarget.style.borderColor = K.pri; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,87,168,0.12)"; } }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = highlight||K.bd; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}>{children}</div>);
}
function Tg({ children, c, bg }) { return <span style={{ padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:600, color:c, background:bg, whiteSpace:"nowrap" }}>{children}</span>; }
function Ab({ children, type="warn", icon }) {
  const cc = { warn:{bg:"#fef3c7",bdr:"#f59e0b",txt:"#92400e"}, err:{bg:"#fef2f2",bdr:"#dc2626",txt:"#991b1b"}, info:{bg:"#eff6ff",bdr:"#3b82f6",txt:"#1e40af"} }[type]||{bg:"#fef3c7",bdr:"#f59e0b",txt:"#92400e"};
  return (<div style={{ padding:"12px 16px", borderRadius:10, background:cc.bg, border:`1px solid ${cc.bdr}`, display:"flex", gap:10, alignItems:"flex-start", fontSize:13, color:cc.txt, lineHeight:1.5, marginBottom:8 }}>{icon && <span style={{ fontSize:16, flexShrink:0 }}>{icon}</span>}<div>{children}</div></div>);
}

/* ── PHOTO with Drag & Drop + Camera + Clipboard Paste ── */
function PhotoBox({ images=[], onChange, canEdit=true }) {
  const ref = useRef();
  const [dragging, setDragging] = useState(false);
  const pasteAreaRef = useRef();

  const processFiles = (files) => {
    Array.from(files).forEach(f => {
      if (!f.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          const MAX = 900;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) { if (w > h) { h = h*MAX/w; w = MAX; } else { w = w*MAX/h; h = MAX; } }
          c.width = w; c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          onChange([...(images||[]), c.toDataURL("image/jpeg", 0.75)]);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(f);
    });
  };

  const onDrop = (e) => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files); };
  const onFileChange = (e) => { processFiles(e.target.files); e.target.value = ""; };

  // Clipboard paste handler
  const onPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      processFiles(imageFiles);
    }
  };

  return (
    <div>
      {/* Photo display */}
      {(images||[]).length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:10 }}>
          {images.map((img, i) => (
            <div key={i} style={{ position:"relative", borderRadius:10, overflow:"hidden", border:`1px solid ${K.bd}`, background:K.hv }}>
              <img src={img} alt="" style={{ width:"100%", display:"block", maxHeight:300, objectFit:"contain" }} />
              {canEdit && <button onClick={() => onChange(images.filter((_,j) => j!==i))} style={{ position:"absolute", top:8, right:8, width:28, height:28, borderRadius:14, background:"rgba(0,0,0,0.7)", color:K.tx, border:"none", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>}
            </div>
          ))}
        </div>
      )}
      {/* Upload area */}
      {canEdit && (
        <div
          tabIndex={0}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onPaste={onPaste}
          onClick={() => ref.current?.click()}
          style={{
            border:`2px dashed ${dragging ? K.pri : K.bd}`,
            borderRadius:12, padding:"20px 16px", textAlign:"center", cursor:"pointer",
            background: dragging ? K.pri+"15" : "transparent",
            transition:"all .2s", outline:"none",
          }}>
          <div style={{ fontSize:28, marginBottom:6 }}>📷</div>
          <div style={{ fontSize:13, color:K.txM, fontWeight:600 }}>Tap to take photo or upload</div>
          <div style={{ fontSize:11, color:K.txD, marginTop:4 }}>drag & drop · or click here to paste from clipboard (Ctrl+V)</div>
          <input ref={ref} type="file" accept="image/*" capture="environment" onChange={onFileChange} style={{ display:"none" }} multiple />
        </div>
      )}
    </div>
  );
}

/* ══════════ MAIN APP ══════════ */
export default function App() {
  const [as, setAs] = useState(getToken() ? "checking" : "login");
  const [user, setUser] = useState(null);
  const [lf, setLf] = useState({ username: "", password: "" });
  const [le, setLe] = useState("");
  useEffect(() => { if (as==="checking") getMe().then(r=>{setUser(r.user);setAs("ok")}).catch(()=>{setToken("");setAs("login")}); }, [as]);
  const doLogin = async () => { setLe(""); try { const u = await apiLogin(lf.username, lf.password); setUser(u); setAs("ok"); } catch(e) { setLe(e.message||"Invalid credentials"); } };
  const doLogout = async () => { await apiLogout(); setUser(null); setAs("login"); };
  if (as==="login") return (<div style={{minHeight:"100vh",background:K.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{background:K.cd,borderRadius:16,padding:40,width:360,boxShadow:"0 4px 24px rgba(0,0,0,0.08)",border:`1px solid ${K.bd}`}}><div style={{textAlign:"center",marginBottom:28}}><PolicontrolLogo size={56}/><h1 style={{fontSize:22,fontWeight:700,color:K.pri,margin:"12px 0 4px"}}>POLICONTROL USA</h1><p style={{fontSize:13,color:K.txM,margin:0}}>Manufacturing ERP</p></div>{le&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#991b1b",marginBottom:12}}>{le}</div>}<div style={{marginBottom:12}}><label style={sl_}>Username</label><input value={lf.username} onChange={e=>setLf({...lf,username:e.target.value})} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={{...si_,width:"100%",boxSizing:"border-box"}} autoFocus/></div><div style={{marginBottom:20}}><label style={sl_}>Password</label><input type="password" value={lf.password} onChange={e=>setLf({...lf,password:e.target.value})} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={{...si_,width:"100%",boxSizing:"border-box"}}/></div><button onClick={doLogin} style={{...sb_,width:"100%",padding:"12px",fontSize:15}}>Sign In</button></div></div>);
  if (as==="checking"||!user) return (<div style={{minHeight:"100vh",background:K.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><PolicontrolLogo size={64}/></div>);
  return <MainApp user={user} onLogout={doLogout}/>;
}
function MainApp({ user, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [S, setS] = useState({});
  const [nav, setNav] = useState({ v:"dashboard", prod:null, comp:null, proc:null, si:0, edit:false, sub:null });
  const [sidebar, setSidebar] = useState(false);
  const [fB, setFB] = useState("all"); const [fF, setFF] = useState("all");

  useEffect(() => {
    (async () => {
      let s = await loadAll();
      if (!s) {
        // First load — set defaults
        s = { products:DEF_PRODUCTS, instructions:{}, labelPdfs:{}, audit:[], rawMaterials:DEF_RAW, bom:DEF_BOM, lots:[], qcSpecs:{...DEF_QC}, qcResults:{}, equipment:DEF_EQUIPMENT };
      }

      // Migrations
      if (s.products?.length > 0 && (!s.products[0].componentKey || !s.products[0].category)) s.products = DEF_PRODUCTS;
      if (!(s.rawMaterials||[]).some(r => r.id === "rm-001")) s.rawMaterials = DEF_RAW;
      if (!s.bom?.["liq-cl-ultra"]?.length || !s.bom["liq-cl-ultra"][0]?.rawMaterialId?.startsWith("rm-00")) s.bom = DEF_BOM;
      // Add pow-ct BOM if missing (for users who already had data before pow-ct BOM existed)
      if (!s.bom["pow-ct-ultra"]?.length) {
        s.bom["pow-ct-ultra"] = DEF_BOM["pow-ct-ultra"];
        s.bom["pow-ct-aws"] = DEF_BOM["pow-ct-aws"];
        s.bom["pow-ct-pol"] = DEF_BOM["pow-ct-pol"];
      }
      // Add KI raw material if missing
      if (!(s.rawMaterials||[]).find(r => r.id === "rm-013")) {
        s.rawMaterials = [...s.rawMaterials, { id:"rm-013", code:"RM-013", name:"Potassium Iodide P.A (KI)", unit:"g", minStock:500, vendor:"Synth", entries:[] }];
      }
      // Add QC consumables and other missing materials
      const newMats = [
        { id:"rm-014", code:"RM-014", name:"Hach Powder Pillows (Free Chlorine DPD 10mL)", unit:"pcs", minStock:50, vendor:"Hach", entries:[] },
        { id:"rm-015", code:"RM-015", name:"Chlorine Standard 1000 mg/L (ISOGUIDE)", unit:"mL", minStock:500, vendor:"ISOGUIDE", entries:[] },
        { id:"rm-016", code:"RM-016", name:"pH Buffer Solution 4.0", unit:"mL", minStock:500, vendor:"", entries:[] },
        { id:"rm-017", code:"RM-017", name:"pH Buffer Solution 7.0", unit:"mL", minStock:500, vendor:"", entries:[] },
        { id:"rm-018", code:"RM-018", name:"pH Buffer Solution 10.0", unit:"mL", minStock:500, vendor:"", entries:[] },
        { id:"rm-019", code:"RM-019", name:"Dropper Bottles (60mL)", unit:"pcs", minStock:100, vendor:"", entries:[] },
        { id:"rm-020", code:"RM-020", name:"Plastic Container with Cap (for DPD mixing)", unit:"pcs", minStock:20, vendor:"", entries:[] },
      ];
      for (const nm of newMats) {
        if (!(s.rawMaterials||[]).find(r => r.id === nm.id)) s.rawMaterials = [...s.rawMaterials, nm];
      }
      // Update vendor info on existing materials if blank
      const vendorMap = {"rm-001":"Sigma","rm-002":"Sigma","rm-003":"Sigma/Synth","rm-004":"Sigma/Synth/Cromato/Neon","rm-005":"Sigma/Synth/Cromato/Neon","rm-006":"Sigma/Synth/Cromato"};
      s.rawMaterials = s.rawMaterials.map(r => (vendorMap[r.id] && !r.vendor) ? {...r, vendor:vendorMap[r.id]} : r);
      // Add pow-cl BOM if missing
      if (!s.bom["pow-cl-ultra"]?.length) {
        s.bom["pow-cl-ultra"] = DEF_BOM["pow-cl-ultra"];
        s.bom["pow-cl-aws"] = DEF_BOM["pow-cl-aws"];
        s.bom["pow-cl-pol"] = DEF_BOM["pow-cl-pol"];
      }
      if (!s.equipment?.length) s.equipment = DEF_EQUIPMENT;

      // Pre-load instructions for both liq-cl and pow-ct kits across all brands
      const liqClComps = ["indicator","buffer","dpd","bottling"];
      const powCtComps = ["powder-reagent","buffer-powder"];
      const powCtProcs = ["qc-verification"];

      // MIGRATION: remove old iodide-tab instructions (no longer used in pow-ct kit)
      // and force-refresh powder buffer if it doesn't have new IT_PQ_325 recipe
      for (const brand of BRANDS) {
        const brandLow = brand.toLowerCase();
        const pidPow = "pow-ct-" + brandLow;
        // Force-refresh powder-reagent if old quantities (312g vs new 1,423g)
      const reagKey = pidPow + "__powder-reagent";
      const reagContent = JSON.stringify(s.instructions[reagKey] || "");
      if (reagContent.includes("312") && !reagContent.includes("1,423")) {
        s.instructions[reagKey] = PRE_INSTR["powder-reagent"];
      }
      // Remove orphan iodide-tab
        const iodideKey = pidPow + "__iodide-tab";
        if (s.instructions[iodideKey]) delete s.instructions[iodideKey];
        // Force-refresh buffer-powder if it doesn't include the IT_PQ_325 recipe (mentions "5,200 g" or "Na2HPO4 (Anhydrous")
        const bufKey = pidPow + "__buffer-powder";
        const bufContent = JSON.stringify(s.instructions[bufKey] || "");
        if (!bufContent.includes("1,572.33")) {
          s.instructions[bufKey] = PRE_INSTR["buffer-powder"];
        }
      }

      for (const brand of BRANDS) {
        const brandLow = brand.toLowerCase();
        // Liquid Free Chlorine
        const pidLiq = "liq-cl-" + brandLow;
        for (const compId of liqClComps) {
          if (!PRE_INSTR[compId]) continue;
          const key = pidLiq + "__" + compId;
          if (!s.instructions[key]?.length || !s.instructions[key][0]?.title?.includes("Materials")) s.instructions[key] = PRE_INSTR[compId];
        }
        // Powder Total Chlorine
        const pidPow = "pow-ct-" + brandLow;
        for (const compId of powCtComps) {
          if (!PRE_INSTR[compId]) continue;
          const key = pidPow + "__" + compId;
          if (!s.instructions[key]?.length || !s.instructions[key][0]?.title?.includes("Materials")) s.instructions[key] = PRE_INSTR[compId];
        }
        // QC Verification for pow-ct
        for (const procId of powCtProcs) {
          if (!PRE_INSTR[procId]) continue;
          const key = pidPow + "__" + procId;
          if (!s.instructions[key]?.length) s.instructions[key] = PRE_INSTR[procId];
        }
        // Free Chlorine Powder
        const pidFcPow = "pow-cl-" + brandLow;
        for (const compId of ["fc-buffer","fc-indicator"]) {
          if (!PRE_INSTR[compId]) continue;
          const key = pidFcPow + "__" + compId;
          if (!s.instructions[key]?.length) s.instructions[key] = PRE_INSTR[compId];
        }
        // FC bottling process (stored under standard 'bottling' key)
        const fcBottleKey = pidFcPow + "__bottling";
        if (!s.instructions[fcBottleKey]?.length && PRE_INSTR["fc-bottling"]) s.instructions[fcBottleKey] = PRE_INSTR["fc-bottling"];
      }
      if (!s.qcSpecs["liq-cl-aws"] && s.qcSpecs["liq-cl-ultra"]) { s.qcSpecs["liq-cl-aws"] = s.qcSpecs["liq-cl-ultra"]; s.qcSpecs["liq-cl-pol"] = s.qcSpecs["liq-cl-ultra"]; }

      await saveAll(s);
      setS(s); setLoading(false);
    })();
  }, []);

  // Save a single field (writes entire state to single key)
  const sv = useCallback(async (field, val) => {
    setS(prev => {
      const next = { ...prev, [field]: val };
      saveAll(next); // fire-and-forget
      return next;
    });
  }, []);
  const aLog = useCallback(async (a, d) => { const e = { user:user.name, action:a, details:d, ts:new Date().toISOString() }; await sv("audit", [e,...(S.audit||[])].slice(0,500)); }, [S.audit, sv]);
  const go = useCallback((v, x={}) => setNav(p => ({...p, v, edit:false, sub:null, ...x})), []);

  const getStock = (rmId) => { const rm = (S.rawMaterials||[]).find(x=>x.id===rmId); return rm ? (rm.entries||[]).reduce((s,e)=>s+(e.remaining||0),0) : 0; };
  const getSteps = (prodId, compOrProc) => S.instructions?.[prodId+"__"+compOrProc] || [];

  const alerts = useMemo(() => {
    const a = [];
    (S.rawMaterials||[]).forEach(rm => {
      const t = (rm.entries||[]).reduce((s,e)=>s+(e.remaining||0),0);
      if (t <= (rm.minStock||0)) a.push({rm,total:t});
      (rm.entries||[]).forEach(e => { if(e.expirationDate && e.remaining>0) { const d=Math.ceil((new Date(e.expirationDate)-new Date())/86400000); if(d<=30) a.push({rm,entry:e,type:d<=0?"expired":"expiring",days:d}); }});
    }); return a;
  }, [S.rawMaterials]);
  const pendQc = (S.lots||[]).filter(l=>l.status==="pending_qc").length;

  if (loading) return (<div style={{minHeight:"100vh",background:K.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}><PolicontrolLogo size={64} /><div style={{fontSize:14,color:K.txM}}>Loading...</div><style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05);opacity:.7}}`}</style></div>);

  const menu = [
    {id:"dashboard",icon:"📋",label:"Products"},
    {id:"equipment",icon:"🗺️",label:"Equipment Map"},
    {id:"rawmaterials",icon:"🧱",label:"Raw Materials",badge:alerts.length},
    {id:"production",icon:"🏭",label:"Production"},
    {id:"qc",icon:"🔬",label:"Quality Control",badge:pendQc},
    {id:"reports",icon:"📊",label:"Reports"},
    {id:"audit",icon:"📝",label:"History"},
    {id:"settings",icon:"⚙️",label:"Settings"},
  ];

  return (
    <div style={{minHeight:"100vh",background:K.bg,color:K.tx,fontFamily:FN,display:"flex"}}>
      {/* Sidebar */}
      <div style={{width:sidebar?250:56,minHeight:"100vh",background:K.wh,borderRight:`1px solid ${K.bd}`,transition:"width .3s",overflow:"hidden",display:"flex",flexDirection:"column",flexShrink:0,zIndex:10,boxShadow:"2px 0 8px rgba(0,0,0,0.04)"}}>
        <div style={{padding:"14px 10px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setSidebar(!sidebar)}>
          <PolicontrolLogo size={36} />
          {sidebar&&<div><div style={{fontSize:14,fontWeight:700,color:K.pri}}>POLICONTROL</div><div style={{fontSize:10,color:K.txM,letterSpacing:1,fontWeight:600}}>USA</div></div>}
        </div>
        <div style={{flex:1,padding:"6px 4px",display:"flex",flexDirection:"column",gap:1}}>
          {menu.map(m=>(<div key={m.id} onClick={()=>go(m.id,{prod:null,comp:null,proc:null})} style={{padding:"9px 12px",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:nav.v===m.id?K.hv:"transparent",color:nav.v===m.id?K.prL:K.txM,position:"relative"}}>
            <span style={{fontSize:17,flexShrink:0}}>{m.icon}</span>{sidebar&&<span style={{fontSize:13}}>{m.label}</span>}
            {m.badge>0&&<span style={{position:"absolute",top:4,right:sidebar?8:4,minWidth:18,height:18,borderRadius:9,background:K.er,color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{m.badge>9?"9+":m.badge}</span>}
          </div>))}
        </div>
        <div style={{padding:10,borderTop:`1px solid ${K.bd}`,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={onLogout} title="Logout">
          <span style={{fontSize:17,flexShrink:0}}>👤</span>{sidebar&&<><span style={{fontSize:12,color:K.txM,flex:1}}>{user.name}</span><span style={{fontSize:10,color:K.txD}}>↪</span></>}
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,overflow:"auto",minHeight:"100vh"}}>
        {nav.v==="dashboard" && !nav.prod && <DashView S={S} fB={fB} fF={fF} setFB={setFB} setFF={setFF} go={go}/>}
        {nav.v==="product" && nav.prod && !nav.comp && !nav.proc && <ProductView p={nav.prod} S={S} sv={sv} addLog={aLog} getStock={getStock} getSteps={getSteps} go={go} onBack={()=>go("dashboard",{prod:null})}/>}
        {nav.v==="slides" && nav.prod && (nav.comp||nav.proc) && <SlidesView p={nav.prod} compId={nav.comp} procId={nav.proc} steps={getSteps(nav.prod.id, nav.comp||nav.proc)} si={nav.si} setSi={i=>setNav(x=>({...x,si:i}))} edit={nav.edit} setEdit={v=>setNav(x=>({...x,edit:v}))} S={S} sv={sv} aLog={aLog} onBack={()=>go("product",{comp:null,proc:null})} />}
        {nav.v==="equipment" && <EquipmentView S={S} sv={sv} aLog={aLog}/>}
        {nav.v==="rawmaterials" && <RawMView S={S} sv={sv} aLog={aLog} alerts={alerts} sub={nav.sub} setSub={s=>setNav(x=>({...x,sub:s}))}/>}
        {nav.v==="production" && <ProdView S={S} sv={sv} aLog={aLog} getStock={getStock} sub={nav.sub} setSub={s=>setNav(x=>({...x,sub:s}))}/>}
        {nav.v==="qc" && <QCView S={S} sv={sv} aLog={aLog} sub={nav.sub} setSub={s=>setNav(x=>({...x,sub:s}))} user={user}/>}
        {nav.v==="reports" && <ReportsView S={S}/>}
        {nav.v==="audit" && <AuditView log={S.audit}/>}
        {nav.v==="settings" && <SettingsView S={S} sv={sv} aLog={aLog}/>}
      </div>
    </div>
  );
}

/* ── Dashboard ── */
function DashView({ S, fB, fF, setFB, setFF, go }) {
  const brands = [...new Set(S.products.map(p=>p.brand))];
  const allCats = [...CATEGORIES, ...(S.customCategories||[])];
  const [activeCat, setActiveCat] = useState("all");

  const filtered = S.products.filter(p => {
    if (fB !== "all" && p.brand !== fB) return false;
    if (activeCat !== "all" && (p.category||"dpd-reagents") !== activeCat) return false;
    return true;
  });

  // Group by category then brand
  const grouped = {};
  filtered.forEach(p => {
    const catId = p.category || "dpd-reagents";
    const cat = allCats.find(c => c.id === catId) || { id:"other", name:"Other", icon:"📦", color:"#94a3b8" };
    if (!grouped[cat.id]) grouped[cat.id] = { cat, byBrand:{} };
    if (!grouped[cat.id].byBrand[p.brand]) grouped[cat.id].byBrand[p.brand] = [];
    grouped[cat.id].byBrand[p.brand].push(p);
  });

  return (
    <PW title="Products" sub="Select a product to view components and manufacturing instructions">
      {/* Category tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <button onClick={() => setActiveCat("all")} style={{ ...so_, background:activeCat==="all"?K.hv:"transparent", color:activeCat==="all"?K.prL:K.txM, borderColor:activeCat==="all"?K.pri:K.bd, fontSize:13, padding:"8px 16px" }}>All</button>
        {allCats.map(cat => {
          const count = S.products.filter(p => (p.category||"dpd-reagents") === cat.id && (fB === "all" || p.brand === fB)).length;
          if (count === 0) return null;
          return (
            <button key={cat.id} onClick={() => setActiveCat(cat.id)}
              style={{ ...so_, background:activeCat===cat.id?cat.color+"20":"transparent", color:activeCat===cat.id?cat.color:K.txM, borderColor:activeCat===cat.id?cat.color:K.bd, fontSize:13, padding:"8px 16px" }}>
              {cat.icon} {cat.name} ({count})
            </button>
          );
        })}
      </div>
      {/* Brand filter */}
      <div style={{ display:"flex", gap:6, marginBottom:24, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:12, color:K.txD, marginRight:4 }}>Brand:</span>
        <button onClick={() => setFB("all")} style={{ ...so_, padding:"4px 12px", fontSize:12, background:fB==="all"?K.hv:"transparent", color:fB==="all"?K.wh:K.txM, borderColor:fB==="all"?K.pri:K.bd }}>All</button>
        {brands.map(b => (
          <button key={b} onClick={() => setFB(b)} style={{ ...so_, padding:"4px 12px", fontSize:12, background:fB===b?K.hv:"transparent", color:fB===b?K.wh:K.txM, borderColor:fB===b?K.pri:K.bd }}>{b}</button>
        ))}
      </div>

      {/* Grouped products */}
      {Object.values(grouped).map(({ cat, byBrand }) => (
        <div key={cat.id} style={{ marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${K.bd}` }}>
            <span style={{ fontSize:22 }}>{cat.icon}</span>
            <span style={{ fontSize:16, fontWeight:700, color:cat.color }}>{cat.name}</span>
          </div>
          {Object.entries(byBrand).map(([brand, prods]) => (
            <div key={brand} style={{ marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:600, color:K.txM, marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:8, height:8, borderRadius:4, background:cat.color }} /> {brand}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:10 }}>
                {prods.map(p => {
                  const comp = DEF_COMPONENTS[getCompKey(p)];
                  return (
                    <Crd key={p.id} onClick={() => go("product", { prod: p })}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <span style={{ fontSize:26 }}>{p.emoji}</span>
                        <div>
                          <div style={{ fontSize:14, fontWeight:600, color:K.tx }}>{p.name}</div>
                          <div style={{ fontSize:11, color:K.txM }}>{p.brand} • {p.format}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
                        <Tg c={cat.color} bg={cat.color+"20"}>{p.type}</Tg>
                        {comp && <Tg c="#6d28d9" bg="#f3e8ff">{comp.items.length} parts</Tg>}
                      </div>
                    </Crd>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
      {Object.keys(grouped).length === 0 && <div style={{ textAlign:"center", padding:50, color:K.txD }}>No products match your filters</div>}
    </PW>
  );
}

/* ── Batch Calculator ── */
function BatchCalc({ bom, rawMaterials, getStock, product }) {
  const [open, setOpen] = useState(false);
  const [kits, setKits] = useState(10);

  return (
    <div style={{background:K.cd,borderRadius:14,border:`1px solid ${K.pri}33`,margin:"0 0 24px",overflow:"hidden"}}>
      <div onClick={()=>setOpen(!open)} style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",background:K.hv}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>🧮</span>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:K.tx}}>Batch Calculator</div>
            <div style={{fontSize:12,color:K.txM}}>Scale recipe up or down — see how much raw material you need</div>
          </div>
        </div>
        <span style={{color:K.txD,fontSize:14}}>{open?"▲":"▼"}</span>
      </div>
      {open && (
        <div style={{padding:20,borderTop:`1px solid ${K.bd}`}}>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:20}}>
            <label style={{fontSize:14,fontWeight:600,color:K.tx,whiteSpace:"nowrap"}}>How many kits?</label>
            <input type="number" min="1" value={kits} onChange={e=>setKits(Math.max(1,Number(e.target.value)))} style={{...si_,width:100,fontSize:18,fontWeight:700,textAlign:"center"}} />
            <div style={{display:"flex",gap:4}}>
              {[1,5,10,25,50,100].map(q=>(
                <button key={q} onClick={()=>setKits(q)} style={{...so_,fontSize:11,padding:"4px 8px",background:kits===q?K.pri+"15":"transparent",color:kits===q?K.pri:K.txM,borderColor:kits===q?K.pri:K.bd}}>{q}</button>
              ))}
            </div>
          </div>

          <div style={{fontSize:12}}>
            <div style={{display:"grid",gridTemplateColumns:"70px 2fr 1fr 100px 100px 80px",gap:4,padding:"8px 0",color:K.txD,fontWeight:600,fontSize:11,textTransform:"uppercase"}}>
              <span>Code</span><span>Material</span><span>Used In</span><span>Per Kit</span><span style={{fontWeight:700,color:K.pri}}>× {kits} Kits</span><span>Have?</span>
            </div>
            {bom.map((item, i) => {
              const rm = rawMaterials.find(r=>r.id===item.rawMaterialId);
              const need = Math.round(item.qtyPerUnit * kits * 100)/100;
              const stock = getStock(item.rawMaterialId);
              const ok = stock >= need;
              const maxKits = item.qtyPerUnit > 0 ? Math.floor(stock / item.qtyPerUnit) : 999;
              return (
                <div key={i} style={{display:"grid",gridTemplateColumns:"70px 2fr 1fr 100px 100px 80px",gap:4,padding:"8px 0",borderTop:`1px solid ${K.bd}`,alignItems:"center"}}>
                  <span style={{fontWeight:600,color:K.pri}}>{rm?.code||"?"}</span>
                  <span style={{color:K.tx}}>{rm?.name||"Unknown"}</span>
                  <span style={{fontSize:11,color:K.txM}}>{item.component||"—"}</span>
                  <span style={{color:K.txM}}>{item.qtyPerUnit} {rm?.unit}</span>
                  <span style={{fontWeight:700,fontSize:14,color:K.tx}}>{need} {rm?.unit}</span>
                  <span>{ok ? <Tg c="#16a34a" bg="#dcfce7">✓ OK</Tg> : <Tg c="#dc2626" bg="#fef2f2">Need {Math.round((need-stock)*100)/100}</Tg>}</span>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div style={{marginTop:16,padding:"14px 18px",background:K.hv,borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:K.tx}}>
                {bom.every(item=>getStock(item.rawMaterialId)>=item.qtyPerUnit*kits)
                  ? `✅ You have enough stock for ${kits} kits`
                  : `⚠️ Not enough stock for ${kits} kits`
                }
              </div>
              <div style={{fontSize:12,color:K.txM}}>
                Max kits with current stock: <strong style={{color:K.pri}}>
                  {Math.min(...bom.map(item=>item.qtyPerUnit>0?Math.floor(getStock(item.rawMaterialId)/item.qtyPerUnit):9999))}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Product → BOM + Components + Kit Processes ── */
function ProductView({ p, S, sv, addLog, getStock, getSteps, go, onBack }) {
  const allKits = { ...DEF_COMPONENTS, ...(S.customKits||{}) };
  const comp = allKits[p.componentKey] || allKits[getCompKey(p)];
  const [editBom, setEditBom] = useState(false);
  const [bomLocal, setBomLocal] = useState(S.bom?.[p.id] || []);
  useEffect(() => { setBomLocal(S.bom?.[p.id] || []); }, [S.bom, p.id]);
  const bom = S.bom?.[p.id] || [];
  const [editCompId, setEditCompId] = useState(null);
  const [editCompForm, setEditCompForm] = useState({});
  const [showAddComp, setShowAddComp] = useState(false);
  const [newCompForm, setNewCompForm] = useState({name:"",icon:"🧪",desc:""});

  // Get overridden name/desc for a component
  const overrides = S.componentOverrides || {};
  const getCompInfo = (item) => {
    const key = getCompKey(p) + "__" + item.id;
    const ov = overrides[key];
    return { name: ov?.name || item.name, desc: ov?.desc || item.desc, icon: ov?.icon || item.icon };
  };

  const saveCompEdit = async (itemId) => {
    const key = getCompKey(p) + "__" + itemId;
    const newOv = { ...overrides, [key]: editCompForm };
    await sv("componentOverrides", newOv);
    await addLog("Edited component", editCompForm.name);
    setEditCompId(null); setEditCompForm({});
  };

  if (!comp) return (<PW title="Product not found"><button onClick={onBack} style={sbk_}>← Back</button></PW>);

  return (
    <PW>
      <button onClick={onBack} style={sbk_}>← Back to Products</button>
      <div style={{display:"flex",alignItems:"center",gap:16,margin:"16px 0 8px"}}>
        <span style={{fontSize:40}}>{p.emoji}</span>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:K.tx,margin:0}}>{p.name}</h1>
          <p style={{fontSize:14,color:K.txM,margin:"4px 0"}}>{p.brand} • {p.format} • {p.type}</p>
        </div>
      </div>

      {/* ── BILL OF MATERIALS ── */}
      <div style={{background:K.cd,borderRadius:14,border:`1px solid ${K.bd}`,padding:20,margin:"24px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>📐</span>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:K.tx}}>Bill of Materials (BOM)</div>
              <div style={{fontSize:12,color:K.txM}}>Raw materials needed per unit produced</div>
              {getSiblings(p.id, S.products).length > 0 && (
                <div style={{fontSize:11,color:K.pri,marginTop:2}}>🔄 Syncs across: {[p.brand, ...getSiblings(p.id, S.products).map(sid => S.products.find(x=>x.id===sid)?.brand)].filter(Boolean).join(", ")}</div>
              )}
            </div>
          </div>
          {!editBom && <button onClick={() => setEditBom(true)} style={{...sb_,fontSize:12}}>✏️ Edit BOM</button>}
          {editBom && (
            <div style={{display:"flex",gap:8}}>
              <button onClick={() => setBomLocal([...bomLocal,{rawMaterialId:"",qtyPerUnit:1}])} style={{...so_,fontSize:12}}>+ Add Item</button>
              <button onClick={async () => {
                // Save BOM and auto-sync to all sibling products (same kit type, different brand)
                const newBom = { ...S.bom, [p.id]: bomLocal };
                const siblings = getSiblings(p.id, S.products);
                siblings.forEach(sid => { newBom[sid] = bomLocal; });
                await sv("bom", newBom);
                await addLog("Updated BOM", p.name + (siblings.length ? ` (synced to ${siblings.length} brand${siblings.length>1?"s":""})` : ""));
                setEditBom(false);
              }} style={{...sb_,fontSize:12}}>💾 Save</button>
              <button onClick={() => { setEditBom(false); setBomLocal(S.bom?.[p.id]||[]); }} style={{...so_,fontSize:12}}>Cancel</button>
            </div>
          )}
        </div>

        {editBom ? (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {bomLocal.map((item, i) => (
              <div key={i} style={{display:"flex",gap:8,alignItems:"center"}}>
                <select value={item.rawMaterialId} onChange={e => { const n=[...bomLocal]; n[i]={...n[i],rawMaterialId:e.target.value}; setBomLocal(n); }} style={{...ss_,flex:2}}>
                  <option value="">— Select Raw Material —</option>
                  {(S.rawMaterials||[]).map(rm => <option key={rm.id} value={rm.id}>{rm.code} - {rm.name} ({rm.unit})</option>)}
                </select>
                <input type="number" step="0.01" value={item.qtyPerUnit} onChange={e => { const n=[...bomLocal]; n[i]={...n[i],qtyPerUnit:Number(e.target.value)}; setBomLocal(n); }} style={{...si_,width:90}} placeholder="Qty" />
                <button onClick={() => setBomLocal(bomLocal.filter((_,j)=>j!==i))} style={{...sm_,color:K.er}}>✕</button>
              </div>
            ))}
            {bomLocal.length === 0 && <div style={{color:K.txD,fontSize:13,padding:10}}>Click "+ Add Item" to define the raw materials formula</div>}
          </div>
        ) : bom.length === 0 ? (
          <div style={{color:K.txD,fontSize:13,textAlign:"center",padding:16}}>No BOM defined yet — click "Edit BOM" to set up the formula</div>
        ) : (
          <div style={{fontSize:13}}>
            <div style={{display:"grid",gridTemplateColumns:"70px 2fr 1fr 1fr 1fr 1fr",gap:4,padding:"6px 0",color:K.txD,fontWeight:600,fontSize:11}}>
              <span>CODE</span><span>MATERIAL</span><span>USED IN</span><span>QTY/KIT</span><span>IN STOCK</span><span>STATUS</span>
            </div>
            {bom.map((item, i) => {
              const rm = (S.rawMaterials||[]).find(r => r.id === item.rawMaterialId);
              const stock = getStock(item.rawMaterialId);
              const ok = stock >= item.qtyPerUnit;
              return (
                <div key={i} style={{display:"grid",gridTemplateColumns:"70px 2fr 1fr 1fr 1fr 1fr",gap:4,padding:"8px 0",borderTop:`1px solid ${K.bd}`,alignItems:"center"}}>
                  <span style={{fontWeight:600,color:K.pri}}>{rm?.code || "?"}</span>
                  <span>{rm?.name || "Unknown"}</span>
                  <span style={{fontSize:11,color:K.txM}}>{item.component || "—"}</span>
                  <span>{item.qtyPerUnit} {rm?.unit}</span>
                  <span style={{fontWeight:600,color:ok?K.ok:K.er}}>{stock} {rm?.unit}</span>
                  <span>{ok ? <Tg c="#16a34a" bg="#dcfce7">OK</Tg> : <Tg c="#dc2626" bg="#fef2f2">Low</Tg>}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── BATCH CALCULATOR ── */}
      {bom.length > 0 && <BatchCalc bom={bom} rawMaterials={S.rawMaterials||[]} getStock={getStock} product={p} />}

      {/* ── KIT COMPONENTS ── */}
      <div style={{marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:K.tx,marginBottom:4}}>🧪 Kit Components</div>
          <div style={{fontSize:13,color:K.txM}}>Select which component to produce:</div>
        </div>
        <button onClick={()=>setShowAddComp(!showAddComp)} style={{...so_,fontSize:12}}>{showAddComp?"Cancel":"+ Add Component"}</button>
      </div>

      {showAddComp && (
        <div style={{background:K.cd,borderRadius:10,padding:16,border:`1px solid ${K.pri}`,marginBottom:12}}>
          <div style={{display:"flex",gap:8,alignItems:"end"}}>
            <input value={newCompForm.icon} onChange={e=>setNewCompForm({...newCompForm,icon:e.target.value})} style={{...si_,width:50,textAlign:"center",fontSize:20}} />
            <div style={{flex:1}}><label style={sl_}>Name</label><input value={newCompForm.name} onChange={e=>setNewCompForm({...newCompForm,name:e.target.value})} placeholder="e.g. Calibration Solution" style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
            <div style={{flex:1}}><label style={sl_}>Description</label><input value={newCompForm.desc} onChange={e=>setNewCompForm({...newCompForm,desc:e.target.value})} placeholder="Short description" style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
            <button onClick={async()=>{
              if(!newCompForm.name) return;
              const ck = p.componentKey || getCompKey(p);
              const curItems = [...(allKits[ck]?.items||[])];
              const newId = newCompForm.name.toLowerCase().replace(/[^a-z0-9]+/g,"-");
              curItems.push({id:newId,name:newCompForm.name,icon:newCompForm.icon,desc:newCompForm.desc});
              const existing = S.customKits||{};
              const base = allKits[ck]||{};
              await sv("customKits",{...existing,[ck]:{...base,items:curItems}});
              await addLog("Added component",newCompForm.name+" to "+p.name);
              setNewCompForm({name:"",icon:"🧪",desc:""}); setShowAddComp(false);
            }} style={{...sb_,fontSize:12}}>Add</button>
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12,marginBottom:32}}>
        {comp.items.map(item => {
          const steps = getSteps(p.id, item.id);
          const info = getCompInfo(item);
          const isEditing = editCompId === item.id;
          return (
            <div key={item.id} style={{background:K.cd,borderRadius:12,padding:18,border:`1px solid ${isEditing?K.pri:K.pri+"33"}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",marginBottom:0}}>
              {isEditing ? (
                /* Edit mode */
                <div>
                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    <input value={editCompForm.icon||""} onChange={e=>setEditCompForm({...editCompForm,icon:e.target.value})} style={{...si_,width:50,textAlign:"center",fontSize:20,padding:"6px"}} />
                    <div style={{flex:1}}>
                      <input value={editCompForm.name||""} onChange={e=>setEditCompForm({...editCompForm,name:e.target.value})} placeholder="Component name" style={{...si_,width:"100%",boxSizing:"border-box",fontWeight:600,marginBottom:6}} />
                      <input value={editCompForm.desc||""} onChange={e=>setEditCompForm({...editCompForm,desc:e.target.value})} placeholder="Description" style={{...si_,width:"100%",boxSizing:"border-box",fontSize:12}} />
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,justifyContent:"space-between"}}>
                    <button onClick={async()=>{
                      const ck = p.componentKey || getCompKey(p);
                      const curItems = (allKits[ck]?.items||[]).filter(x=>x.id!==item.id);
                      const existing = S.customKits||{};
                      const base = allKits[ck]||{};
                      await sv("customKits",{...existing,[ck]:{...base,items:curItems}});
                      await addLog("Removed component",info.name+" from "+p.name);
                      setEditCompId(null);
                    }} style={{...so_,fontSize:11,padding:"4px 10px",color:K.er,borderColor:K.er+"66"}}>🗑️ Remove</button>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>setEditCompId(null)} style={{...so_,fontSize:11,padding:"4px 10px"}}>Cancel</button>
                      <button onClick={()=>saveCompEdit(item.id)} style={{...sb_,fontSize:11,padding:"4px 10px"}}>💾 Save</button>
                    </div>
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                    <div style={{width:48,height:48,borderRadius:12,background:K.hv,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{info.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:600,color:K.tx}}>{info.name}</div>
                      <div style={{fontSize:11,color:K.txM}}>{info.desc}</div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();setEditCompId(item.id);setEditCompForm({name:info.name,desc:info.desc,icon:info.icon})}} style={{...sm_,width:24,height:24,fontSize:10}} title="Edit or remove">✏️</button>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>go("slides",{comp:item.id,proc:null,si:0})}>
                    <span style={{fontSize:12,color:steps.length?K.ok:K.txD}}>{steps.length?steps.length+" steps":"No instructions"}</span>
                    <span style={{color:K.pri,fontSize:13,fontWeight:600}}>Start →</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ── KIT ASSEMBLY ── */}
      <div style={{fontSize:16,fontWeight:700,color:K.tx,marginBottom:4}}>📦 Kit Assembly & Finishing</div>
      <div style={{fontSize:13,color:K.txM,marginBottom:16}}>After producing all components:</div>
      {KIT_PROCESSES.map((proc, i) => {
        const steps = getSteps(p.id, proc.id);
        const isLabel = proc.id === "label-print";
        const tpl4 = (S.labelTemplates||{})[p.id+"__4x3"];
        const tpl2 = (S.labelTemplates||{})[p.id+"__2.25x1.25"];
        const hasTemplates = tpl4?.imageData || tpl2?.imageData;
        return (
          <Crd key={proc.id} onClick={()=>go("slides",{proc:proc.id,comp:null,si:0})} row>
            <div style={{width:44,height:44,borderRadius:10,background:isLabel?"#eff6ff":K.hv,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{proc.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:K.tx}}>{proc.name}</div>
              <div style={{fontSize:12,color:K.txM}}>{proc.desc}</div>
              {isLabel && <div style={{fontSize:11,color:hasTemplates?K.ok:K.wr,marginTop:2}}>
                {hasTemplates ? "✓ Label template uploaded" : "⚠ No template — click to upload"}
              </div>}
            </div>
            {!isLabel && <span style={{fontSize:12,color:steps.length?K.ok:K.txD}}>{steps.length||"—"}</span>}
            {isLabel && hasTemplates && <Tg c="#16a34a" bg="#dcfce7">Ready</Tg>}
            <span style={{color:K.txD}}>→</span>
          </Crd>
        );
      })}
    </PW>
  );
}

/* ── Slides ── */
function SlidesView({ p, compId, procId, steps, si, setSi, edit, setEdit, S, sv, aLog, onBack }) {
  const [L, setL] = useState(steps);
  const [ed, setEd] = useState(null);
  useEffect(() => { setL(steps); }, [steps]);

  const cur = L[si]; const total = L.length;
  const instrKey = p.id + "__" + (compId||procId);
  const allKitsLocal = { ...DEF_COMPONENTS, ...(S.customKits||{}) };
  const comp = compId ? (allKitsLocal[p.componentKey]||allKitsLocal[getCompKey(p)])?.items.find(x=>x.id===compId) : null;
  const proc = procId ? KIT_PROCESSES.find(x=>x.id===procId) : null;
  // Use overridden name/icon if available
  const compOv = compId ? (S.componentOverrides||{})[getCompKey(p)+"__"+compId] : null;
  const label = comp ? (compOv?.name || comp.name) : proc?.name || "";
  const icon = comp ? (compOv?.icon || comp.icon) : proc?.icon || "";

  const doSave = async () => {
    // Save instructions and auto-sync to sibling products (same kit, all brands)
    const newInstr = { ...S.instructions, [instrKey]: L };
    const siblings = getSiblings(p.id, S.products);
    const suffix = "__" + (compId || procId);
    siblings.forEach(sid => { newInstr[sid + suffix] = L; });
    await sv("instructions", newInstr);
    await aLog("Edited", p.name + " → " + label + (siblings.length ? ` (synced to ${siblings.length} brand${siblings.length>1?"s":""})` : ""));
    setEdit(false); setEd(null);
  };

  const addStep = (afterIndex) => {
    const newStep = {title:"New Step",description:"",warning:"",notes:"",observations:"",images:[]};
    if (afterIndex === undefined || afterIndex === null) {
      // Add at end
      const ns = [...L, newStep];
      setL(ns); setSi(ns.length-1); setEd(ns.length-1);
    } else {
      // Insert after the given index
      const ns = [...L.slice(0, afterIndex+1), newStep, ...L.slice(afterIndex+1)];
      setL(ns); setSi(afterIndex+1); setEd(afterIndex+1);
    }
  };

  const [confirmDel, setConfirmDel] = useState(null);
  const deleteStep = (i) => {
    const ns = L.filter((_,j) => j !== i);
    setL(ns);
    setEd(null);
    setConfirmDel(null);
    if (si >= ns.length) setSi(Math.max(0, ns.length-1));
  };

  // VIEW
  if (!edit) return (
    <div style={{padding:"32px 28px",maxWidth:960,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <button onClick={onBack} style={sbk_}>← Back</button>
        <button onClick={()=>setEdit(true)} style={{...sb_,fontSize:13,padding:"8px 16px"}}>✏️ Edit</button>
      </div>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:13,color:K.txM}}>{p.name} ({p.brand})</div>
        <h2 style={{fontSize:22,fontWeight:700,color:K.tx,margin:"4px 0"}}>{icon} {label}</h2>
      </div>

      {/* Print panel for label-print process */}
      {procId === "label-print" && <LabelPrintPanel product={p} S={S} sv={sv} aLog={aLog} />}

      {total===0 ? (
        <div style={{textAlign:"center",padding:60,background:K.cd,borderRadius:16,border:`1px solid ${K.bd}`}}>
          <div style={{fontSize:48,marginBottom:16}}>📭</div>
          <div style={{color:K.txM,marginBottom:16}}>No instructions yet</div>
          <button onClick={()=>{setEdit(true);addStep()}} style={sb_}>+ Create Instructions</button>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div style={{display:"flex",gap:4,marginBottom:24}}>{L.map((_,i)=><div key={i} onClick={()=>setSi(i)} style={{flex:1,height:5,borderRadius:3,cursor:"pointer",background:i<=si?K.pri:K.bd,transition:"all .2s"}}/>)}</div>

          {/* Slide Card */}
          <div style={{background:K.cd,borderRadius:16,border:`1px solid ${K.bd}`,overflow:"hidden",marginBottom:24}}>
            <div style={{padding:"12px 24px",background:K.hv,display:"flex",justifyContent:"space-between",borderBottom:`1px solid ${K.bd}`}}>
              <span style={{fontSize:13,fontWeight:600,color:K.prL}}>STEP {si+1} / {total}</span>
              <span style={{fontSize:12,color:K.txD}}>{Math.round(((si+1)/total)*100)}%</span>
            </div>
            <div style={{padding:28}}>
              <h3 style={{fontSize:20,fontWeight:700,color:K.tx,margin:"0 0 20px"}}>{cur.title}</h3>
              {/* Two columns: text left, photo right */}
              <div style={{display:"flex",gap:24,alignItems:"flex-start",flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:260}}>
                  <p style={{fontSize:15,lineHeight:1.7,color:K.tx,margin:"0 0 16px",whiteSpace:"pre-wrap"}}>{cur.description}</p>
                  {cur.warning && <Ab type="err" icon="⚠️">{cur.warning}</Ab>}
                  {cur.notes && <Ab type="info" icon="💡">{cur.notes}</Ab>}
                </div>
                <div style={{width:280,flexShrink:0}}>
                  {(cur.images||[]).length > 0 ? (
                    cur.images.map((img,i) => (
                      <div key={i} style={{borderRadius:12,overflow:"hidden",border:`1px solid ${K.bd}`,background:K.hv,marginBottom:8}}>
                        <img src={img} alt="" style={{width:"100%",display:"block",objectFit:"contain"}} />
                      </div>
                    ))
                  ) : (
                    <div style={{width:"100%",height:200,borderRadius:12,border:`2px dashed ${K.bd}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,color:K.txD}}>
                      <span style={{fontSize:36}}>📷</span>
                      <span style={{fontSize:12}}>No photo for this step</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Observations */}
              {cur.observations && (
                <div style={{marginTop:16,padding:"14px 18px",borderRadius:12,background:K.hv,border:`1px solid ${K.bd}`}}>
                  <div style={{fontSize:11,fontWeight:600,color:K.txM,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>📋 Observations</div>
                  <p style={{fontSize:14,lineHeight:1.6,color:K.tx,margin:0,whiteSpace:"pre-wrap"}}>{cur.observations}</p>
                </div>
              )}
            </div>
          </div>

          {/* Nav */}
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <button onClick={()=>setSi(Math.max(0,si-1))} disabled={si===0} style={{...sn_,opacity:si===0?.3:1}}>← Previous</button>
            <div style={{display:"flex",gap:6}}>{L.map((_,i)=><div key={i} onClick={()=>setSi(i)} style={{width:i===si?24:8,height:8,borderRadius:4,cursor:"pointer",background:i===si?K.pri:K.bd}}/>)}</div>
            <button onClick={()=>setSi(Math.min(total-1,si+1))} disabled={si===total-1} style={{...sn_,opacity:si===total-1?.3:1}}>Next →</button>
          </div>
        </>
      )}
    </div>
  );

  // EDIT
  return (
    <div style={{padding:"32px 28px",maxWidth:960,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <button onClick={()=>{setEdit(false);setL(steps);setEd(null)}} style={sbk_}>← Cancel</button>
        <div style={{display:"flex",gap:8}}><button onClick={()=>addStep()} style={{...so_,fontSize:13}}>+ Add Step at End</button><button onClick={doSave} style={{...sb_,fontSize:13}}>💾 Save</button></div>
      </div>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:13,color:K.txM}}>{p.name} ({p.brand})</div>
        <h2 style={{fontSize:18,fontWeight:700,color:K.tx,margin:"4px 0"}}>✏️ Editing: {label}</h2>
        {getSiblings(p.id, S.products).length > 0 && (
          <div style={{fontSize:12,color:K.pri,marginTop:6,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <span>🔄</span> Auto-syncs to: {getSiblings(p.id, S.products).map(sid => S.products.find(x=>x.id===sid)?.brand).filter(Boolean).join(", ")}
          </div>
        )}
      </div>

      {L.map((step,i) => (
        <div key={i}>
          <div style={{background:K.cd,borderRadius:12,border:`1px solid ${ed===i?K.pri:K.bd}`,overflow:"hidden",marginBottom:2}}>
            <div style={{padding:"10px 16px",background:K.hv,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setEd(ed===i?null:i)}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:13,fontWeight:600,color:K.pri}}>Step {i+1}</span>
                <span style={{fontSize:13,color:K.txM}}>{step.title}</span>
                {(step.images||[]).length>0 && <Tg c="#2563eb" bg="#dbeafe">📷{step.images.length}</Tg>}
                {step.observations && <Tg c="#16a34a" bg="#dcfce7">📋</Tg>}
              </div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={e=>{e.stopPropagation();if(i===0)return;const n=[...L];[n[i],n[i-1]]=[n[i-1],n[i]];setL(n);setSi(i-1);setEd(null)}} style={sm_} disabled={i===0} title="Move up">↑</button>
                <button onClick={e=>{e.stopPropagation();if(i===L.length-1)return;const n=[...L];[n[i],n[i+1]]=[n[i+1],n[i]];setL(n);setSi(i+1);setEd(null)}} style={sm_} disabled={i===L.length-1} title="Move down">↓</button>
                <button onClick={e=>{e.stopPropagation();setConfirmDel(confirmDel===i?null:i)}} style={{...sm_,color:K.er}} title="Delete step">✕</button>
              </div>
            </div>

            {/* Delete confirmation */}
            {confirmDel === i && (
              <div style={{padding:"10px 16px",background:"#fef2f2",borderTop:`1px solid #fca5a5`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:13,color:"#991b1b"}}>Delete step "{step.title}"?</span>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>setConfirmDel(null)} style={{...so_,fontSize:11,padding:"4px 10px"}}>Cancel</button>
                  <button onClick={()=>deleteStep(i)} style={{...sb_,fontSize:11,padding:"4px 10px",background:K.er,color:"#fff"}}>🗑️ Delete</button>
                </div>
              </div>
            )}
          {ed===i && (
            <div style={{padding:18}}>
              <div style={{marginBottom:12}}><label style={sl_}>Title</label><input value={step.title} onChange={e=>{const n=[...L];n[i]={...n[i],title:e.target.value};setL(n)}} style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
              {/* Two columns: text left, photo right */}
              <div style={{display:"flex",gap:18,flexWrap:"wrap",marginBottom:12}}>
                <div style={{flex:1,minWidth:250,display:"flex",flexDirection:"column",gap:12}}>
                  <div><label style={sl_}>Instructions</label><textarea value={step.description} onChange={e=>{const n=[...L];n[i]={...n[i],description:e.target.value};setL(n)}} rows={6} style={{...si_,width:"100%",boxSizing:"border-box",resize:"vertical"}} /></div>
                  <div><label style={sl_}>⚠️ Warning</label><input value={step.warning||""} onChange={e=>{const n=[...L];n[i]={...n[i],warning:e.target.value};setL(n)}} style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
                  <div><label style={sl_}>💡 Tips</label><input value={step.notes||""} onChange={e=>{const n=[...L];n[i]={...n[i],notes:e.target.value};setL(n)}} style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
                </div>
                <div style={{width:260,flexShrink:0}}>
                  <label style={sl_}>📸 Step Photo</label>
                  <PhotoBox images={step.images||[]} onChange={imgs=>{const n=[...L];n[i]={...n[i],images:imgs};setL(n)}} canEdit={true} />
                </div>
              </div>
              <div><label style={sl_}>📋 Observations</label><textarea value={step.observations||""} onChange={e=>{const n=[...L];n[i]={...n[i],observations:e.target.value};setL(n)}} rows={2} placeholder="Additional notes for operators..." style={{...si_,width:"100%",boxSizing:"border-box",resize:"vertical"}} /></div>
            </div>
          )}
        </div>
        {/* Insert step between button */}
        <div style={{display:"flex",justifyContent:"center",padding:"4px 0"}}>
          <button onClick={()=>addStep(i)} style={{background:"transparent",border:`1px dashed ${K.bd}`,borderRadius:8,padding:"4px 16px",fontSize:11,color:K.txM,cursor:"pointer",fontFamily:FN,display:"flex",alignItems:"center",gap:4}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=K.pri;e.currentTarget.style.color=K.pri}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=K.bd;e.currentTarget.style.color=K.txM}}>
            + Insert step here
          </button>
        </div>
        </div>
      ))}
      {L.length===0 && <div style={{textAlign:"center",padding:40,color:K.txM}}>📝 Click "+ Add Step at End" to create your first step</div>}
    </div>
  );
}

/* ── Factory Location Photos ── */
function FactoryPhotos({ photos, onSave }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(photos);
  const [expanded, setExpanded] = useState(null);
  const MAX = 6;

  useEffect(() => setLocal(photos), [photos]);

  const addPhoto = (e) => {
    const file = e.target.files[0]; if (!file || local.length >= MAX) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const maxW = 800;
        c.width = Math.min(img.width, maxW); c.height = img.height * (c.width / img.width);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        setLocal([...local, { src: c.toDataURL("image/jpeg", 0.85), caption: "" }]);
      }; img.src = ev.target.result;
    }; reader.readAsDataURL(file); e.target.value = "";
  };

  if (!editing && local.length === 0) return (
    <div style={{marginBottom:20,textAlign:"center",padding:"20px",background:K.cd,borderRadius:12,border:`2px dashed ${K.bd}`}}>
      <span style={{fontSize:28}}>📷</span>
      <div style={{fontSize:13,color:K.txM,margin:"8px 0"}}>Add photos of your factory locations to help operators find equipment</div>
      <button onClick={()=>setEditing(true)} style={{...so_,fontSize:12}}>+ Add Location Photos</button>
    </div>
  );

  return (
    <div style={{marginBottom:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:14,fontWeight:700,color:K.tx}}>📷 Factory Location Photos</div>
        <button onClick={()=>{if(editing){onSave(local);setEditing(false)}else setEditing(true)}} style={{...so_,fontSize:12}}>
          {editing ? "💾 Save Photos" : "✏️ Edit"}
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
        {local.map((p, i) => (
          <div key={i} style={{position:"relative",borderRadius:10,overflow:"hidden",border:`1px solid ${K.bd}`,background:K.cd,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
            <img src={p.src} alt="" onClick={()=>setExpanded(expanded===i?null:i)} style={{width:"100%",height:130,objectFit:"cover",cursor:"pointer",display:"block"}} />
            {editing ? (
              <div style={{padding:"6px 8px"}}>
                <input value={p.caption} onChange={e=>{const n=[...local];n[i]={...n[i],caption:e.target.value};setLocal(n)}} placeholder="Caption (e.g. Main Blue Bench)" style={{...si_,width:"100%",boxSizing:"border-box",fontSize:11}} />
                <button onClick={()=>setLocal(local.filter((_,j)=>j!==i))} style={{...sm_,color:K.er,fontSize:10,marginTop:4,width:"100%"}}>🗑️ Remove</button>
              </div>
            ) : (
              p.caption && <div style={{padding:"6px 8px",fontSize:11,color:K.txM,fontWeight:600}}>{p.caption}</div>
            )}
          </div>
        ))}

        {editing && local.length < MAX && (
          <label style={{borderRadius:10,border:`2px dashed ${K.bd}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,minHeight:130,cursor:"pointer",color:K.txM,fontSize:12}}>
            <span style={{fontSize:24}}>📷</span>
            <span>+ Add Photo</span>
            <span style={{fontSize:10}}>({local.length}/{MAX})</span>
            <input type="file" accept="image/*" onChange={addPhoto} style={{display:"none"}} />
          </label>
        )}
      </div>

      {/* Expanded photo */}
      {expanded !== null && local[expanded] && (
        <div onClick={()=>setExpanded(null)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.85)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",padding:20}}>
          <div style={{maxWidth:"90vw",maxHeight:"90vh",position:"relative"}} onClick={e=>e.stopPropagation()}>
            <img src={local[expanded].src} alt="" style={{maxWidth:"90vw",maxHeight:"85vh",borderRadius:8,objectFit:"contain"}} />
            {local[expanded].caption && <div style={{textAlign:"center",color:"#fff",fontSize:16,fontWeight:600,marginTop:10}}>{local[expanded].caption}</div>}
            <button onClick={()=>setExpanded(null)} style={{position:"absolute",top:-12,right:-12,width:32,height:32,borderRadius:16,background:"#fff",border:"none",fontSize:16,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Equipment Map ── */
function EquipmentView({ S, sv, aLog }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({name:"",location:"",shelf:"",icon:"🔧",notes:""});
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [renameLoc, setRenameLoc] = useState(null);
  const [newLocName, setNewLocName] = useState("");
  const equip = S.equipment || DEF_EQUIPMENT;
  const locations = [...new Set(equip.map(e=>e.location))];
  const [filterLoc, setFilterLoc] = useState("all");

  const filtered = equip.filter(e => {
    if (filterLoc !== "all" && e.location !== filterLoc) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by location
  const grouped = {};
  filtered.forEach(e => { if (!grouped[e.location]) grouped[e.location] = []; grouped[e.location].push(e); });

  // Helper: get full location string for an equipment item
  const getLocStr = (eq) => eq.shelf ? `${eq.location} / ${eq.shelf}` : eq.location;

  // Propagate location changes to all instruction texts
  const updateInstructionLocations = async (oldLocStr, newLocStr) => {
    if (oldLocStr === newLocStr) return;
    const newInstr = {};
    let changed = false;
    for (const [key, steps] of Object.entries(S.instructions || {})) {
      const newSteps = steps.map(step => {
        let updated = { ...step };
        let mod = false;
        if (step.description?.includes(oldLocStr)) { updated.description = step.description.replaceAll(oldLocStr, newLocStr); mod = true; }
        if (step.warning?.includes(oldLocStr)) { updated.warning = step.warning.replaceAll(oldLocStr, newLocStr); mod = true; }
        if (step.notes?.includes(oldLocStr)) { updated.notes = step.notes.replaceAll(oldLocStr, newLocStr); mod = true; }
        if (step.observations?.includes(oldLocStr)) { updated.observations = step.observations.replaceAll(oldLocStr, newLocStr); mod = true; }
        if (mod) changed = true;
        return mod ? updated : step;
      });
      newInstr[key] = newSteps;
    }
    if (changed) {
      await sv("instructions", newInstr);
      await aLog("Updated locations in instructions", `"${oldLocStr}" → "${newLocStr}"`);
    }
  };

  // Rename a location group
  const handleRenameLoc = async (oldName) => {
    if (!newLocName || newLocName === oldName) { setRenameLoc(null); return; }
    // Update all equipment with this location
    const updated = equip.map(e => e.location === oldName ? { ...e, location: newLocName } : e);
    await sv("equipment", updated);
    // Propagate to instructions
    await updateInstructionLocations(oldName, newLocName);
    await aLog("Renamed location", `"${oldName}" → "${newLocName}"`);
    setRenameLoc(null); setNewLocName("");
    if (filterLoc === oldName) setFilterLoc(newLocName);
  };

  // Save equipment edit
  const handleSaveEdit = async (id) => {
    const oldItem = equip.find(e => e.id === id);
    const updated = equip.map(e => e.id === id ? { ...e, ...editForm } : e);
    await sv("equipment", updated);
    // If location or shelf changed, update instruction references
    if (oldItem) {
      const oldStr = getLocStr(oldItem);
      const newStr = editForm.shelf ? `${editForm.location} / ${editForm.shelf}` : editForm.location;
      if (oldStr !== newStr) await updateInstructionLocations(oldStr, newStr);
    }
    await aLog("Updated equipment", editForm.name);
    setEditId(null); setEditForm({});
  };

  // Delete equipment
  const handleDelete = async (id) => {
    const item = equip.find(e => e.id === id);
    await sv("equipment", equip.filter(e => e.id !== id));
    await aLog("Removed equipment", item?.name || id);
  };

  return (
    <PW title="Equipment & Materials Map" sub="Find where everything is located — changes auto-update all instructions">

      {/* ── FACTORY LOCATION PHOTOS ── */}
      <FactoryPhotos photos={S.equipmentPhotos||[]} onSave={async(p)=>{await sv("equipmentPhotos",p);await aLog("Updated factory photos",""+p.length+" photos")}} />

      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <input placeholder="Search equipment..." value={search} onChange={e=>setSearch(e.target.value)} style={{...si_,flex:1,minWidth:200}} />
        <select value={filterLoc} onChange={e=>setFilterLoc(e.target.value)} style={ss_}><option value="all">All Locations</option>{locations.map(l=><option key={l}>{l}</option>)}</select>
        <button onClick={()=>setShowAdd(!showAdd)} style={sb_}>+ Add Equipment</button>
      </div>

      {showAdd && (
        <div style={{background:K.cd,borderRadius:12,padding:20,border:`1px solid ${K.pri}`,marginBottom:20,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{fontSize:14,fontWeight:600,color:K.tx,marginBottom:12}}>Add New Equipment</div>
          <div style={{display:"grid",gridTemplateColumns:"auto 2fr 1fr 1fr",gap:12}}>
            <div><label style={sl_}>Icon</label><input value={form.icon} onChange={e=>setForm({...form,icon:e.target.value})} style={{...si_,width:50,textAlign:"center"}} /></div>
            <div><label style={sl_}>Equipment Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
            <div><label style={sl_}>Location</label><input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="e.g. Cabinet 1" style={{...si_,width:"100%",boxSizing:"border-box"}} list="loc-list" /></div>
            <div><label style={sl_}>Shelf / Area</label><input value={form.shelf} onChange={e=>setForm({...form,shelf:e.target.value})} placeholder="e.g. Shelf 2" style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
          </div>
          <datalist id="loc-list">{locations.map(l=><option key={l} value={l}/>)}</datalist>
          <div style={{marginTop:12}}><label style={sl_}>Notes</label><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
          <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
            <button onClick={()=>setShowAdd(false)} style={so_}>Cancel</button>
            <button onClick={async()=>{
              if (!form.name||!form.location) return;
              await sv("equipment",[...equip,{...form,id:"eq-"+Date.now()}]);
              await aLog("Added equipment",form.name);
              setForm({name:"",location:"",shelf:"",icon:"🔧",notes:""}); setShowAdd(false);
            }} style={sb_}>Add</button>
          </div>
        </div>
      )}

      <Ab type="info" icon="🔄">When you change a location here, all work instructions are automatically updated with the new location.</Ab>

      {Object.entries(grouped).map(([loc, items]) => (
        <div key={loc} style={{marginBottom:24}}>
          {/* Location header with rename */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            {renameLoc === loc ? (
              <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
                <span style={{fontSize:16}}>📍</span>
                <input value={newLocName} onChange={e=>setNewLocName(e.target.value)} autoFocus
                  style={{...si_,flex:1,fontSize:14,fontWeight:700}} placeholder="New location name..."
                  onKeyDown={e=>{ if(e.key==="Enter") handleRenameLoc(loc); if(e.key==="Escape") setRenameLoc(null); }} />
                <button onClick={()=>handleRenameLoc(loc)} style={{...sb_,fontSize:12,padding:"6px 14px"}}>Save</button>
                <button onClick={()=>setRenameLoc(null)} style={{...so_,fontSize:12,padding:"6px 14px"}}>Cancel</button>
              </div>
            ) : (
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>📍</span>
                <span style={{fontSize:15,fontWeight:700,color:K.pri}}>{loc}</span>
                <span style={{fontSize:12,color:K.txD}}>({items.length} items)</span>
                <button onClick={()=>{setRenameLoc(loc);setNewLocName(loc)}} style={{...sm_,width:24,height:24,fontSize:11}} title="Rename location">✏️</button>
              </div>
            )}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {items.map(eq => (
              <div key={eq.id} style={{background:K.cd,borderRadius:10,padding:"12px 16px",border:`1px solid ${editId===eq.id?K.pri:K.bd}`,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                {editId === eq.id ? (
                  /* Edit mode */
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"auto 2fr 1fr 1fr",gap:10,marginBottom:10}}>
                      <div><label style={sl_}>Icon</label><input value={editForm.icon||""} onChange={e=>setEditForm({...editForm,icon:e.target.value})} style={{...si_,width:50,textAlign:"center"}} /></div>
                      <div><label style={sl_}>Name</label><input value={editForm.name||""} onChange={e=>setEditForm({...editForm,name:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
                      <div><label style={sl_}>Location</label><input value={editForm.location||""} onChange={e=>setEditForm({...editForm,location:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box"}} list="loc-list-edit" /></div>
                      <div><label style={sl_}>Shelf</label><input value={editForm.shelf||""} onChange={e=>setEditForm({...editForm,shelf:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
                    </div>
                    <datalist id="loc-list-edit">{locations.map(l=><option key={l} value={l}/>)}</datalist>
                    <div style={{marginBottom:10}}><label style={sl_}>Notes</label><input value={editForm.notes||""} onChange={e=>setEditForm({...editForm,notes:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <button onClick={()=>setEditId(null)} style={{...so_,fontSize:12}}>Cancel</button>
                      <button onClick={()=>handleSaveEdit(eq.id)} style={{...sb_,fontSize:12}}>💾 Save</button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:24}}>{eq.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:K.tx}}>{eq.name}</div>
                      {eq.shelf && <div style={{fontSize:11,color:K.txM}}>{eq.shelf}</div>}
                      {eq.notes && <div style={{fontSize:11,color:K.txD,marginTop:2}}>{eq.notes}</div>}
                    </div>
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>{setEditId(eq.id);setEditForm({...eq})}} style={{...sm_,width:26,height:26,fontSize:11}} title="Edit">✏️</button>
                      <button onClick={()=>handleDelete(eq.id)} style={{...sm_,width:26,height:26,fontSize:11,color:K.er}} title="Delete">✕</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {Object.keys(grouped).length === 0 && <div style={{textAlign:"center",padding:40,color:K.txD}}>No equipment found</div>}
    </PW>
  );
}

/* ── Stock AI Assistant (voice + text) ── */
function StockAssistant({ rawMaterials, sv, aLog }) {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError("Voice not supported. Use Chrome."); return; }
    const r = new SR();
    r.lang = "en-US"; r.continuous = false; r.interimResults = false;
    r.onresult = (e) => { setInput(e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recognitionRef.current = r;
    r.start(); setListening(true);
  };
  const stopListening = () => { recognitionRef.current?.stop(); setListening(false); };

  const parseCommand = (text) => {
    const t = text.toLowerCase().trim();
    // Find material by matching name/code
    let bestMatch = null, bestScore = 0;
    for (const rm of rawMaterials) {
      const names = [rm.name.toLowerCase(), rm.code.toLowerCase()];
      for (const n of names) {
        // Check if any significant words from material name appear in command
        const words = n.split(/[^a-z0-9]+/).filter(w => w.length > 2);
        const score = words.filter(w => t.includes(w)).length;
        if (score > bestScore) { bestScore = score; bestMatch = rm; }
      }
    }
    if (!bestMatch || bestScore === 0) return null;

    // Parse quantity: look for number followed by unit
    const qtyMatch = t.match(/([\d,.]+)\s*(kg|g|ml|l|liters?|grams?|kilos?|pcs|pieces?|units?|bottles?)/i);
    let qty = 0, unit = bestMatch.unit;
    if (qtyMatch) {
      qty = parseFloat(qtyMatch[1].replace(",",""));
      const u = qtyMatch[2].toLowerCase();
      if (u.startsWith("kg") || u.startsWith("kilo")) { qty *= 1000; unit = "g"; }
      else if (u === "l" || u.startsWith("liter")) { qty *= 1000; unit = "mL"; }
      else if (u.startsWith("g")) unit = "g";
      else if (u.startsWith("ml")) unit = "mL";
      else if (u.startsWith("pcs") || u.startsWith("piece") || u.startsWith("unit") || u.startsWith("bottle")) unit = "pcs";
    }

    // Parse lot number
    const lotMatch = t.match(/lot\s*(?:#|number|num|no)?[\s.:]*([a-z0-9-_]+)/i);
    const lotNumber = lotMatch ? lotMatch[1].toUpperCase() : "";

    // Determine action
    let action = "add_stock";
    if (/how much|check|what.*stock|current stock|do we have|available/i.test(t)) action = "check_stock";

    return { action, materialId: bestMatch.id, materialName: bestMatch.name, materialCode: bestMatch.code, quantity: qty, unit, lotNumber };
  };

  const processCommand = () => {
    if (!input.trim()) return;
    setError(""); setResult(null); setSaved(false);
    const parsed = parseCommand(input);
    if (!parsed) { setError("Could not find a matching material. Try including the material name (e.g. 'DPD Sulfate', 'sulfuric acid', 'EDTA')."); return; }
    if (parsed.action === "check_stock") {
      const rm = rawMaterials.find(m => m.id === parsed.materialId);
      const total = (rm?.entries||[]).reduce((s,e) => s + (e.remaining||0), 0);
      setResult({...parsed, action:"check_stock", summary: rm.name + ": " + total + " " + rm.unit + " in stock (" + (rm?.entries||[]).length + " lots)"});
      return;
    }
    if (!parsed.quantity) { setError("Could not detect quantity. Include a number with unit (e.g. '500g', '1kg', '2L')."); return; }
    setResult({...parsed, summary: "Add " + parsed.quantity + " " + parsed.unit + " of " + parsed.materialName + (parsed.lotNumber ? " (Lot: " + parsed.lotNumber + ")" : "")});
  };

  const applyAction = async () => {
    if (!result || result.action === "check_stock") return;
    const mats = rawMaterials.map(m => {
      if (m.id !== result.materialId) return m;
      const q = Number(result.quantity);
      return {...m, entries: [...(m.entries||[]), {
        id: "e-" + Date.now(),
        lotNumber: result.lotNumber || "LOT-" + Date.now().toString().slice(-6),
        quantity: q, remaining: q,
        purchaseDate: new Date().toISOString().slice(0,10),
        expirationDate: "",
      }]};
    });
    await sv("rawMaterials", mats);
    await aLog("Stock In (voice)", result.materialCode + " +" + result.quantity + " " + result.unit + (result.lotNumber ? " Lot " + result.lotNumber : ""));
    setSaved(true);
  };

  return (
    <div style={{background:"linear-gradient(135deg,#0057a8 0%,#00a5b5 100%)",borderRadius:14,padding:20,marginBottom:20,color:"white"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
        <span style={{fontSize:22}}>🤖</span>
        <div>
          <div style={{fontSize:15,fontWeight:700}}>Stock Assistant</div>
          <div style={{fontSize:12,opacity:0.8}}>Type or speak to manage inventory</div>
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={input} onChange={e=>{setInput(e.target.value);setResult(null);setSaved(false)}}
          onKeyDown={e=>e.key==="Enter"&&processCommand()}
          placeholder='"New shipment 500g DPD Sulfate lot 12345"'
          style={{flex:1,padding:"12px 16px",borderRadius:8,border:"2px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.15)",color:"white",fontSize:14,outline:"none",fontFamily:"inherit"}} />
        <button onClick={listening?stopListening:startListening} style={{width:48,height:48,borderRadius:24,border:"2px solid rgba(255,255,255,0.4)",background:listening?"#dc2626":"rgba(255,255,255,0.2)",color:"white",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} title="Voice input">
          {listening?"⏹":"🎤"}
        </button>
        <button onClick={processCommand} disabled={!input.trim()} style={{padding:"12px 20px",borderRadius:8,border:"none",background:"white",color:"#0057a8",fontWeight:700,fontSize:14,cursor:"pointer",opacity:!input.trim()?0.5:1}}>
          Go
        </button>
      </div>
      {listening && <div style={{marginTop:8,fontSize:13,display:"flex",alignItems:"center",gap:6}}>🔴 Listening... speak now</div>}
      {error && <div style={{marginTop:10,background:"rgba(255,0,0,0.2)",borderRadius:8,padding:"8px 12px",fontSize:13}}>{error}</div>}
      {result && !saved && (
        <div style={{marginTop:12,background:"rgba(255,255,255,0.15)",borderRadius:10,padding:14}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>📋 {result.summary}</div>
          {result.action!=="check_stock" && <button onClick={applyAction} style={{padding:"8px 20px",borderRadius:6,border:"none",background:"white",color:"#0057a8",fontWeight:700,fontSize:13,cursor:"pointer"}}>✅ Confirm & Apply</button>}
        </div>
      )}
      {saved && <div style={{marginTop:10,fontSize:14,fontWeight:600}}>✅ Done! Stock updated.</div>}
    </div>
  );
}

/* ── Raw Materials ── */
function RawMView({ S, sv, aLog, alerts, sub, setSub }) {
  const [tab, setTab] = useState("catalog");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({code:"",name:"",unit:"mL",minStock:0,vendor:""});
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [addEntry, setAddEntry] = useState(null);
  const [ef, setEf] = useState({lotNumber:"",quantity:"",purchaseDate:"",expirationDate:""});
  const [search, setSearch] = useState("");
  const mats = S.rawMaterials||[];
  const filtered = mats.filter(m => {
    const q = search.toLowerCase();
    return m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || (m.vendor||"").toLowerCase().includes(q);
  });

  const saveEdit = async (id) => {
    const updated = mats.map(m => m.id === id ? { ...m, ...editForm } : m);
    await sv("rawMaterials", updated);
    await aLog("Edited material", editForm.code + " — " + editForm.name);
    setEditId(null); setEditForm({});
  };

  return (
    <PW title="Raw Materials" sub="Manage catalog and inventory">
      {/* AI Stock Assistant */}
      <StockAssistant rawMaterials={mats} sv={sv} aLog={aLog} />
      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{marginBottom:16}}>
          {alerts.filter(a=>!a.type).map((a,i) => <Ab key={"s"+i} type="err" icon="⚠️"><strong>Low:</strong> {a.rm.code} — {a.total} {a.rm.unit} (min: {a.rm.minStock})</Ab>)}
          {alerts.filter(a=>a.type).map((a,i) => <Ab key={"e"+i} type={a.type==="expired"?"err":"warn"} icon={a.type==="expired"?"🚫":"⏰"}>{a.rm.code} Lot {a.entry.lotNumber} — {a.type==="expired"?"EXPIRED":a.days+" days left"}</Ab>)}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:16}}>
        {[["catalog","📋 Materials Catalog"],["stock","📦 Stock & Lots"]].map(([id,lbl]) => (
          <button key={id} onClick={()=>setTab(id)} style={{...so_,background:tab===id?K.hv:"transparent",color:tab===id?K.pri:K.txM,borderColor:tab===id?K.pri:K.bd,fontSize:13,padding:"8px 18px",fontWeight:tab===id?600:400}}>{lbl}</button>
        ))}
      </div>

      <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        <input placeholder="Search by code, name, or vendor..." value={search} onChange={e=>setSearch(e.target.value)} style={{...si_,flex:1,minWidth:200}} />
        <button onClick={()=>setShowAdd(!showAdd)} style={sb_}>+ New Material</button>
      </div>

      {/* Add new material form */}
      {showAdd && (
        <div style={{background:K.cd,borderRadius:12,padding:20,border:`1px solid ${K.pri}`,marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{fontSize:14,fontWeight:600,color:K.tx,marginBottom:12}}>New Raw Material</div>
          <div style={{display:"grid",gridTemplateColumns:"100px 2fr 1fr 80px 80px",gap:10}}>
            <div><label style={sl_}>Code</label><input value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="RM-013" style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
            <div><label style={sl_}>Description</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Material name" style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
            <div><label style={sl_}>Vendor</label><input value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})} placeholder="Supplier name" style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
            <div><label style={sl_}>Unit</label><select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} style={{...ss_,width:"100%",boxSizing:"border-box"}}>{["mL","L","g","kg","oz","lb","pcs"].map(u=><option key={u}>{u}</option>)}</select></div>
            <div><label style={sl_}>Min Stock</label><input type="number" value={form.minStock} onChange={e=>setForm({...form,minStock:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"flex-end"}}>
            <button onClick={()=>setShowAdd(false)} style={so_}>Cancel</button>
            <button onClick={async()=>{
              if(!form.code||!form.name) return;
              if(mats.find(m=>m.code===form.code)) return;
              await sv("rawMaterials",[...mats,{...form,id:"rm-"+Date.now(),minStock:Number(form.minStock),entries:[]}]);
              await aLog("Created material",form.code);
              setForm({code:"",name:"",unit:"mL",minStock:0,vendor:""}); setShowAdd(false);
            }} style={sb_}>Create</button>
          </div>
        </div>
      )}

      {/* ═══ CATALOG TAB ═══ */}
      {tab === "catalog" && (
        <div style={{background:K.cd,borderRadius:12,border:`1px solid ${K.bd}`,overflow:"hidden"}}>
          {/* Table header */}
          <div style={{display:"grid",gridTemplateColumns:"80px 2fr 1.5fr 60px 70px 80px 70px",gap:8,padding:"10px 16px",background:K.hv,fontSize:11,fontWeight:600,color:K.txD,textTransform:"uppercase",letterSpacing:0.5}}>
            <span>Code</span><span>Description</span><span>Vendor</span><span>Unit</span><span>Min Stock</span><span>In Stock</span><span></span>
          </div>
          {filtered.map((rm, i) => {
            const t = (rm.entries||[]).reduce((s,e)=>s+(e.remaining||0),0);
            const lo = t <= (rm.minStock||0);
            const isEdit = editId === rm.id;
            return (
              <div key={rm.id} style={{borderTop:`1px solid ${K.bd}`}}>
                {isEdit ? (
                  /* Edit row */
                  <div style={{padding:"10px 16px",background:K.pri+"08"}}>
                    <div style={{display:"grid",gridTemplateColumns:"80px 2fr 1.5fr 60px 70px auto",gap:8,alignItems:"end"}}>
                      <div><label style={sl_}>Code</label><input value={editForm.code||""} onChange={e=>setEditForm({...editForm,code:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box",fontSize:12,padding:"6px 8px"}} /></div>
                      <div><label style={sl_}>Description</label><input value={editForm.name||""} onChange={e=>setEditForm({...editForm,name:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box",fontSize:12,padding:"6px 8px"}} /></div>
                      <div><label style={sl_}>Vendor</label><input value={editForm.vendor||""} onChange={e=>setEditForm({...editForm,vendor:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box",fontSize:12,padding:"6px 8px"}} /></div>
                      <div><label style={sl_}>Unit</label><select value={editForm.unit||"mL"} onChange={e=>setEditForm({...editForm,unit:e.target.value})} style={{...ss_,width:"100%",boxSizing:"border-box",fontSize:12,padding:"4px 6px"}}>{["mL","L","g","kg","oz","lb","pcs"].map(u=><option key={u}>{u}</option>)}</select></div>
                      <div><label style={sl_}>Min</label><input type="number" value={editForm.minStock??""} onChange={e=>setEditForm({...editForm,minStock:Number(e.target.value)})} style={{...si_,width:"100%",boxSizing:"border-box",fontSize:12,padding:"6px 8px"}} /></div>
                      <div style={{display:"flex",gap:4,paddingBottom:2}}>
                        <button onClick={()=>saveEdit(rm.id)} style={{...sb_,fontSize:11,padding:"6px 10px"}}>💾</button>
                        <button onClick={()=>setEditId(null)} style={{...so_,fontSize:11,padding:"6px 10px"}}>✕</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* View row */
                  <div style={{display:"grid",gridTemplateColumns:"80px 2fr 1.5fr 60px 70px 80px 70px",gap:8,padding:"10px 16px",alignItems:"center",fontSize:13}}>
                    <span style={{fontWeight:600,color:K.pri}}>{rm.code}</span>
                    <span style={{color:K.tx}}>{rm.name}</span>
                    <span style={{color:K.txM,fontSize:12}}>{rm.vendor || "—"}</span>
                    <span style={{color:K.txM}}>{rm.unit}</span>
                    <span style={{color:K.txM}}>{rm.minStock}</span>
                    <span style={{fontWeight:600,color:lo?K.er:K.ok}}>{t} {rm.unit}</span>
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>{setEditId(rm.id);setEditForm({code:rm.code,name:rm.name,vendor:rm.vendor||"",unit:rm.unit,minStock:rm.minStock})}} style={{...sm_,width:26,height:26,fontSize:10}} title="Edit">✏️</button>
                      <button onClick={async()=>{await sv("rawMaterials",mats.filter(m=>m.id!==rm.id));await aLog("Deleted material",rm.code)}} style={{...sm_,width:26,height:26,fontSize:10,color:K.er}} title="Delete">✕</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{padding:30,textAlign:"center",color:K.txD}}>No materials found</div>}
        </div>
      )}

      {/* ═══ STOCK TAB ═══ */}
      {tab === "stock" && filtered.map(rm => {
        const t = (rm.entries||[]).reduce((s,e)=>s+(e.remaining||0),0);
        const lo = t <= (rm.minStock||0);
        const op = sub === rm.id;
        return (
          <div key={rm.id} style={{background:K.cd,borderRadius:12,border:`1px solid ${lo?K.er+"44":K.bd}`,overflow:"hidden",marginBottom:8,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
            <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",background:op?K.hv:"transparent"}} onClick={()=>setSub(op?null:rm.id)}>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:K.tx}}>{rm.code} — {rm.name}</div>
                <div style={{fontSize:12,color:K.txM}}>{rm.unit} | Min: {rm.minStock}{rm.vendor ? ` | Vendor: ${rm.vendor}` : ""}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {lo && <Tg c="#dc2626" bg="#fef2f2">LOW</Tg>}
                <span style={{fontSize:18,fontWeight:700,color:lo?K.er:K.ok}}>{t}</span>
                <span style={{color:K.txD}}>{op?"▲":"▼"}</span>
              </div>
            </div>
            {op && (
              <div style={{padding:"0 16px 16px",borderTop:`1px solid ${K.bd}`}}>
                <div style={{display:"flex",justifyContent:"space-between",margin:"12px 0 8px"}}>
                  <span style={{fontSize:13,fontWeight:600,color:K.txM}}>Stock Entries (FIFO)</span>
                  <button onClick={()=>setAddEntry(addEntry===rm.id?null:rm.id)} style={{...so_,fontSize:11,padding:"3px 10px"}}>+ Add Stock</button>
                </div>

                {addEntry === rm.id && (
                  <div style={{background:K.hv,borderRadius:10,padding:14,marginBottom:10,border:`1px solid ${K.pri}`}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
                      <div><label style={sl_}>Lot #</label><input value={ef.lotNumber} onChange={e=>setEf({...ef,lotNumber:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
                      <div><label style={sl_}>Quantity</label><input type="number" value={ef.quantity} onChange={e=>setEf({...ef,quantity:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
                      <div><label style={sl_}>Purchase Date</label><input type="date" value={ef.purchaseDate} onChange={e=>setEf({...ef,purchaseDate:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
                      <div><label style={sl_}>Expiration</label><input type="date" value={ef.expirationDate} onChange={e=>setEf({...ef,expirationDate:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box"}} /></div>
                    </div>
                    <div style={{display:"flex",gap:8,marginTop:10,justifyContent:"flex-end"}}>
                      <button onClick={()=>setAddEntry(null)} style={{...so_,fontSize:12}}>Cancel</button>
                      <button onClick={async()=>{
                        if(!ef.lotNumber||!ef.quantity) return;
                        const q = Number(ef.quantity);
                        await sv("rawMaterials",mats.map(m=>m.id===rm.id?{...m,entries:[...(m.entries||[]),{id:"e-"+Date.now(),lotNumber:ef.lotNumber,quantity:q,remaining:q,purchaseDate:ef.purchaseDate,expirationDate:ef.expirationDate}]}:m));
                        await aLog("Stock in",rm.code+" Lot "+ef.lotNumber+": +"+q+" "+rm.unit);
                        setEf({lotNumber:"",quantity:"",purchaseDate:"",expirationDate:""}); setAddEntry(null);
                      }} style={{...sb_,fontSize:12}}>Add Stock</button>
                    </div>
                  </div>
                )}

                {!(rm.entries||[]).length ? (
                  <div style={{padding:16,textAlign:"center",color:K.txD,fontSize:13}}>No stock entries — click "+ Add Stock"</div>
                ) : (
                  <div style={{fontSize:12}}>
                    <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr 0.8fr 0.8fr",gap:4,padding:"6px 0",color:K.txD,fontWeight:600}}>
                      <span>Lot #</span><span>Purchased</span><span>Expires</span><span>Received</span><span>Remaining</span>
                    </div>
                    {rm.entries.map((e,i) => {
                      const expired = e.expirationDate && new Date(e.expirationDate) < new Date();
                      const expiring = e.expirationDate && !expired && Math.ceil((new Date(e.expirationDate)-new Date())/86400000) <= 30;
                      return (
                        <div key={i} style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr 0.8fr 0.8fr",gap:4,padding:"7px 0",borderTop:`1px solid ${K.bd}`,color:expired?K.er:K.tx,opacity:e.remaining<=0?0.35:1}}>
                          <span style={{fontWeight:600}}>{e.lotNumber}</span>
                          <span>{e.purchaseDate||"—"}</span>
                          <span>{e.expirationDate||"—"} {expired?"🚫":expiring?"⚠️":""}</span>
                          <span>{e.quantity}</span>
                          <span style={{fontWeight:600}}>{e.remaining}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {tab === "stock" && filtered.length === 0 && <div style={{textAlign:"center",padding:40,color:K.txD}}>No materials found</div>}
    </PW>
  );
}

/* ── Production ── */
function ProdView({ S, sv, aLog, getStock, sub, setSub }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ productId:"", quantity:1 });
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const lots = S.lots || [];
  const bom = form.productId ? (S.bom[form.productId] || []) : [];
  const calc = useMemo(() => bom.map(it => {
    const rm = (S.rawMaterials || []).find(r => r.id === it.rawMaterialId);
    const need = it.qtyPerUnit * form.quantity;
    const stock = getStock(it.rawMaterialId);
    return { ...it, rm, need, stock, ok: stock >= need };
  }), [bom, form.quantity, S.rawMaterials, getStock]);
  const allOk = calc.every(c => c.ok);

  const createLot = async () => {
    setError("");
    if (!form.productId) { setError("Please select a product."); return; }
    if (!bom.length) { setError("This product has no BOM defined. Go to the product page and set up the Bill of Materials first."); return; }
    if (!allOk) { setError("WARNING: Not enough stock for some materials. Add stock in Raw Materials before creating this lot."); return; }
    setCreating(true);
    const nm = (S.rawMaterials || []).map(m => ({ ...m, entries:(m.entries||[]).map(e => ({...e})) }));
    const used = [];
    for (const it of bom) {
      let need = it.qtyPerUnit * form.quantity;
      const rm = nm.find(r => r.id === it.rawMaterialId);
      if (!rm) continue;
      for (const e of (rm.entries||[]).filter(e => e.remaining > 0).sort((a,b) => (a.purchaseDate||"").localeCompare(b.purchaseDate||""))) {
        if (need <= 0) break;
        const take = Math.min(e.remaining, need);
        e.remaining -= take; need -= take;
        used.push({ rawMaterialId:rm.id, code:rm.code, name:rm.name, lotNumber:e.lotNumber, qty:take, unit:rm.unit });
      }
    }
    const prod = S.products.find(x => x.id === form.productId);
    const ln = "LOT-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + String(lots.length+1).padStart(3,"0");
    await sv("rawMaterials", nm);
    await sv("lots", [{ id:"lot-"+Date.now(), lotNumber:ln, productId:form.productId, productName:prod?.name, productBrand:prod?.brand, quantity:Number(form.quantity), date:new Date().toISOString(), status:"pending_qc", materialsUsed:used }, ...lots]);
    await aLog("Production", ln + " — " + prod?.name + " x" + form.quantity);
    setForm({ productId:"", quantity:1 }); setShowNew(false); setCreating(false);
  };

  return (
    <PW title="Production" sub="Create lots and track consumption">
      <button onClick={() => { setShowNew(!showNew); setError(""); }} style={{ ...sb_, marginBottom:20 }}>+ New Lot</button>
      {showNew && (
        <div style={{ background:K.cd, borderRadius:14, padding:24, border:`1px solid ${K.pri}`, marginBottom:24 }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:K.tx, margin:"0 0 16px" }}>🏭 New Production Lot</h3>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>
            <div><label style={sl_}>Product</label>
              <select value={form.productId} onChange={e => { setForm({...form,productId:e.target.value}); setError(""); }} style={{ ...ss_, width:"100%", boxSizing:"border-box" }}>
                <option value="">— Select Product —</option>
                {S.products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.brand})</option>)}
              </select>
            </div>
            <div><label style={sl_}>Quantity</label>
              <input type="number" min="1" value={form.quantity} onChange={e => setForm({...form,quantity:Number(e.target.value)})} style={{ ...si_, width:"100%", boxSizing:"border-box" }} />
            </div>
          </div>

          {/* BOM Requirements preview */}
          {form.productId && bom.length > 0 && (
            <div style={{ marginTop:18, background:K.hv, borderRadius:10, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:600, color:K.txM, marginBottom:8 }}>📐 Material Requirements:</div>
              {calc.map((c, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderTop:i?`1px solid ${K.bd}`:"none", fontSize:13 }}>
                  <span><span style={{ fontWeight:600, color:K.prL }}>{c.rm?.code}</span> {c.rm?.name}</span>
                  <span>Need: <strong>{c.need}</strong> | Have: <span style={{ color:c.ok?K.ok:K.er, fontWeight:600 }}>{c.stock}</span> {c.ok ? "✅" : "❌"}</span>
                </div>
              ))}
              {!allOk && <Ab type="err" icon="⚠️">Not enough stock for some materials. Add stock before creating.</Ab>}
              {allOk && <Ab type="info" icon="✅">All materials available — ready to produce!</Ab>}
            </div>
          )}

          {form.productId && bom.length === 0 && (
            <Ab type="warn" icon="📐">No BOM defined for this product. Go to the product page to set up the Bill of Materials first.</Ab>
          )}

          {/* Error message */}
          {error && <Ab type="err" icon="❌">{error}</Ab>}

          <div style={{ display:"flex", gap:10, marginTop:18, justifyContent:"flex-end" }}>
            <button onClick={() => { setShowNew(false); setError(""); }} style={so_}>Cancel</button>
            <button onClick={createLot} disabled={creating || !form.productId || !bom.length || !allOk}
              style={{ ...sb_, opacity:(form.productId && bom.length && allOk) ? 1 : 0.4 }}>
              {creating ? "Creating..." : "🏭 Create Lot & Deduct Stock"}
            </button>
          </div>
        </div>
      )}

      {/* Lots list */}
      {lots.map(l => {
        const op = sub === l.id;
        return (
          <div key={l.id} style={{ background:K.cd, borderRadius:12, border:`1px solid ${l.status==="rejected"?K.er+"44":l.status==="approved"?K.ok+"44":K.wr+"44"}`, overflow:"hidden", marginBottom:8 }}>
            <div style={{ padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer" }} onClick={() => setSub(op?null:l.id)}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:K.tx }}>{l.lotNumber}</div>
                <div style={{ fontSize:12, color:K.txM }}>{l.productName} x{l.quantity}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Tg c={l.status==="approved"?"#16a34a":l.status==="rejected"?"#dc2626":"#b45309"} bg={l.status==="approved"?"#dcfce7":l.status==="rejected"?"#fef2f2":"#3b291a"}>
                  {l.status==="pending_qc"?"⏳ Pending QC":l.status==="approved"?"✓ Approved":"✕ Rejected"}
                </Tg>
                <span style={{ fontSize:11, color:K.txD }}>{new Date(l.date).toLocaleDateString("en-US")}</span>
              </div>
            </div>
            {op && l.materialsUsed && (
              <div style={{ padding:"0 16px 16px", borderTop:`1px solid ${K.bd}` }}>
                <div style={{ fontSize:12, fontWeight:600, color:K.txM, margin:"10px 0 6px" }}>Materials consumed:</div>
                {l.materialsUsed.map((m, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", fontSize:12, borderTop:i?`1px solid ${K.bd}`:"none" }}>
                    <span><span style={{ color:K.prL, fontWeight:600 }}>{m.code}</span> {m.name} (Lot: {m.lotNumber})</span>
                    <span style={{ fontWeight:600 }}>{m.qty} {m.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {lots.length === 0 && <div style={{ textAlign:"center", padding:40, color:K.txD }}>No production lots yet</div>}
    </PW>
  );
}

/* ── QC ── */
function QCView({ S, sv, aLog, sub, setSub, user }) {
  const lots=S.lots||[];const pending=lots.filter(l=>l.status==="pending_qc");const history=lots.filter(l=>l.status==="approved"||l.status==="rejected");
  const [tab,setTab]=useState("pending");const [tf,setTf]=useState({});const [eS,setES]=useState(null);const [sL,setSL]=useState([]);
  const submitQC=async(lot,results,verdict)=>{await sv("qcResults",{...S.qcResults,[lot.id]:{lotNumber:lot.lotNumber,productName:lot.productName,results,verdict,tester:user.name,date:new Date().toISOString()}});await sv("lots",lots.map(l=>l.id===lot.id?{...l,status:verdict}:l));await aLog("QC "+verdict,lot.lotNumber);setTf({})};
  const display=tab==="pending"?pending:history;
  return(
    <PW title="Quality Control" sub="Test lots and manage specs">
      <div style={{display:"flex",gap:4,marginBottom:20}}>{[["pending","Pending ("+pending.length+")"],["history","History"],["specs","Specs"]].map(([id,lbl])=><button key={id} onClick={()=>{setTab(id);setES(null)}} style={{...so_,background:tab===id?K.hv:"transparent",color:tab===id?K.prL:K.txM,borderColor:tab===id?K.pri:K.bd,fontSize:13,padding:"8px 16px"}}>{lbl}</button>)}</div>
      {(tab==="pending"||tab==="history")&&<>{display.length===0&&<div style={{textAlign:"center",padding:50,color:K.txD}}>{tab==="pending"?"No lots pending":"No records"}</div>}{display.map(lot=>{const specs=S.qcSpecs?.[lot.productId]||[];const qr=S.qcResults?.[lot.id];const isO=sub===lot.id;const isT=tf.lotId===lot.id;return(<div key={lot.id} style={{background:K.cd,borderRadius:12,border:`1px solid ${lot.status==="rejected"?K.er+"66":lot.status==="approved"?K.ok+"44":K.wr+"44"}`,overflow:"hidden",marginBottom:10}}><div style={{padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setSub(isO?null:lot.id)}><div style={{display:"flex",alignItems:"center",gap:14}}><div style={{width:42,height:42,borderRadius:10,background:K.hv,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🧪</div><div><div style={{fontSize:14,fontWeight:600,color:K.tx}}>{lot.lotNumber}</div><div style={{fontSize:12,color:K.txM}}>{lot.productName} x{lot.quantity}</div></div></div><Tg c={lot.status==="approved"?"#16a34a":lot.status==="rejected"?"#dc2626":"#b45309"} bg={lot.status==="approved"?"#dcfce7":lot.status==="rejected"?"#fef2f2":"#3b291a"}>{lot.status==="pending_qc"?"⏳Pending":lot.status==="approved"?"✓Approved":"✕Rejected"}</Tg></div>
        {isO&&<div style={{padding:"0 18px 18px",borderTop:`1px solid ${K.bd}`}}>
          {qr&&<div style={{marginTop:14}}><div style={{fontSize:13,fontWeight:600,color:K.txM,marginBottom:8}}>Results — {qr.tester}</div>{(qr.results||[]).map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderTop:i?`1px solid ${K.bd}`:"none",fontSize:13}}><span>{r.name}</span><span style={{fontWeight:600,color:r.pass?K.ok:K.er}}>{r.value} {r.unit} {r.pass?"✓":"✕"}</span></div>)}</div>}
          {lot.status==="pending_qc"&&!isT&&<button onClick={()=>setTf({lotId:lot.id,results:specs.map(s=>({...s,value:"",pass:false}))})} style={{...sb_,marginTop:14,fontSize:13}}>🧪 Run QC</button>}
          {isT&&<div style={{marginTop:14,background:K.hv,borderRadius:10,padding:16}}>
            <div style={{fontSize:14,fontWeight:600,color:K.tx,marginBottom:14}}>🧪 QC Test</div>
            {specs.length===0&&<Ab type="warn" icon="📐">No specs defined.</Ab>}
            {tf.results?.map((r,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:13,color:K.tx,minWidth:130}}>{r.name}</span>
              {r.type==="visual"?<select value={r.value} onChange={e=>{const nr=[...tf.results];nr[i]={...nr[i],value:e.target.value,pass:e.target.value==="pass"};setTf({...tf,results:nr})}} style={{...ss_,flex:1}}><option value="">—</option><option value="pass">✓ Pass</option><option value="fail">✕ Fail</option></select>
              :<><input type="number" step="0.01" value={r.value} onChange={e=>{const v=Number(e.target.value);const nr=[...tf.results];nr[i]={...nr[i],value:e.target.value,pass:v>=r.min&&v<=r.max};setTf({...tf,results:nr})}} style={{...si_,flex:1}}/><span style={{fontSize:12,color:K.txD}}>{r.unit} ({r.min}-{r.max})</span><span style={{fontSize:16}}>{r.value?(r.pass?"✅":"❌"):"⬜"}</span></>}
            </div>)}
            <div style={{display:"flex",gap:10,marginTop:14,justifyContent:"flex-end"}}><button onClick={()=>setTf({})} style={so_}>Cancel</button><button onClick={()=>submitQC(lot,tf.results.map(r=>({name:r.name,value:r.value,unit:r.unit||"",pass:r.pass})),tf.results.every(r=>r.pass)?"approved":"rejected")} style={{...sb_,background:tf.results?.every(r=>r.pass)?K.ok:K.er}}>{tf.results?.every(r=>r.pass)?"✓ Approve":"✕ Reject"}</button></div>
          </div>}
        </div>}</div>)})}</>}
      {tab==="specs"&&<div>{S.products.map(prod=>{const specs=S.qcSpecs?.[prod.id]||[];const isE=eS===prod.id;return(<div key={prod.id} style={{background:K.cd,borderRadius:10,border:`1px solid ${K.bd}`,marginBottom:8,overflow:"hidden"}}><div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>{if(isE)setES(null);else{setES(prod.id);setSL([...specs])}}}><span style={{fontSize:13,color:K.tx}}>{prod.emoji} {prod.name} — {prod.brand}</span><span style={{fontSize:12,color:specs.length?K.ok:K.txD}}>{specs.length} params</span></div>
        {isE&&<div style={{padding:"0 16px 16px",borderTop:`1px solid ${K.bd}`}}>{sL.map((sp,i)=><div key={i} style={{display:"flex",gap:8,alignItems:"center",marginTop:8}}><input value={sp.name} onChange={e=>{const n=[...sL];n[i]={...n[i],name:e.target.value};setSL(n)}} placeholder="Param" style={{...si_,flex:2}}/><select value={sp.type||"range"} onChange={e=>{const n=[...sL];n[i]={...n[i],type:e.target.value};setSL(n)}} style={{...ss_,width:90}}><option value="range">Range</option><option value="visual">Visual</option></select>{(sp.type||"range")==="range"?<><input type="number" value={sp.min??""} onChange={e=>{const n=[...sL];n[i]={...n[i],min:Number(e.target.value)};setSL(n)}} placeholder="Min" style={{...si_,width:60}}/><input type="number" value={sp.max??""} onChange={e=>{const n=[...sL];n[i]={...n[i],max:Number(e.target.value)};setSL(n)}} placeholder="Max" style={{...si_,width:60}}/><input value={sp.unit||""} onChange={e=>{const n=[...sL];n[i]={...n[i],unit:e.target.value};setSL(n)}} placeholder="Unit" style={{...si_,width:50}}/></>:<input value={sp.expected||""} onChange={e=>{const n=[...sL];n[i]={...n[i],expected:e.target.value};setSL(n)}} placeholder="Expected" style={{...si_,flex:1}}/>}<button onClick={()=>setSL(sL.filter((_,j)=>j!==i))} style={{...sm_,color:K.er}}>✕</button></div>)}<div style={{display:"flex",gap:8,marginTop:12,justifyContent:"space-between"}}><button onClick={()=>setSL([...sL,{id:"q"+Date.now(),name:"",min:0,max:0,unit:"",type:"range"}])} style={{...so_,fontSize:12}}>+ Param</button><button onClick={async()=>{await sv("qcSpecs",{...S.qcSpecs,[prod.id]:sL});await aLog("QC specs",prod.name);setES(null)}} style={{...sb_,fontSize:12}}>💾 Save</button></div></div>}</div>)})}</div>}
    </PW>
  );
}

/* ── Label Printer (Epson CW-C4000) ── */
const LABEL_SIZES = [
  { id:"4x3", name:'4" × 3"', w:4, h:3, desc:"Large label" },
  { id:"2.25x1.25", name:'2.25" × 1.25"', w:2.25, h:1.25, desc:"Small label (landscape)" },
];

function LabelPrintPanel({ product, S, sv, aLog }) {
  const p = product;
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState("4x3");
  const [lotId, setLotId] = useState("");
  const [qty, setQty] = useState(1);
  const [lotText, setLotText] = useState("");
  const [expText, setExpText] = useState("");
  const [configMode, setConfigMode] = useState(false);
  const previewRef = useRef(null);
  const labelSize = LABEL_SIZES.find(l => l.id === size);

  const tplKey = p.id + "__" + size;
  const templates = S.labelTemplates || {};
  const tpl = templates[tplKey] || null;
  const defaultFields = [
    { id:"lot", label:"LOT", x:50, y:60, fontSize:12, fontWeight:"bold", color:"#000" },
    { id:"exp", label:"EXP", x:50, y:72, fontSize:11, fontWeight:"normal", color:"#000" },
  ];
  const [overlayFields, setOverlayFields] = useState(tpl?.fields || defaultFields);
  const [dragging, setDragging] = useState(null);

  useEffect(() => { const t = templates[p.id+"__"+size]; setOverlayFields(t?.fields || defaultFields); }, [size]);
  const lot = (S.lots||[]).find(l => l.id === lotId);
  useEffect(() => { if(lot) setLotText(lot.lotNumber||""); }, [lotId]);

  const handleUpload = (e) => {
    const file = e.target.files[0]; if(!file) return;
    setPrintStatus("⏳ Processing upload...");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      let data = ev.target.result;
      if (file.type.startsWith("image/")) {
        // Image file — resize and save
        const img = new Image();
        img.onload = async () => {
          const c = document.createElement("canvas");
          c.width = Math.min(img.width, 1200); c.height = img.height*(c.width/img.width);
          c.getContext("2d").drawImage(img,0,0,c.width,c.height);
          data = c.toDataURL("image/png",0.9);
          await sv("labelTemplates", {...templates,[tplKey]:{imageData:data,isPdf:false,fields:overlayFields}});
          await aLog("Uploaded label", p.brand+" "+size);
          setPrintStatus("✅ Template uploaded!");
        }; img.src = data;
      } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        // PDF file — convert to image using pdf.js
        try {
          setPrintStatus("⏳ Converting PDF to image...");
          // Load pdf.js from CDN if not loaded
          if (!window.pdfjsLib) {
            await new Promise((resolve, reject) => {
              const s = document.createElement("script");
              s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
              s.onload = resolve; s.onerror = reject;
              document.head.appendChild(s);
            });
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          }
          // Convert base64 to array buffer
          const raw = atob(data.split(",")[1]);
          const arr = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
          // Render first page
          const pdf = await window.pdfjsLib.getDocument({data: arr}).promise;
          const page = await pdf.getPage(1);
          const scale = 3; // 3x for high quality
          const viewport = page.getViewport({scale});
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width; canvas.height = viewport.height;
          await page.render({canvasContext: canvas.getContext("2d"), viewport}).promise;
          data = canvas.toDataURL("image/png", 0.95);
          await sv("labelTemplates", {...templates,[tplKey]:{imageData:data,isPdf:false,fields:overlayFields}});
          await aLog("Uploaded label (PDF→PNG)", p.brand+" "+size);
          setPrintStatus("✅ PDF converted to image and saved!");
        } catch(err) {
          setPrintStatus("❌ PDF conversion failed: " + err.message);
        }
      }
    }; reader.readAsDataURL(file); e.target.value="";
  };

  const savePositions = async () => {
    await sv("labelTemplates", {...templates,[tplKey]:{...(tpl||{}),fields:overlayFields}});
    setConfigMode(false); await aLog("Saved label positions", p.brand+" "+size);
  };

  const handlePreviewClick = (e) => {
    if(!configMode||dragging===null) return;
    const rect = previewRef.current?.getBoundingClientRect(); if(!rect) return;
    const x = ((e.clientX-rect.left)/rect.width)*100;
    const y = ((e.clientY-rect.top)/rect.height)*100;
    const nf = [...overlayFields]; nf[dragging] = {...nf[dragging], x:Math.round(x), y:Math.round(y)};
    setOverlayFields(nf); setDragging(null);
  };

  const getVal = (f) => f.id==="lot" ? (lotText||"LOT: ________") : (expText||"EXP: ________");

  const [printStatus, setPrintStatus] = useState("");
  const handlePrint = async () => {
    const bgImg = tpl?.imageData || null;
    if (!bgImg) { setPrintStatus("❌ No template uploaded"); return; }

    if (bgImg.startsWith("data:application/pdf")) {
      // PDF template — download with LOT/EXP overlay using pdf-lib
      setPrintStatus("⏳ Generating PDF...");
      try {
        if (!window.PDFLib) {
          await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
        }
        const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
        const raw = atob(bgImg.split(",")[1]);
        const arr = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);

        // Load and copy original PDF
        const srcDoc = await PDFDocument.load(arr);
        const srcPage = srcDoc.getPage(0);
        const { width: srcW, height: srcH } = srcPage.getSize();

        // Target size: exact label dimensions in PDF points (72 pts/inch)
        const tgtW = W * 72;
        const tgtH = H * 72;

        const outDoc = await PDFDocument.create();
        const font = await outDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await outDoc.embedFont(StandardFonts.HelveticaBold);

        for (let i = 0; i < qty; i++) {
          // Create page with exact label size
          const pg = outDoc.addPage([tgtW, tgtH]);

          // Embed the source PDF page as image (XObject)
          const [embeddedPage] = await outDoc.embedPdf(srcDoc, [0]);

          // Scale source to fit target exactly
          const scaleX = tgtW / embeddedPage.width;
          const scaleY = tgtH / embeddedPage.height;
          pg.drawPage(embeddedPage, { x: 0, y: 0, xScale: scaleX, yScale: scaleY });

          // Draw LOT/EXP overlay
          overlayFields.forEach(f => {
            const val = f.id === "lot" ? (lotText ? "LOT: " + lotText : "") : (expText ? "EXP: " + expText : "");
            if (!val) return;
            const fnt = f.fontWeight === "bold" ? fontBold : font;
            const sz = f.fontSize || 12;
            const tw = fnt.widthOfTextAtSize(val, sz);
            const x = (f.x / 100) * tgtW - tw / 2;
            const y = tgtH - (f.y / 100) * tgtH - sz / 2;
            pg.drawText(val, { x, y, size: sz, font: fnt, color: rgb(0, 0, 0) });
          });
        }

        const pdfBytes = await outDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "label_" + p.brand + "_" + (lotText || "batch") + ".pdf";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        setPrintStatus("✅ PDF " + W + "x" + H + " inches — Open and print on Epson.");
      } catch(e) {
        setPrintStatus("❌ Error: " + e.message);
      }
    } else {
      // Image template — just download as image
      const a = document.createElement("a");
      a.href = bgImg;
      a.download = "label_" + p.brand + "_" + (lotText || "batch") + ".png";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setPrintStatus("✅ Image downloaded.");
    }
    aLog("Label", p.brand + " " + (lotText || "") + " " + qty + "x " + size);
  };

  const PXI = 80;
  const hasTemplate = tpl?.imageData;

  return (
    <div style={{background:K.cd,borderRadius:14,border:`1px solid ${hasTemplate?K.ok+"44":K.wr+"44"}`,marginBottom:24,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
      {/* Header - always visible */}
      <div onClick={()=>setOpen(!open)} style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",background:K.hv}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>🖨️</span>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:K.tx}}>Quick Print — {p.brand}</div>
            <div style={{fontSize:12,color:K.txM}}>Upload template, fill lot & expiration, print to Epson CW-C4000</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {hasTemplate ? <Tg c="#16a34a" bg="#dcfce7">✓ Template Ready</Tg> : <Tg c="#d97706" bg="#fef3c7">⚠ No Template</Tg>}
          <span style={{color:K.txD,fontSize:16}}>{open?"▲":"▼"}</span>
        </div>
      </div>

      {/* Expanded content */}
      {open && (
        <div style={{padding:20,borderTop:`1px solid ${K.bd}`}}>
          {/* Size selector */}
          <div style={{display:"flex",gap:10,marginBottom:16}}>
            {LABEL_SIZES.map(ls => (
              <div key={ls.id} onClick={()=>setSize(ls.id)} style={{
                flex:1,padding:"10px",borderRadius:8,cursor:"pointer",textAlign:"center",
                border:`2px solid ${size===ls.id?K.pri:K.bd}`,background:size===ls.id?K.pri+"10":K.cd,
              }}>
                <div style={{fontSize:14,fontWeight:700,color:size===ls.id?K.pri:K.tx}}>{ls.name}</div>
                <div style={{fontSize:10,color:K.txM}}>{ls.desc}</div>
              </div>
            ))}
          </div>

          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            {/* Left: Template + form */}
            <div style={{flex:1,minWidth:280}}>
              {/* Template */}
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:13,fontWeight:600,color:K.tx}}>📄 Label Template ({size})</span>
                  <div style={{display:"flex",gap:6}}>
                    {tpl && <button onClick={()=>setConfigMode(!configMode)} style={{...so_,fontSize:11,padding:"3px 8px",color:configMode?K.pri:K.txM}}>{configMode?"🎯 Positioning...":"⚙️ Position"}</button>}
                    {tpl && <button onClick={async()=>{const nt={...templates};delete nt[tplKey];await sv("labelTemplates",nt);await aLog("Deleted label template",p.brand+" "+size);setOverlayFields(defaultFields);setConfigMode(false)}} style={{...so_,fontSize:11,padding:"3px 8px",color:K.er,borderColor:K.er+"66"}} title="Delete template">🗑️ Delete</button>}
                    <label style={{...so_,fontSize:11,padding:"3px 8px",cursor:"pointer"}}>⬆ Upload<input type="file" accept="image/*,.pdf" onChange={handleUpload} style={{display:"none"}} /></label>
                  </div>
                </div>

                {!tpl ? (
                  <label style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"30px 16px",borderRadius:10,border:`2px dashed ${K.bd}`,cursor:"pointer",color:K.txM}}>
                    <span style={{fontSize:28}}>📄</span>
                    <span style={{fontSize:13,fontWeight:600}}>Upload blank label (PNG, JPG, or PDF)</span>
                    <input type="file" accept="image/*,.pdf" onChange={handleUpload} style={{display:"none"}} />
                  </label>
                ) : (
                  <div ref={previewRef} onClick={handlePreviewClick} style={{
                    position:"relative",width:labelSize.w*PXI,height:labelSize.h*PXI,
                    border:`1px solid ${K.bd}`,borderRadius:6,overflow:"hidden",background:"#fff",
                    cursor:configMode&&dragging!==null?"crosshair":"default",
                  }}>
                    {tpl.isPdf ? <iframe src={tpl.imageData} style={{width:"100%",height:"100%",border:"none"}} title="Label"/> : <img src={tpl.imageData} style={{width:"100%",height:"100%",objectFit:"contain"}} alt="Label"/>}
                    {overlayFields.map((f,i) => (
                      <div key={i} style={{
                        position:"absolute",left:f.x+"%",top:f.y+"%",transform:"translate(-50%,-50%)",
                        fontSize:f.fontSize*(PXI/72),fontWeight:f.fontWeight,color:f.color,whiteSpace:"nowrap",
                        background:configMode?"rgba(255,255,0,0.3)":"rgba(255,255,255,0.85)",
                        padding:configMode?"2px 6px":"1px 4px",borderRadius:3,
                        border:configMode?`1px dashed ${K.pri}`:"none",
                        pointerEvents:configMode?"auto":"none",
                      }} onClick={e=>{if(configMode){e.stopPropagation();setDragging(i)}}}>
                        {configMode?(dragging===i?"📍 Click to place":`⊕ ${f.label}`):getVal(f)}
                      </div>
                    ))}
                  </div>
                )}

                {configMode && (
                  <div style={{marginTop:8,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:K.txM}}>Click field → click on label.</span>
                    {overlayFields.map((f,i) => (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:4,background:K.hv,borderRadius:6,padding:"2px 6px"}}>
                        <span style={{fontSize:11,fontWeight:600}}>{f.label}</span>
                        <input type="number" value={f.fontSize} onChange={e=>{const n=[...overlayFields];n[i]={...n[i],fontSize:Number(e.target.value)};setOverlayFields(n)}} style={{...si_,width:36,padding:"1px 3px",fontSize:11}} />
                        <span style={{fontSize:9,color:K.txD}}>pt</span>
                        <button onClick={()=>setOverlayFields(overlayFields.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",color:K.er,cursor:"pointer",fontSize:11,padding:"0 2px"}} title="Remove field">✕</button>
                      </div>
                    ))}
                    {!overlayFields.find(f=>f.id==="lot") && <button onClick={()=>setOverlayFields([...overlayFields,{id:"lot",label:"LOT",x:50,y:60,fontSize:12,fontWeight:"bold",color:"#000"}])} style={{...so_,fontSize:10,padding:"2px 8px"}}>+ LOT</button>}
                    {!overlayFields.find(f=>f.id==="exp") && <button onClick={()=>setOverlayFields([...overlayFields,{id:"exp",label:"EXP",x:50,y:72,fontSize:11,fontWeight:"normal",color:"#000"}])} style={{...so_,fontSize:10,padding:"2px 8px"}}>+ EXP</button>}
                    <button onClick={savePositions} style={{...sb_,fontSize:11,padding:"3px 10px"}}>💾 Save</button>
                  </div>
                )}
              </div>

              {/* Fill-in + print */}
              <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                {overlayFields.some(f=>f.id==="lot") && <div style={{flex:1,minWidth:150}}>
                  <label style={sl_}>Lot Number</label>
                  <input value={lotText} onChange={e=>setLotText(e.target.value)} placeholder="LOT-20260405-001" style={{...si_,width:"100%",boxSizing:"border-box",fontWeight:600}} />
                </div>}
                {overlayFields.some(f=>f.id==="exp") && <div style={{flex:1,minWidth:150}}>
                  <label style={sl_}>Expiration Date</label>
                  <input value={expText} onChange={e=>setExpText(e.target.value)} placeholder="04/05/2027" style={{...si_,width:"100%",boxSizing:"border-box",fontWeight:600}} />
                </div>}
                <div style={{width:80}}>
                  <label style={sl_}>Qty</label>
                  <input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))} style={{...si_,width:"100%",boxSizing:"border-box",fontWeight:600}} />
                </div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <select value={lotId} onChange={e=>setLotId(e.target.value)} style={{...ss_,flex:1}}>
                  <option value="">— Auto-fill from lot —</option>
                  {(S.lots||[]).filter(l=>l.productId===p.id).map(l=><option key={l.id} value={l.id}>{l.lotNumber}</option>)}
                </select>
                <button onClick={handlePrint} disabled={!hasTemplate} style={{...sb_,padding:"10px 24px",fontSize:14,opacity:hasTemplate?1:0.4}}>
                  🖨️ Download Label PDF
                </button>
                {printStatus && <div style={{fontSize:12,marginTop:6,color:printStatus.startsWith("✅")?K.ok:printStatus.startsWith("❌")?K.er:K.txM}}>{printStatus}</div>}
              </div>
            </div>

            {/* Right: Tips */}
            <div style={{width:220,flexShrink:0}}>
              <div style={{background:K.hv,borderRadius:10,padding:14,fontSize:11,color:K.txM,lineHeight:1.7}}>
                <div style={{fontWeight:700,color:K.tx,fontSize:13,marginBottom:6}}>🖨️ Epson CW-C4000</div>
                • Label: <strong>{p.brand}</strong><br/>
                • Size: <strong>{labelSize.name}</strong> (auto)<br/>
                • Media type: <strong>Labels</strong><br/><br/>
                <strong>⚡ One-click setup (do once):</strong><br/>
                1. Set Epson CW-C4000 as <strong>default printer</strong> in Windows<br/>
                2. In Chrome print dialog, select Epson<br/>
                3. Set paper size to match label<br/>
                4. Chrome remembers these settings!<br/><br/>
                <strong>First time?</strong> Upload blank label, click "⚙️ Position" to place LOT/EXP, save.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ── Reports ── */
function ReportsView({ S }) {
  const [tab,setTab]=useState("production");
  const [from,setFrom]=useState(()=>{const d=new Date();d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,10)});
  const [to,setTo]=useState(()=>new Date().toISOString().slice(0,10));
  const lots=(S.lots||[]).filter(l=>{const d=l.date?.slice(0,10);return d>=from&&d<=to});
  const csv=(h,r,fn)=>{const c=[h.join(","),...r.map(r=>r.map(c=>'"'+String(c||"").replace(/"/g,'""')+'"').join(","))].join("\n");const b=new Blob([c],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=fn;a.click();URL.revokeObjectURL(u)};
  const tp=lots.reduce((s,l)=>s+l.quantity,0);
  return(
    <PW title="Reports" sub="View summaries and export">
      <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"flex-end"}}><div><label style={sl_}>From</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={si_}/></div><div><label style={sl_}>To</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} style={si_}/></div></div>
      <div style={{display:"flex",gap:4,marginBottom:20}}>{[["production","Production"],["stock","Stock"],["qcr","QC"]].map(([id,lbl])=><button key={id} onClick={()=>setTab(id)} style={{...so_,background:tab===id?K.hv:"transparent",color:tab===id?K.prL:K.txM,borderColor:tab===id?K.pri:K.bd,fontSize:13,padding:"8px 16px"}}>{lbl}</button>)}</div>
      {tab==="production"&&<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:12,marginBottom:24}}>{[["🏭",lots.length,"Lots"],["📦",tp,"Units"],["✅",lots.filter(l=>l.status==="approved").length,"Approved"],["❌",lots.filter(l=>l.status==="rejected").length,"Rejected"]].map(([ic,v,l],i)=><div key={i} style={{background:K.cd,borderRadius:12,padding:16,border:`1px solid ${K.bd}`,textAlign:"center"}}><div style={{fontSize:24}}>{ic}</div><div style={{fontSize:22,fontWeight:700,color:K.tx,margin:"4px 0"}}>{v}</div><div style={{fontSize:11,color:K.txM}}>{l}</div></div>)}</div><button onClick={()=>csv(["Lot","Product","Qty","Status","Date"],lots.map(l=>[l.lotNumber,l.productName,l.quantity,l.status,new Date(l.date).toLocaleDateString("en-US")]),"production.csv")} style={{...sb_,marginBottom:16}}>📥 Export CSV</button>{lots.map((l,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:i?`1px solid ${K.bd}`:"none",fontSize:13}}><span><strong style={{color:K.prL}}>{l.lotNumber}</strong> — {l.productName}</span><Tg c={l.status==="approved"?"#16a34a":"#b45309"} bg={l.status==="approved"?"#dcfce7":"#3b291a"}>{l.status}</Tg></div>)}</>}
      {tab==="stock"&&<><button onClick={()=>csv(["Code","Name","Unit","Min","Stock"],(S.rawMaterials||[]).map(rm=>{const t=(rm.entries||[]).reduce((s,e)=>s+(e.remaining||0),0);return [rm.code,rm.name,rm.unit,rm.minStock,t]}),"stock.csv")} style={{...sb_,marginBottom:16}}>📥 Export CSV</button>{(S.rawMaterials||[]).map((rm,i)=>{const t=(rm.entries||[]).reduce((s,e)=>s+(e.remaining||0),0);return (<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:i?`1px solid ${K.bd}`:"none",fontSize:13}}><span><strong style={{color:K.prL}}>{rm.code}</strong> — {rm.name}</span><span style={{fontWeight:600,color:t<=rm.minStock?K.er:K.ok}}>{t} {rm.unit}</span></div>)})}</>}
      {tab==="qcr"&&<><button onClick={()=>csv(["Lot","Product","Verdict","Tester","Date"],Object.values(S.qcResults||{}).map(r=>[r.lotNumber,r.productName,r.verdict,r.tester,r.date?.slice(0,10)]),"qc.csv")} style={{...sb_,marginBottom:16}}>📥 Export CSV</button>{Object.values(S.qcResults||{}).map((r,i)=><div key={i} style={{background:K.cd,borderRadius:10,padding:"12px 16px",border:`1px solid ${K.bd}`,marginBottom:8,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13}}><strong style={{color:K.prL}}>{r.lotNumber}</strong> — {r.productName}</span><Tg c={r.verdict==="approved"?"#16a34a":"#dc2626"} bg={r.verdict==="approved"?"#dcfce7":"#fef2f2"}>{r.verdict}</Tg></div>)}</>}
    </PW>
  );
}

/* ── Audit & Settings ── */
function AuditView({ log }) {
  return (<PW title="History">{!(log||[]).length?<div style={{textAlign:"center",padding:40,color:K.txD}}>No changes</div>:log.map((e,i)=><div key={i} style={{background:K.cd,borderRadius:10,padding:"10px 14px",border:`1px solid ${K.bd}`,marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:13,color:K.tx}}><strong>{e.user}</strong> — {e.action}</div><div style={{fontSize:12,color:K.txM}}>{e.details}</div></div><div style={{fontSize:11,color:K.txD,whiteSpace:"nowrap",marginLeft:16}}>{new Date(e.ts).toLocaleString("en-US")}</div></div>)}</PW>);
}

/* ── Backup / Restore ── */
function BackupPanel({ S, setS, aLog }) {
  const [status, setStatus] = useState("");
  const fileRef = useRef(null);

  const doExport = () => {
    try {
      const data = { ...S, _exportDate: new Date().toISOString(), _version: "policontrol-backup-v1" };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "policontrol_backup_" + new Date().toISOString().slice(0,10) + ".json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      setStatus("✅ Backup exported! Keep this file safe.");
      aLog("Backup exported", new Date().toISOString());
    } catch(e) {
      setStatus("❌ Export failed: " + e.message);
    }
  };

  const doImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus("⏳ Importing...");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data._version && !data.products) { setStatus("❌ Invalid backup file."); return; }
        // Remove internal fields
        delete data._exportDate; delete data._version; delete data._ver;
        await setS(data);
        setStatus("✅ Backup restored! All data imported. Refresh the page to see changes.");
        aLog("Backup imported", new Date().toISOString());
      } catch(err) {
        setStatus("❌ Import failed: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const prodCount = (S.products||[]).length;
  const matCount = (S.rawMaterials||[]).length;
  const lotCount = (S.lots||[]).length;
  const instrCount = Object.keys(S.instructions||{}).length;
  const tplCount = Object.keys(S.labelTemplates||{}).length;

  return (
    <div>
      <div style={{fontSize:15,fontWeight:700,color:K.tx,marginBottom:6}}>💾 Backup & Restore</div>
      <div style={{fontSize:13,color:K.txM,marginBottom:20}}>Export all data before updating the app. Import to restore after deploy.</div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
        {/* Export */}
        <div style={{background:K.cd,borderRadius:12,border:`1px solid ${K.ok}44`,padding:20}}>
          <div style={{fontSize:16,marginBottom:6}}>📤</div>
          <div style={{fontSize:14,fontWeight:700,color:K.tx,marginBottom:4}}>Export Backup</div>
          <div style={{fontSize:12,color:K.txM,marginBottom:12}}>Download all data as JSON file</div>
          <div style={{fontSize:11,color:K.txM,marginBottom:12,lineHeight:1.6}}>
            Includes: {prodCount} products, {matCount} materials, {lotCount} lots, {instrCount} instructions, {tplCount} label templates, photos, QC results, audit log
          </div>
          <button onClick={doExport} style={{...sb_,width:"100%",padding:"12px",fontSize:14}}>📤 Export All Data</button>
        </div>

        {/* Import */}
        <div style={{background:K.cd,borderRadius:12,border:`1px solid ${K.wr}44`,padding:20}}>
          <div style={{fontSize:16,marginBottom:6}}>📥</div>
          <div style={{fontSize:14,fontWeight:700,color:K.tx,marginBottom:4}}>Import Backup</div>
          <div style={{fontSize:12,color:K.txM,marginBottom:12}}>Restore from a backup JSON file</div>
          <div style={{fontSize:11,color:K.er,marginBottom:12,lineHeight:1.6}}>
            ⚠️ This will OVERWRITE all current data with the backup file contents.
          </div>
          <button onClick={()=>fileRef.current?.click()} style={{...so_,width:"100%",padding:"12px",fontSize:14,borderColor:K.wr}}>📥 Import Backup File</button>
          <input ref={fileRef} type="file" accept=".json" onChange={doImport} style={{display:"none"}} />
        </div>
      </div>

      {status && <div style={{padding:"12px 16px",borderRadius:10,fontSize:13,fontWeight:600,
        background:status.startsWith("✅")?"#dcfce7":status.startsWith("❌")?"#fef2f2":"#fef3c7",
        color:status.startsWith("✅")?"#166534":status.startsWith("❌")?"#991b1b":"#92400e",
        marginBottom:16}}>{status}</div>}

      <div style={{background:K.hv,borderRadius:10,padding:16,fontSize:12,color:K.txM,lineHeight:1.6}}>
        <strong>💡 Workflow before updating the app:</strong><br/>
        1. Click <strong>📤 Export All Data</strong> — saves JSON file to Downloads<br/>
        2. Do the GitHub push (update App.jsx)<br/>
        3. Wait for Render to rebuild<br/>
        4. Open app → Settings → Backup → <strong>📥 Import Backup File</strong><br/>
        5. Select the JSON file → all data restored!
      </div>
    </div>
  );
}

/* ── AI Import (paste IT document → auto-create kit/product/instructions) ── */
function AIImport({ S, sv, aLog, allCats, allKits, allBrands }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const doImport = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(""); setResult(null); setSaved(false);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: `You are a manufacturing ERP assistant for Policontrol USA, a factory that produces DPD chlorine reagents and microbiology test products.

Parse the following work instruction document (may be in Portuguese or English) and extract ALL information into a structured JSON format.

RESPOND WITH ONLY VALID JSON, no markdown, no backticks, no explanation. The JSON must have this exact structure:

{
  "kitName": "Name of the kit/product in English",
  "kitId": "short-slug-id",
  "category": "dpd-reagents or micro-kits or micro-trays",
  "format": "Liquid or Powder or Kit or Tray",
  "type": "Free Chlorine or Total Chlorine or etc",
  "components": [
    {
      "id": "short-slug",
      "name": "Component Name in English",
      "icon": "emoji",
      "desc": "Short description with batch size"
    }
  ],
  "rawMaterials": [
    {
      "code": "RM-XXX",
      "name": "Material name in English",
      "unit": "g or mL or pcs",
      "vendor": "Vendor name or empty",
      "qtyPerBatch": 100.0,
      "component": "Which component uses this"
    }
  ],
  "instructions": {
    "component-id": [
      {
        "title": "1. Step Title",
        "description": "Detailed step description in English with location markers like 📍",
        "warning": "Warning text or empty",
        "notes": "Tips or empty"
      }
    ]
  },
  "batchSize": "e.g. 49 kits",
  "bottleWeight": "e.g. 102g per bottle",
  "tolerance": "e.g. ±2%",
  "expiration": "e.g. 60 months"
}

Include ALL raw materials, ALL steps, ALL warnings. Translate everything to English. Include equipment list in step 1 with PPE. Add location markers (📍) where relevant.

DOCUMENT TO PARSE:
${input}` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(c => c.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
    } catch (e) {
      setError("Error processing: " + (e.message || "Failed to parse response. Try pasting a clearer document."));
    }
    setLoading(false);
  };

  const doSave = async () => {
    if (!result) return;
    const r = result;

    // 1. Add kit type if not exists
    const ck = r.kitId;
    if (!allKits[ck]) {
      const newKit = { name: r.kitName, type: r.type, format: r.format, category: r.category, items: r.components };
      await sv("customKits", { ...(S.customKits||{}), [ck]: newKit });
    }

    // 2. Add products for each brand
    const existing = S.products.map(p => p.id);
    const newProducts = [...S.products];
    for (const brand of ["Ultra", "AWS", "Policontrol"]) {
      const pid = ck + "-" + brand.toLowerCase();
      if (!existing.includes(pid)) {
        newProducts.push({
          id: pid, name: r.kitName, brand, format: r.format, type: r.type,
          category: r.category, emoji: r.format === "Liquid" ? "🧪" : "⚗️", componentKey: ck,
        });
      }
    }
    await sv("products", newProducts);

    // 3. Add raw materials if not exists
    const mats = [...(S.rawMaterials||[])];
    const existingCodes = mats.map(m => m.code);
    for (const rm of (r.rawMaterials||[])) {
      if (!existingCodes.includes(rm.code)) {
        mats.push({ id: "rm-" + Date.now() + Math.random().toString(36).slice(2,5), code: rm.code, name: rm.name, unit: rm.unit, vendor: rm.vendor || "", minStock: 0, entries: [] });
      }
    }
    await sv("rawMaterials", mats);

    // 4. Add instructions for all brands
    const instr = { ...S.instructions };
    for (const brand of ["Ultra", "AWS", "Policontrol"]) {
      const pid = ck + "-" + brand.toLowerCase();
      for (const [compId, steps] of Object.entries(r.instructions||{})) {
        const key = pid + "__" + compId;
        if (!instr[key]?.length) {
          instr[key] = steps.map(s => ({ ...s, observations: "", images: [] }));
        }
      }
    }
    await sv("instructions", instr);

    await aLog("AI Import", r.kitName + " — " + (r.components||[]).length + " components, " + (r.rawMaterials||[]).length + " materials");
    setSaved(true);
  };

  return (
    <div>
      <div style={{fontSize:15,fontWeight:700,color:K.tx,marginBottom:6}}>🤖 AI Import — Paste Work Instruction</div>
      <div style={{fontSize:13,color:K.txM,marginBottom:16}}>Paste any IT document (Portuguese or English). AI will automatically create the kit, products, raw materials, instructions, and BOM for all 3 brands.</div>

      <textarea value={input} onChange={e=>setInput(e.target.value)} rows={12} placeholder={"Cole aqui o procedimento de trabalho (IT)...\n\nExemplo:\n- IT de produção de reagente DPD\n- Procedimento de preparo de tampão\n- Instrução de controle de qualidade\n\nPode ser em português ou inglês. A IA traduz e organiza tudo automaticamente."} style={{...si_,width:"100%",boxSizing:"border-box",fontSize:13,fontFamily:"monospace",resize:"vertical",lineHeight:1.5}} />

      <div style={{display:"flex",gap:10,marginTop:12}}>
        <button onClick={doImport} disabled={loading||!input.trim()} style={{...sb_,padding:"12px 28px",fontSize:14,opacity:loading||!input.trim()?0.5:1}}>
          {loading ? "🔄 Processing..." : "🤖 Import with AI"}
        </button>
        {input && <button onClick={()=>{setInput("");setResult(null);setError("");setSaved(false)}} style={{...so_,fontSize:13}}>Clear</button>}
      </div>

      {error && <Ab type="err" icon="❌">{error}</Ab>}

      {result && (
        <div style={{marginTop:20}}>
          <div style={{background:K.cd,borderRadius:12,border:`1px solid ${K.ok}44`,padding:20}}>
            <div style={{fontSize:16,fontWeight:700,color:K.tx,marginBottom:12}}>✅ Parsed Successfully</div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
              <div style={{background:K.hv,borderRadius:8,padding:12}}>
                <div style={{fontSize:11,color:K.txD,textTransform:"uppercase"}}>Kit Name</div>
                <div style={{fontSize:14,fontWeight:600,color:K.tx}}>{result.kitName}</div>
                <div style={{fontSize:12,color:K.txM}}>{result.format} • {result.type}</div>
              </div>
              <div style={{background:K.hv,borderRadius:8,padding:12}}>
                <div style={{fontSize:11,color:K.txD,textTransform:"uppercase"}}>Batch Size</div>
                <div style={{fontSize:14,fontWeight:600,color:K.tx}}>{result.batchSize || "—"}</div>
                <div style={{fontSize:12,color:K.txM}}>{result.bottleWeight} {result.tolerance ? `(${result.tolerance})` : ""}</div>
              </div>
              <div style={{background:K.hv,borderRadius:8,padding:12}}>
                <div style={{fontSize:11,color:K.txD,textTransform:"uppercase"}}>Expiration</div>
                <div style={{fontSize:14,fontWeight:600,color:K.tx}}>{result.expiration || "—"}</div>
              </div>
            </div>

            <div style={{fontSize:13,fontWeight:600,color:K.tx,marginBottom:8}}>Components ({(result.components||[]).length})</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
              {(result.components||[]).map((c,i) => (
                <div key={i} style={{background:K.hv,borderRadius:8,padding:"8px 14px",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{c.icon}</span>
                  <div><div style={{fontSize:13,fontWeight:600}}>{c.name}</div><div style={{fontSize:11,color:K.txM}}>{c.desc}</div></div>
                </div>
              ))}
            </div>

            <div style={{fontSize:13,fontWeight:600,color:K.tx,marginBottom:8}}>Raw Materials ({(result.rawMaterials||[]).length})</div>
            <div style={{fontSize:12,marginBottom:16}}>
              {(result.rawMaterials||[]).map((rm,i) => (
                <div key={i} style={{padding:"4px 0",borderTop:i?`1px solid ${K.bd}`:"none",display:"flex",justifyContent:"space-between"}}>
                  <span><strong>{rm.code}</strong> — {rm.name}</span>
                  <span style={{color:K.txM}}>{rm.qtyPerBatch} {rm.unit} / batch{rm.vendor ? ` (${rm.vendor})` : ""}</span>
                </div>
              ))}
            </div>

            <div style={{fontSize:13,fontWeight:600,color:K.tx,marginBottom:8}}>Instructions</div>
            {Object.entries(result.instructions||{}).map(([compId, steps]) => (
              <div key={compId} style={{marginBottom:10}}>
                <div style={{fontSize:12,fontWeight:600,color:K.pri,marginBottom:4}}>{compId} — {(steps||[]).length} steps</div>
                {(steps||[]).map((s,i) => (
                  <div key={i} style={{fontSize:11,color:K.txM,padding:"2px 0 2px 12px"}}>{s.title}</div>
                ))}
              </div>
            ))}

            <div style={{display:"flex",gap:10,marginTop:16}}>
              {!saved ? (
                <button onClick={doSave} style={{...sb_,padding:"12px 28px",fontSize:14}}>💾 Save to App (all 3 brands)</button>
              ) : (
                <div style={{display:"flex",alignItems:"center",gap:8,color:K.ok,fontWeight:600,fontSize:14}}>✅ Saved! Kit, products, materials, and instructions created for Ultra, AWS, and Policontrol.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsView({ S, sv, aLog }) {
  const [tab, setTab] = useState("products");

  // Custom data from storage (overrides defaults)
  const customCats = S.customCategories || [];
  const customBrands = S.customBrands || [];
  const customKits = S.customKits || {};
  const allCats = [...CATEGORIES, ...customCats];
  const allBrands = [...new Set([...BRANDS, ...customBrands, ...S.products.map(p=>p.brand)])];
  const allKits = { ...DEF_COMPONENTS, ...customKits };

  // Forms
  const [np, setNp] = useState({ name:"", brand:"", componentKey:Object.keys(allKits)[0] });
  const [showNp, setShowNp] = useState(false);
  const [nc, setNc] = useState({ id:"", name:"", icon:"📦", color:"#3b82f6" });
  const [showNc, setShowNc] = useState(false);
  const [nb, setNb] = useState("");
  const [nk, setNk] = useState({ id:"", name:"", category:"dpd-reagents", format:"Liquid", type:"", items:[{id:"comp1",name:"Component 1",icon:"🧪",desc:""}] });
  const [showNk, setShowNk] = useState(false);

  return (
    <PW title="Settings" sub="Manage products, categories, brands, and kit types">
      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:20}}>
        {[["products","📋 Products"],["categories","🏷️ Categories"],["brands","🏢 Brands"],["kits","🧪 Kit Types"],["ai","🤖 AI Import"],["backup","💾 Backup"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{...so_,background:tab===id?K.hv:"transparent",color:tab===id?K.pri:K.txM,borderColor:tab===id?K.pri:K.bd,fontSize:13,padding:"8px 16px",fontWeight:tab===id?600:400}}>{lbl}</button>
        ))}
      </div>

      {/* ── PRODUCTS ── */}
      {tab==="products" && <>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
          <h2 style={{fontSize:15,fontWeight:600,color:K.tx,margin:0}}>{S.products.length} Products</h2>
          <button onClick={()=>setShowNp(!showNp)} style={sb_}>+ Add Product</button>
        </div>
        {showNp && <div style={{background:K.cd,borderRadius:10,padding:16,border:`1px solid ${K.pri}`,marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10}}>
            <div><label style={sl_}>Product Name</label><input value={np.name} onChange={e=>setNp({...np,name:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box"}}/></div>
            <div><label style={sl_}>Brand</label><input value={np.brand} onChange={e=>setNp({...np,brand:e.target.value})} list="all-brands-list" style={{...si_,width:"100%",boxSizing:"border-box"}}/></div>
            <div><label style={sl_}>Kit Type</label><select value={np.componentKey} onChange={e=>setNp({...np,componentKey:e.target.value})} style={{...ss_,width:"100%",boxSizing:"border-box"}}>{Object.entries(allKits).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}</select></div>
          </div>
          <datalist id="all-brands-list">{allBrands.map(b=><option key={b} value={b}/>)}</datalist>
          <div style={{display:"flex",gap:8,marginTop:12,justifyContent:"flex-end"}}>
            <button onClick={()=>setShowNp(false)} style={so_}>Cancel</button>
            <button onClick={async()=>{
              if(!np.name||!np.brand) return;
              const comp = allKits[np.componentKey];
              const emoji = comp.category==="micro-kits"?"🦠":comp.category==="micro-trays"?"🧫":comp.format==="Liquid"?"🧪":"⚗️";
              await sv("products",[...S.products,{id:"c-"+Date.now(),name:np.name,brand:np.brand,format:comp.format,type:comp.type,category:comp.category,emoji,componentKey:np.componentKey}]);
              await aLog("Created product",np.name+" "+np.brand);
              setNp({name:"",brand:"",componentKey:Object.keys(allKits)[0]}); setShowNp(false);
            }} style={sb_}>Create</button>
          </div>
        </div>}
        {S.products.map(p=>{const cat=allCats.find(c=>c.id===(p.category||"dpd-reagents"));return (
          <div key={p.id} style={{background:K.cd,borderRadius:8,padding:"10px 14px",border:`1px solid ${K.bd}`,marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>{p.emoji}</span>
              <div>
                <div style={{fontSize:13,color:K.tx,fontWeight:600}}>{p.name}</div>
                <div style={{fontSize:11,color:K.txM}}>{p.brand} • {p.format} • {p.type}</div>
              </div>
              {cat && <Tg c={cat.color} bg={cat.color+"20"}>{cat.icon} {cat.name}</Tg>}
            </div>
            <button onClick={async()=>{await sv("products",S.products.filter(x=>x.id!==p.id));await aLog("Removed product",p.name)}} style={{...sm_,color:K.er}} title="Delete product">✕</button>
          </div>
        )})}
      </>}

      {/* ── CATEGORIES ── */}
      {tab==="categories" && <>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
          <h2 style={{fontSize:15,fontWeight:600,color:K.tx,margin:0}}>{allCats.length} Categories</h2>
          <button onClick={()=>setShowNc(!showNc)} style={sb_}>+ Add Category</button>
        </div>
        {showNc && <div style={{background:K.cd,borderRadius:10,padding:16,border:`1px solid ${K.pri}`,marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"60px 2fr 1fr 80px",gap:10}}>
            <div><label style={sl_}>Icon</label><input value={nc.icon} onChange={e=>setNc({...nc,icon:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box",textAlign:"center"}}/></div>
            <div><label style={sl_}>Name</label><input value={nc.name} onChange={e=>setNc({...nc,name:e.target.value})} placeholder="e.g. Water Testing" style={{...si_,width:"100%",boxSizing:"border-box"}}/></div>
            <div><label style={sl_}>ID (slug)</label><input value={nc.id} onChange={e=>setNc({...nc,id:e.target.value})} placeholder="water-testing" style={{...si_,width:"100%",boxSizing:"border-box"}}/></div>
            <div><label style={sl_}>Color</label><input type="color" value={nc.color} onChange={e=>setNc({...nc,color:e.target.value})} style={{...si_,width:"100%",boxSizing:"border-box",padding:2,height:36}}/></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12,justifyContent:"flex-end"}}>
            <button onClick={()=>setShowNc(false)} style={so_}>Cancel</button>
            <button onClick={async()=>{
              if(!nc.name||!nc.id) return;
              if(allCats.find(c=>c.id===nc.id)) return;
              await sv("customCategories",[...customCats,{...nc}]);
              await aLog("Created category",nc.name);
              setNc({id:"",name:"",icon:"📦",color:"#3b82f6"}); setShowNc(false);
            }} style={sb_}>Create</button>
          </div>
        </div>}
        {allCats.map(c=>{const isBuiltIn=CATEGORIES.find(x=>x.id===c.id);const productCount=S.products.filter(p=>p.category===c.id).length;return (
          <div key={c.id} style={{background:K.cd,borderRadius:8,padding:"10px 14px",border:`1px solid ${K.bd}`,marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>{c.icon}</span>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:c.color}}>{c.name}</div>
                <div style={{fontSize:11,color:K.txM}}>{productCount} product{productCount!==1?"s":""}{isBuiltIn?" • built-in":""}</div>
              </div>
            </div>
            {!isBuiltIn && <button onClick={async()=>{await sv("customCategories",customCats.filter(x=>x.id!==c.id));await aLog("Removed category",c.name)}} style={{...sm_,color:K.er}} title="Delete">✕</button>}
          </div>
        )})}
      </>}

      {/* ── BRANDS ── */}
      {tab==="brands" && <>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
          <h2 style={{fontSize:15,fontWeight:600,color:K.tx,margin:0}}>{allBrands.length} Brands</h2>
        </div>
        <div style={{background:K.cd,borderRadius:10,padding:14,border:`1px solid ${K.bd}`,marginBottom:12,display:"flex",gap:8}}>
          <input value={nb} onChange={e=>setNb(e.target.value)} placeholder="New brand name..." style={{...si_,flex:1}} onKeyDown={async e=>{if(e.key==="Enter"&&nb&&!allBrands.includes(nb)){await sv("customBrands",[...customBrands,nb]);await aLog("Added brand",nb);setNb("")}}} />
          <button onClick={async()=>{if(nb&&!allBrands.includes(nb)){await sv("customBrands",[...customBrands,nb]);await aLog("Added brand",nb);setNb("")}}} style={sb_}>+ Add</button>
        </div>
        {allBrands.map(b=>{const isBuiltIn=BRANDS.includes(b);const productCount=S.products.filter(p=>p.brand===b).length;return (
          <div key={b} style={{background:K.cd,borderRadius:8,padding:"10px 14px",border:`1px solid ${K.bd}`,marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:K.tx}}>{b}</div>
              <div style={{fontSize:11,color:K.txM}}>{productCount} product{productCount!==1?"s":""}{isBuiltIn?" • built-in":""}</div>
            </div>
            {!isBuiltIn && productCount===0 && <button onClick={async()=>{await sv("customBrands",customBrands.filter(x=>x!==b));await aLog("Removed brand",b)}} style={{...sm_,color:K.er}}>✕</button>}
          </div>
        )})}
      </>}

      {/* ── KIT TYPES ── */}
      {tab==="kits" && <>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
          <h2 style={{fontSize:15,fontWeight:600,color:K.tx,margin:0}}>{Object.keys(allKits).length} Kit Types</h2>
          <button onClick={()=>setShowNk(!showNk)} style={sb_}>+ Add Kit Type</button>
        </div>
        {showNk && <div style={{background:K.cd,borderRadius:10,padding:16,border:`1px solid ${K.pri}`,marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={sl_}>Kit Type Name</label><input value={nk.name} onChange={e=>setNk({...nk,name:e.target.value})} placeholder="e.g. pH Test Kit" style={{...si_,width:"100%",boxSizing:"border-box"}}/></div>
            <div><label style={sl_}>ID (slug)</label><input value={nk.id} onChange={e=>setNk({...nk,id:e.target.value})} placeholder="ph-kit" style={{...si_,width:"100%",boxSizing:"border-box"}}/></div>
            <div><label style={sl_}>Category</label><select value={nk.category} onChange={e=>setNk({...nk,category:e.target.value})} style={{...ss_,width:"100%",boxSizing:"border-box"}}>{allCats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
            <div><label style={sl_}>Format</label><input value={nk.format} onChange={e=>setNk({...nk,format:e.target.value})} placeholder="Liquid / Powder / Kit" style={{...si_,width:"100%",boxSizing:"border-box"}}/></div>
            <div style={{gridColumn:"1/-1"}}><label style={sl_}>Type Label</label><input value={nk.type} onChange={e=>setNk({...nk,type:e.target.value})} placeholder="e.g. pH Measurement" style={{...si_,width:"100%",boxSizing:"border-box"}}/></div>
          </div>
          <div style={{borderTop:`1px solid ${K.bd}`,paddingTop:10,marginTop:6}}>
            <div style={{fontSize:12,fontWeight:600,color:K.txM,marginBottom:6}}>Components ({nk.items.length})</div>
            {nk.items.map((it,i)=>(
              <div key={i} style={{display:"flex",gap:6,marginBottom:4}}>
                <input value={it.icon} onChange={e=>{const n=[...nk.items];n[i]={...n[i],icon:e.target.value};setNk({...nk,items:n})}} style={{...si_,width:50,textAlign:"center"}} />
                <input value={it.name} onChange={e=>{const n=[...nk.items];n[i]={...n[i],name:e.target.value};setNk({...nk,items:n})}} placeholder="Component name" style={{...si_,flex:1}} />
                <input value={it.desc} onChange={e=>{const n=[...nk.items];n[i]={...n[i],desc:e.target.value};setNk({...nk,items:n})}} placeholder="Description" style={{...si_,flex:1}} />
                <button onClick={()=>setNk({...nk,items:nk.items.filter((_,j)=>j!==i)})} style={{...sm_,color:K.er}}>✕</button>
              </div>
            ))}
            <button onClick={()=>setNk({...nk,items:[...nk.items,{id:"comp"+(nk.items.length+1),name:"Component "+(nk.items.length+1),icon:"🧪",desc:""}]})} style={{...so_,fontSize:11,marginTop:6}}>+ Add Component</button>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12,justifyContent:"flex-end"}}>
            <button onClick={()=>setShowNk(false)} style={so_}>Cancel</button>
            <button onClick={async()=>{
              if(!nk.id||!nk.name||!nk.items.length) return;
              if(allKits[nk.id]) return;
              const newKit = {name:nk.name,type:nk.type||nk.name,format:nk.format||"Kit",category:nk.category,items:nk.items.map((it,i)=>({...it,id:it.id||"comp"+(i+1)}))};
              await sv("customKits",{...customKits,[nk.id]:newKit});
              await aLog("Created kit type",nk.name);
              setNk({id:"",name:"",category:"dpd-reagents",format:"Liquid",type:"",items:[{id:"comp1",name:"Component 1",icon:"🧪",desc:""}]}); setShowNk(false);
            }} style={sb_}>Create</button>
          </div>
        </div>}
        {Object.entries(allKits).map(([k,v])=>{const isBuiltIn=DEF_COMPONENTS[k];const productCount=S.products.filter(p=>p.componentKey===k).length;const cat=allCats.find(c=>c.id===v.category);return (
          <div key={k} style={{background:K.cd,borderRadius:8,padding:"10px 14px",border:`1px solid ${K.bd}`,marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:K.tx}}>{v.name}</div>
              <div style={{fontSize:11,color:K.txM}}>{v.format} • {v.items.length} components • {productCount} product{productCount!==1?"s":""}{isBuiltIn?" • built-in":""}</div>
              <div style={{fontSize:10,color:K.txD,marginTop:2}}>{v.items.map(i=>i.icon+" "+i.name).join(" · ")}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {cat && <Tg c={cat.color} bg={cat.color+"20"}>{cat.icon}</Tg>}
              {!isBuiltIn && productCount===0 && <button onClick={async()=>{const nk={...customKits};delete nk[k];await sv("customKits",nk);await aLog("Removed kit type",v.name)}} style={{...sm_,color:K.er}}>✕</button>}
            </div>
          </div>
        )})}
      </>}

      {/* ── AI IMPORT ── */}
      {tab==="ai" && <AIImport S={S} sv={sv} aLog={aLog} allCats={allCats} allKits={allKits} allBrands={allBrands} />}

      {/* ── BACKUP ── */}
      {tab==="backup" && <BackupPanel S={S} setS={async(data)=>{for(const[k,v]of Object.entries(data)){await sv(k,v)}}} aLog={aLog} />}
    </PW>
  );
}
