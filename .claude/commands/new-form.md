# New Form

Create a form component with async submit, error handling, and loading state. Arguments: `$ARGUMENTS` (form name and fields, e.g. "CreateBox: title, description, price").

## Template

```tsx
import { useState } from 'react'

export default function {Name}Form() {
  const [formData, setFormData] = useState({ /* fields */ })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await api.{action}(formData)
      // success handling
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Что-то пошло не так')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* floating-label inputs */}
      {error && <p className="error-message">{error}</p>}
      <button type="submit" disabled={isLoading} className="btn-primary">
        {isLoading ? <span className="spinner" /> : 'Submit'}
      </button>
    </form>
  )
}
```

Reuse `.floating-label`, `.btn-primary`, `.error-message` classes from `Auth.css`.
