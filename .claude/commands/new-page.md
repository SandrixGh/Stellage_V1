# New Page

Create a new React page for Stellage. Arguments: `$ARGUMENTS` (page name, e.g. "Marketplace").

## Steps

1. Create `frontend/src/pages/{Name}/` directory
2. Create `{Name}Page.tsx` with this template:

```tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'
import './styles.css'

export default function {Name}Page() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) navigate('/auth')
  }, [isAuthenticated, navigate])

  if (!isAuthenticated) return null

  return (
    <div className="{name}-page">
      <h1>{Name}</h1>
    </div>
  )
}
```

3. Create `styles.css` reusing design tokens from `Auth.css`: dark bg, beige accent, glassmorphism cards
4. Add route to `frontend/src/App.tsx`
5. Add nav link to `frontend/src/components/Navbar/Navbar.tsx` if needed
