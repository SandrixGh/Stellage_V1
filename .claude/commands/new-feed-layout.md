# New Feed Layout

Scaffold a catalogue / browse page for Stellage: a full-width search bar on top, a sticky filter sidebar on the left, and a responsive card grid with client-side filtering. Arguments: `$ARGUMENTS` (page name, e.g. "Market" → `MarketPage`).

Use this for any "browse a list of things with search + filters" screen (Feed, Search, a shelf catalogue). The reference implementation lives in `frontend/src/pages/Feed/FeedPage.tsx` + `FeedPage.css` — read it first and mirror its structure.

## Steps

1. Create `frontend/src/pages/{Name}/{Name}Page.tsx`:

```tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MOCK_TEMPLATES, formatPrice, resolveRarityVisual } from "../../data/mockTemplates";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import "./{Name}Page.css";

const RARITIES = ["Common", "Rare", "Golden", "Developer's"] as const;

export const {Name}Page = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [active, setActive] = useState<Set<string>>(new Set());

    const items = MOCK_TEMPLATES; // swap for store data when wired

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return items.filter((it) => {
            const matchesQuery = !q || it.title.toLowerCase().includes(q);
            const matchesRarity = active.size === 0 || active.has(it.rarity);
            return matchesQuery && matchesRarity;
        });
    }, [items, query, active]);

    const toggle = (r: string) =>
        setActive((prev) => {
            const next = new Set(prev);
            next.has(r) ? next.delete(r) : next.add(r);
            return next;
        });

    const reset = () => { setQuery(""); setActive(new Set()); };

    return (
        <div className="{name}-page">
            <input
                className="{name}-search"
                placeholder="Поиск коробок..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />

            <div className="{name}-layout">
                <aside className="{name}-sidebar">
                    <h2 className="{name}-sidebar-title">Фильтры</h2>
                    {RARITIES.map((r) => {
                        const { boxColor } = resolveRarityVisual(r);
                        return (
                            <label key={r} className="{name}-filter">
                                <input type="checkbox" checked={active.has(r)} onChange={() => toggle(r)} />
                                <span className="{name}-dot" style={{ background: boxColor }} />
                                {r}
                            </label>
                        );
                    })}
                    <button className="{name}-reset" onClick={reset}>Сбросить</button>
                </aside>

                <div className="{name}-grid">
                    {filtered.map((it) => {
                        const { rarityGlow, rarityClass, boxColor } = resolveRarityVisual(it.rarity);
                        return (
                            <div
                                key={it.id}
                                className={`{name}-card rarity-${rarityClass}`}
                                onClick={() => navigate(`/box/${it.id}`)}
                            >
                                <div className="{name}-card-visual">
                                    <WireframeBox size={180} rarityGlow={rarityGlow} color={boxColor} />
                                </div>
                                <div className="{name}-card-footer">
                                    <h3 className="{name}-card-title">{it.title}</h3>
                                    <div className="{name}-card-meta">
                                        <span className={`rarity-tag rarity-tag-${rarityClass}`}>{it.rarity}</span>
                                        <span className="{name}-card-price">{formatPrice(it.price, it.currency)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
```

2. Create `{Name}Page.css` mirroring `FeedPage.css`. Key rules to copy:
   - `.{name}-layout` → `display: flex; gap: 24px;` with `.{name}-sidebar { width: 240px; position: sticky; top: 88px; }` (glass panel) and `.{name}-grid { flex: 1; }`.
   - Grid: `repeat(auto-fill, minmax(230px, 1fr))`, gap 18px.
   - Search/sidebar/card all use the dark glass tokens (`rgba(255,255,255,0.025)` bg, `rgba(215,208,179,0.13)` border, `backdrop-filter: blur(24px)`).
   - `@media (max-width: 820px)` → stack sidebar above grid (static, full width).

3. Register the route in `frontend/src/App.tsx` inside the `<Route element={<AppLayout />}>` group.

## Notes
- **Hero hierarchy:** the box must dominate the card (~70-80%). `WireframeBox size={180}`, centered, near the top; title below; `[rarity tag] [price]` row below that — all centered. No description.
- **Hover = glow, never lift.** Do NOT use `transform: translateY/scale` on cards here. Intensify the radial glow behind the box (opacity 0→1), reveal a thin `::after` top-edge highlight (`linear-gradient(90deg, transparent, rgba(215,208,179,0.25), transparent)`), deepen `box-shadow` + inset glow, and brighten the rarity-tinted border. Transitions `~0.35s cubic-bezier(0.16,1,0.3,1)`.
- Reuse `MOCK_TEMPLATES`, `formatPrice`, `resolveRarityVisual`, `getRarityClass` from `frontend/src/data/mockTemplates.ts` — do not redefine rarity maps or price formatting locally.
- Rarity colors: Common `#D7D0B7`, Rare `#8BB8FF`, Golden `#E8CB82`, Developer's `#C882FF`.
- Cards navigate to the box detail page (`/box/:id`).
