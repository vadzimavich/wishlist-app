# Guest Node Simulation Fix — Learnings

## 2026-06-13T00:00:00 Task 1: Audit of InviteGuests.tsx

### Functions to DELETE (force simulation)
- simulateTick() (lines 62-127) — replaced by react-spring physics
- runSimulation() (lines 129-142) — replaced by spring-based settling
- buildNodesLinks() (lines 144-172) — replaced by computeRadialLayout

### Functions to REPLACE (framer-motion drag)
- handleDrag (lines 248-272) — replaced by pointer events + collision push
- handleDragEnd (lines 275-307) — replaced by pointer up (no recalculation)
- `drag`/`dragElastic`/`dragConstraints` props (lines 371-377) — removed

### Types to DELETE
- SimNode interface (lines 25-30)
- SimLink interface (lines 31-34)
- OBSIDIAN_DEFAULTS const (lines 14-23)

### State to REPLACE
- params (line 187) → springParams (tension, friction, mass, minDistance)

### Functions to KEEP
- containerVariants / nodeVariants (lines 174-181) — framer-motion entrance
- Slider component (lines 309-319) — repurposed for spring params

### Props to KEEP
- Props interface (lines 7-10)

### Rendering structure to REPLACE
- Current: `<motion.div drag>` + `<line>` from positions state
- New: `<motion.div>` wrapper (entrance) → `<animated.div>` (position) + `<animated.line>` (SVG)
