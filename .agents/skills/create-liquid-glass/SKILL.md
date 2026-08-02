---
name: create-liquid-glass
description: >
  Comprehensive guide and blueprints for creating, styling, grouping, and morphing Liquid Glass UI elements
  in SwiftUI (iOS 26+ / iPadOS 26 / macOS Tahoe) and web/CSS glassmorphism environments. Covers material
  variants (.regular, .clear, .identity), .glassEffect() syntax, tinting & interactivity, GlassEffectContainer
  grouping, morphing transitions with glassEffectID + @Namespace, floating action clusters (expandable FABs),
  button styles (.glass and .glassProminent), tab bar / toolbar integration, legibility / background fade (.deliquify()),
  iOS 18 backward compatibility fallbacks (.glassedEffect()), and web CSS adaptation. Trigger this skill whenever
  creating liquid glass components, frosted glass UI, translucent overlays, glass buttons, floating action menus,
  or morphing glass controls.
---

# Create Liquid Glass — Implementation & Design Skill

Liquid Glass is a translucent, dynamic UI material that reflects and refracts surrounding content (lensing), adapts to lighting, and morphs to focus the user.

## 1. Core Mental Model & Golden Rule

> ⚠️ **The Golden Rule:** Liquid Glass belongs **exclusively to the navigation and functional overlay layer** (toolbars, tab bars, floating control clusters, sheets, action buttons).
> **NEVER apply glass to body content** (lists, tables, scrollable cards, media items, or full-screen backgrounds). Content stays primary; glass is the functional overlay floating above it.

---

## 2. Material Variants & Syntax

### Variants Matrix

| Variant | Use Case | Transparency | Adaptivity & Requirements |
|---|---|---|---|
| `.regular` | Default for most UI controls, toolbars, buttons | Medium | Full adaptivity to background |
| `.clear` | Floating controls over photos, video, maps | High | Requires subtle dark dimming overlay + bold text |
| `.identity` | Conditionally disable glass effect | None | Clean toggle without layout recalculation |

### SwiftUI Basic Usage

```swift
import SwiftUI

// Basic Capsule Glass Effect
Text("Liquid Glass")
    .padding()
    .glassEffect(.regular, in: .capsule)

// Interactive & Tinted Action Button
Button("Confirm") { }
    .glassEffect(.regular.tint(.blue).interactive(), in: .capsule)
```

- **`.tint(color)`**: Conveys semantic meaning (primary actions). Use sparingly.
- **`.interactive()`**: Adds touch illumination radiating to nearby glass, press scaling, and bounce effects.
- **Concentric Corners**: Align element corners to window/container corners using `RoundedRectangle(cornerRadius: .containerConcentric)`.

---

## 3. Grouping, Containers & Morphing (CRITICAL)

> ⚠️ **Glass Cannot Sample Other Glass.** When rendering 2 or more glass elements near each other, you MUST wrap them inside a `GlassEffectContainer`. It creates a shared sampling region, prevents visual artifacts, improves GPU performance, and enables smooth morphing.

### GlassEffectContainer & Morphing Rules

To morph glass elements smoothly:
1. Wrap elements in a `GlassEffectContainer(spacing: ...)`.
2. Assign each morphing element a `glassEffectID("id", in: namespace)` sharing a `@Namespace`.
3. Toggle visibility inside `withAnimation(.bouncy)` or `.spring`.

```swift
struct MorphingGlassMenu: View {
    @State private var isExpanded = false
    @Namespace private var glassNamespace

    var body: some View {
        GlassEffectContainer(spacing: 20) {
            VStack(spacing: 12) {
                if isExpanded {
                    Button("Action 1") { }
                        .buttonStyle(.glass)
                        .glassEffectID("action1", in: glassNamespace)

                    Button("Action 2") { }
                        .buttonStyle(.glass)
                        .glassEffectID("action2", in: glassNamespace)
                }

                Button {
                    withAnimation(.bouncy(duration: 0.35)) {
                        isExpanded.toggle()
                    }
                } label: {
                    Image(systemName: isExpanded ? "xmark" : "plus")
                        .font(.title2.bold())
                        .frame(width: 56, height: 56)
                }
                .buttonStyle(.glassProminent)
                .buttonBorderShape(.circle)
                .tint(.blue)
                .glassEffectID("toggle", in: glassNamespace)
            }
        }
    }
}
```

### Unifying Distant Glass Elements
When elements are separated by large gaps but should visually merge into one glass shape during animation:
```swift
Button("Tool A") { }
    .buttonStyle(.glass)
    .glassEffectUnion(id: "toolGroup", namespace: glassNamespace)
```

---

## 4. Standard Controls & Navigation Styling

### Button Styles

- `.buttonStyle(.glass)` — Translucent, secondary actions.
- `.buttonStyle(.glassProminent)` — Filled, primary call-to-actions.

```swift
// Beta fix: .glassProminent + .circle requires explicit .clipShape(Circle())
Button(action: {}) {
    Image(systemName: "star.fill")
}
.buttonStyle(.glassProminent)
.buttonBorderShape(.circle)
.clipShape(Circle())
```

### Toolbars & Tab Bars

- **Toolbars**: Automatic glass chrome. Use `ToolbarSpacer(.fixed, spacing: 20)` or `ToolbarSpacer(.flexible)` for grouping.
- **TabView**:
  - Minimize on scroll: `.tabBarMinimizeBehavior(.onScrollDown)`
  - Floating bottom accessory: `.tabViewBottomAccessory { NowPlayingView() }`
  - Search tab role: `Tab("Search", systemImage: "magnifyingglass", role: .search)`

---

## 5. Readability, Troubleshooting & Compatibility

### Readability Over Busy Backgrounds
When glass floats over busy scrolling content:
1. **Background Fade (`.deliquify()`)**: Fades a subtle background gradient behind bottom glass navigation. (See [references/BackgroundFade.swift](references/BackgroundFade.swift)).
2. **Background Dimming**: Overlay media with `Color.black.opacity(0.3)` when using `.clear`.
3. **High Contrast Content**: Ensure icons and typography on glass use high-contrast vibrant styles.

### iOS 18 Backward Compatibility Fallback
For unified codebase support across iOS 26+ and iOS 18:
```swift
Text("Compatible Button")
    .padding()
    .glassedEffect(in: Capsule(), interactive: true)
```
*(Reference helper in [references/GlassCompat.swift](references/GlassCompat.swift))*.

---

## 6. Web & React Liquid Glass Adaptation (CSS)

When building liquid glass UI elements for Web/React apps (e.g. Stellage web interface):

```css
/* Standard Liquid Glass Overlay Container */
.liquid-glass-overlay {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 
    0 8px 32px 0 rgba(0, 0, 0, 0.12),
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-md, 12px);
}

/* Glass Interactive Action Button */
.liquid-glass-button {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  border-radius: 9999px;
  transition: transform 0.2s ease, background 0.2s ease;
}
```
*(Full CSS reference in [references/LiquidGlassCSS.css](references/LiquidGlassCSS.css))*.

---

## 7. Skill References & Examples

- Runnable Sample App: [references/LiquidGlassSampleApp.swift](references/LiquidGlassSampleApp.swift)
- iOS 18 Fallback Extension: [references/GlassCompat.swift](references/GlassCompat.swift)
- Background Fade Legibility Modifier: [references/BackgroundFade.swift](references/BackgroundFade.swift)
- Web CSS Reference: [references/LiquidGlassCSS.css](references/LiquidGlassCSS.css)
