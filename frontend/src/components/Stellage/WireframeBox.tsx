interface WireframeBoxProps {
    className?: string;
    color?: string;
    size?: number;
    rarityGlow?: "rare" | "golden" | "dev" | null;
}

type Point = { x: number; y: number };

/* ── Cuboid vertices (front face + back face offset by (+40, -30)) ── */
const V = {
    A: { x: 18, y: 38 },   // front  top-left
    B: { x: 118, y: 38 },  // front  top-right
    C: { x: 118, y: 104 }, // front  bottom-right
    D: { x: 18, y: 104 },  // front  bottom-left
    E: { x: 58, y: 8 },    // back   top-left
    F: { x: 158, y: 8 },   // back   top-right
    G: { x: 158, y: 74 },  // back   bottom-right
    H: { x: 58, y: 74 },   // back   bottom-left (hidden corner)
} as const;

const norm = (dx: number, dy: number) => {
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
};
const f = (n: number) => Number(n.toFixed(2));

/**
 * Builds one path string for a polyline whose corners are rounded with a
 * quadratic curve of radius `r`. Drawing each polyline as a single element
 * keeps the wireframe reading as one cohesive object and — crucially — means
 * overlapping strokes at a junction are rasterised once, so semi-transparent
 * lines no longer stack into a bright dot.
 */
const roundedPath = (pts: Point[], r: number, closed = false) => {
    const n = pts.length;
    const at = (i: number) => pts[((i % n) + n) % n];
    let d = "";

    for (let i = 0; i < n; i++) {
        const cur = pts[i];
        const isEndpoint = !closed && (i === 0 || i === n - 1);

        if (isEndpoint) {
            d += i === 0 ? `M ${cur.x},${cur.y} ` : `L ${cur.x},${cur.y} `;
            continue;
        }

        const prev = at(i - 1);
        const next = at(i + 1);
        const vp = norm(prev.x - cur.x, prev.y - cur.y);
        const vn = norm(next.x - cur.x, next.y - cur.y);
        const pin = { x: cur.x + vp.x * r, y: cur.y + vp.y * r };
        const pout = { x: cur.x + vn.x * r, y: cur.y + vn.y * r };

        d += i === 0 ? `M ${f(pin.x)},${f(pin.y)} ` : `L ${f(pin.x)},${f(pin.y)} `;
        d += `Q ${cur.x},${cur.y} ${f(pout.x)},${f(pout.y)} `;
    }
    if (closed) d += "Z";
    return d;
};

const seg = (a: Point, b: Point) => `M ${a.x},${a.y} L ${b.x},${b.y}`;

const R = 7;

// Outer silhouette of the cube (single closed, rounded loop).
const SILHOUETTE = roundedPath([V.D, V.A, V.E, V.F, V.G, V.C], R, true);
// Visible interior edges that meet at the front-top-right corner B.
const INTERIOR = `${roundedPath([V.A, V.B, V.C], R)} ${seg(V.B, V.F)}`;
// The three hidden edges that meet at the back-bottom-left corner H.
const HIDDEN = `${roundedPath([V.D, V.H, V.E], R)} ${seg(V.H, V.G)}`;
// Front face for the glassy fill (rounded rectangle).
const FRONT_FILL = roundedPath([V.A, V.B, V.C, V.D], R, true);
const TOP_FILL = `M ${V.A.x},${V.A.y} L ${V.E.x},${V.E.y} L ${V.F.x},${V.F.y} L ${V.B.x},${V.B.y} Z`;
const RIGHT_FILL = `M ${V.B.x},${V.B.y} L ${V.F.x},${V.F.y} L ${V.G.x},${V.G.y} L ${V.C.x},${V.C.y} Z`;

export const WireframeBox = ({
    className,
    color = "#D7D0B7",
    size = 120,
    rarityGlow = null,
}: WireframeBoxProps) => {
    const glowColor =
        rarityGlow === "golden"
            ? "rgba(230, 200, 120, 0.55)"
            : rarityGlow === "rare"
            ? "rgba(120, 170, 255, 0.55)"
            : rarityGlow === "dev"
            ? "rgba(200, 130, 255, 0.55)"
            : null;

    const filterId = `glow-${rarityGlow ?? "default"}`;

    return (
        <svg
            width={size}
            height={size * 0.72}
            viewBox="0 0 180 130"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ color }}
        >
            {glowColor && (
                <defs>
                    <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feFlood floodColor={glowColor} result="color" />
                        <feComposite in="color" in2="blur" operator="in" result="glow" />
                        <feMerge>
                            <feMergeNode in="glow" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
            )}

            <g
                filter={glowColor ? `url(#${filterId})` : undefined}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {/* ── Glassy faces (subtle, varied per face for depth) ── */}
                <path className="wf-face" d={TOP_FILL} fill="currentColor" stroke="none" opacity="0.14" />
                <path className="wf-face" d={RIGHT_FILL} fill="currentColor" stroke="none" opacity="0.08" />
                <path className="wf-face" d={FRONT_FILL} fill="currentColor" stroke="none" opacity="0.18" />

                {/* ── Hidden edges (one element → no opacity build-up) ── */}
                <path className="wf-edge wf-edge-hidden" d={HIDDEN} pathLength={1} fill="none" strokeWidth="1.4" opacity="0.38" />

                {/* ── Visible wireframe (cohesive, rounded) ── */}
                <path className="wf-edge" d={SILHOUETTE} pathLength={1} fill="none" strokeWidth="2.2" />
                <path className="wf-edge" d={INTERIOR} pathLength={1} fill="none" strokeWidth="2.2" />
            </g>
        </svg>
    );
};
