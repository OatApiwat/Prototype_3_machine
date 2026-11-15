# Portal page: plan (draft for review)

## What the Portal is (my reading of the two images)
- **Image 1 (HVM_101, Cleanroom 22):** one production line, left to right: MDDP, HMA, DTCx3, UVL, HPC5L, CPM 5L, MDDPx3, UVL, MDDP, HPC5L, CPM 5L, HMA, ALUL, HA. Three machines are highlighted and already have pages: **MDDP_184**, **CALUL_037**, **HAll_013**.
- **Image 2 (process overview):** the whole flow, steps 1 to 11 (Flexure laser cut, Micro PZT, Oven/AFT/NDE, Load beam forming, ACL, Laser welding, Sag, Damper, Milli PZT, Fracture De-tab, DSSA, Electrical test, APD, APCM, Packing, Store, Metrology), with an owner and a status colour per step.

**Portal = the front page / map.** The user sees the line, clicks a machine, and jumps to that machine's tab. Same page can switch between **2D** and **3D** (same toggle style as HAll).

## Proposed layout
1. New first tab "Portal" (existing tabs unchanged: MDDP Process, CALUL Process, HAll Process).
2. **Top: HVM_101 line view** (the main thing).
   - 2D: flat side/front elevation, machines as labelled blocks in the real order and relative widths, the 3 live machines highlighted green with their names.
   - 3D: same machines as simple extruded boxes with colour per type, orbit/zoom camera (same controls as Tab 2/3), click a machine to open its tab.
   - Hover card per machine: name, type, status (Running/Idle, simulated), one or two live numbers (e.g. MDDP pieces done, CALUL cycle, HAll oven temp) taken from the existing simulation.
3. **Below: process map (image 2)** as a simplified 2D flow diagram, steps 1 to 11 with owner and status colour. 3D version optional (phase 3).
4. Same style rules as the other tabs: fits one screen where possible, one SPC-free page, settings (2D/3D, camera) remembered in localStorage.

## Phases
1. **Phase 1, 2D line view + navigation (small).** Blocks in correct order, live-machine highlight, click to open tab, hover card with live numbers, tab added.
2. **Phase 2, 3D line view + 2D/3D toggle (medium).** Simple box models, orbit camera, same click/hover behaviour.
3. **Phase 3, process map (image 2) (medium).** 2D flow with owner/status; 3D optional.

## Assumptions to confirm
- Only the 3 highlighted machines are "live"; all other machines are drawn but show "no data" (greyed) until you provide data.
- Image 2 contains names of people and statuses. I would include owners and status colours as text labels in the process map. Say if you would rather leave names out.
- "Portal" means the landing page of this file, shown first.
- Machine shapes are schematic (boxes), not CAD-accurate.
- All numbers stay simulated.

## Questions
1. Should Portal show **image 1 only** first (Phase 1 and 2) and add image 2 later, or both together?
2. Any machine besides the 3 highlighted ones that should get its own page later (e.g. HMA, UVL, DTCx3)?
