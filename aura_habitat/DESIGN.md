# Design System Document

## 1. Overview & Creative North Star: "The Radiant Curator"
This design system is anchored by a philosophy we call **The Radiant Curator**. In the context of a high-end interior design application, the interface must act as a sophisticated gallery—not just a tool. We move away from the "app-like" rigidity of standard grids and instead embrace an editorial layout inspired by premium architecture journals. 

The experience is defined by **Organic Energy**: a blend of high-energy vibrance (vibrant orange) and calm, breathable space (warm off-whites). By utilizing intentional asymmetry, overlapping image modules, and significant white space, we ensure the UI feels curated, professional, and structured.

## 2. Colors & Surface Philosophy
The palette avoids the clinical coldness of pure greys, opting instead for a warm, sun-drenched foundation that complements interior photography.

### The Color Tokens
- **Primary Accent:** `primary_container` (#ff7949) serves as our energetic hero color, while `primary` (#a63300) provides the sophisticated depth for high-level branding.
- **Foundational Neutrals:** The base is `surface` (#f8f6f2), a warm off-white that prevents eye strain and feels more "home-like" than pure white.

### The "No-Line" Rule
To maintain a premium, seamless aesthetic, **the use of 1px solid borders for sectioning is strictly prohibited.** Boundaries between content areas must be defined exclusively through tonal shifts:
- Use `surface_container_low` for secondary content blocks sitting on a `surface` background.
- Use `surface_container_highest` for high-contrast interactive zones.

### Signature Textures & Glassmorphism
- **The Glow Gradient:** For primary CTAs and hero elements, use a linear gradient transitioning from `primary_container` (#ff7949) at the top left to `primary` (#a63300) at the bottom right. This adds a sense of "visual soul" and physical volume.
- **The Frosted Pane:** Floating navigation or overlay elements should utilize Glassmorphism. Use `surface_container_lowest` at 70% opacity with a 20px-32px background blur. This allows the vibrant interior photography to bleed through, softening the interface.

## 3. Typography: The Manrope Editorial Scale
We use **Manrope** as our sole typeface. Its geometric yet humanist qualities provide the perfect balance between professional precision and approachable warmth.

- **The Display Voice:** `display-lg` (3.5rem) and `headline-lg` (2rem) should be used with tight letter-spacing (-2%) to create a bold, editorial impact. These are reserved for inspirational quotes or major section headers.
- **The Informational Voice:** `body-lg` (1rem) is the workhorse. Ensure generous line height (1.6) to maintain an airy, premium feel.
- **The Utility Voice:** `label-md` (0.75rem) and `label-sm` (0.6875rem) should use increased letter-spacing (+5%) and "All Caps" styling when used for metadata to distinguish them from interactive text.

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are often messy. In this system, depth is achieved through physical "stacking."

### The Layering Principle
Think of the UI as layers of fine paper.
- **Base:** `surface` (#f8f6f2)
- **Mid-Ground (Cards/Sections):** `surface_container_low` (#f2f1ec)
- **Foreground (Interactive Elements):** `surface_container_lowest` (#ffffff)

### Ambient Shadows
When an element must float (e.g., a "Generate" button), use an **Ambient Shadow**. 
- **Shadow Specs:** Blur: 40px, Spread: -5px, Opacity: 6%.
- **Shadow Tint:** Instead of grey, use a tint of `on_surface` (#2e2f2d) or a very soft orange-grey to mimic the way light bounces in a well-designed room.

### The "Ghost Border" Fallback
If a border is required for accessibility in input fields, use the `outline_variant` token at **20% opacity**. Never use a 100% opaque border.

## 5. Components

### Buttons
- **Primary:** Roundedness: `lg` (1rem). Uses "The Glow Gradient." Text color: `on_primary_container`.
- **Secondary/Ghost:** Roundedness: `lg` (1rem). No fill. Use "Ghost Border" logic or a subtle `surface_container_high` fill.

### Style Chips
- **States:** Selected chips use `primary_container` with a soft ambient shadow. Unselected chips use `surface_container_highest` to blend into the background.
- **Shape:** Use `md` (0.75rem) for a modern, refined feel that balances structure and approachability.

### Interior Design "Inspiration" Cards
- **Construction:** Forbid dividers. Separate the image from the text description using a `md` (1rem) spacing gap.
- **Rounding:** All images and card containers must use `md` (0.75rem) corner radii to mimic the sophisticated, clean lines of modern furniture.

### Input Fields
- **Styling:** Use a `surface_container_lowest` background with a `sm` (0.25rem) corner radius. The subtle lift from the background provides enough affordance without needing a heavy border.

## 6. Do’s and Don’ts

### Do:
- **Do** use asymmetrical margins. For example, a headline might be indented further than the body text to create an editorial "rhythm."
- **Do** allow images to "break the container," overlapping slightly onto the background or other surfaces to create depth.
- **Do** use white space as a functional element. High-end design breathes.

### Don’t:
- **Don’t** use 1px solid lines or dividers. They clutter the visual field and feel "templated."
- **Don’t** use pure black (#000000) for text. Always use `on_surface` (#2e2f2d) to keep the "warmth" of the design system.
- **Don’t** use high-intensity shadows. If the shadow is the first thing you see, it’s too dark. It should be felt, not seen.
- **Don’t** use excessive rounding. This system utilizes a moderate level-2 roundedness; avoid pill-shapes to maintain a more architectural and professional aesthetic.