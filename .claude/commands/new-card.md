# New Card

Create a card component for Stellage (BoxCard, TemplateCard, etc.). Arguments: `$ARGUMENTS` (card name, e.g. "BoxCard").

## Steps

1. Create `frontend/src/components/{Name}Card/` directory
2. Create `{Name}Card.tsx`:

```tsx
import WireframeBox from '../Stellage/WireframeBox'
import './{Name}Card.css'

interface {Name}CardProps {
  title: string
  // add relevant props
}

export default function {Name}Card({ title }: {Name}CardProps) {
  return (
    <div className="{name}-card">
      <div className="{name}-card__preview">
        <WireframeBox size={80} />
      </div>
      <div className="{name}-card__info">
        <h3 className="{name}-card__title">{title}</h3>
      </div>
    </div>
  )
}
```

3. Create `{Name}Card.css`:

```css
.{name}-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(215, 208, 179, 0.15);
  border-radius: 28px;
  backdrop-filter: blur(24px);
  padding: 20px;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.{name}-card:hover {
  transform: scale(1.02);
  border-color: rgba(215, 208, 179, 0.35);
}

.{name}-card__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.{name}-card__title {
  font-family: 'Syne', sans-serif;
  color: #D7D0B7;
  font-size: 14px;
  margin: 0;
}
```

## Notes
- Always include `<WireframeBox>` as the visual preview inside the card
- Use `size` prop on WireframeBox to control preview dimensions
- Hover effect: `scale(1.02)` + border brighten — never shadow or glow
- No rarity system unless the card explicitly needs it
