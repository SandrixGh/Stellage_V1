# New Component

Create a reusable React component for Stellage. Arguments: `$ARGUMENTS` (component name, e.g. "TagBadge").

## Steps

1. Create `frontend/src/components/{Name}/` directory
2. Create `{Name}.tsx`:

```tsx
import './{Name}.css'

interface {Name}Props {
  // define props
}

export default function {Name}({ }: {Name}Props) {
  return (
    <div className="{name}">
    </div>
  )
}
```

3. Create `{Name}.css` using design tokens:
```css
/* Background: rgba(255,255,255,0.03) */
/* Border: 1px solid rgba(215,208,179,0.15) */
/* Radius: 28px */
/* Backdrop: blur(24px) */
/* Text: #D7D0B7 */
/* Accent: #D7D0B7 */
```

4. Export from component if there's a barrel file
