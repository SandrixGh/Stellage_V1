interface WireframeBoxProps {
    className?: string;
    color?: string;
    size?: number;
    rarityGlow?: "rare" | "golden" | "dev" | null;
}

type Point = { x: number; y: number };

/* ── Layout parameters for isometric box ── */
const LAYOUT = {
    // viewBox dimensions with safe margins for strokes
    viewBoxWidth: 200,
    viewBoxHeight: 150,

    // Front face dimensions
    frontWidth: 90,
    frontHeight: 60,

    // Isometric offset (back face relative to front)
    offsetX: 35,
    offsetY: -25,

    // Margins from viewBox edges
    marginLeft: 20,
    marginTop: 30,
} as const;

// Calculate vertices from layout parameters
const createVertices = () => {
    const { frontWidth, frontHeight, offsetX, offsetY, marginLeft, marginTop } = LAYOUT;

    const frontLeft = marginLeft;
    const frontTop = marginTop;
    const backLeft = frontLeft + offsetX;
    const backTop = frontTop + offsetY;

    return {
        A: { x: frontLeft, y: frontTop },                           // front top-left
        B: { x: frontLeft + frontWidth, y: frontTop },              // front top-right
        C: { x: frontLeft + frontWidth, y: frontTop + frontHeight }, // front bottom-right
        D: { x: frontLeft, y: frontTop + frontHeight },             // front bottom-left
        E: { x: backLeft, y: backTop },                             // back top-left
        F: { x: backLeft + frontWidth, y: backTop },                // back top-right
        G: { x: backLeft + frontWidth, y: backTop + frontHeight },  // back bottom-right
        H: { x: backLeft, y: backTop + frontHeight },               // back bottom-left
    };
};

const V = createVertices();

/* Tight viewBox around the cube's actual content bounds (+ stroke padding) so the
   box fills the SVG instead of floating inside ~40% of empty margin. */
const BOX_PAD = 4;
const VB = (() => {
    const xs = Object.values(V).map((p) => p.x);
    const ys = Object.values(V).map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
        x: minX - BOX_PAD,
        y: minY - BOX_PAD,
        w: Math.max(...xs) - minX + BOX_PAD * 2,
        h: Math.max(...ys) - minY + BOX_PAD * 2,
    };
})();

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

// Corner radius (smaller = tighter corners, fewer artifacts)
const CORNER_RADIUS = 1.5;

// Outer silhouette of the cube (single closed, rounded loop).
const SILHOUETTE = roundedPath([V.D, V.A, V.E, V.F, V.G, V.C], CORNER_RADIUS, true);
// Visible interior edges that meet at the front-top-right corner B.
const INTERIOR = `${roundedPath([V.A, V.B, V.C], CORNER_RADIUS)} ${seg(V.B, V.F)}`;
// The three hidden edges that meet at the back-bottom-left corner H.
const HIDDEN = `${roundedPath([V.D, V.H, V.E], CORNER_RADIUS)} ${seg(V.H, V.G)}`;
// Front face for the glassy fill (rounded rectangle).
const FRONT_FILL = roundedPath([V.A, V.B, V.C, V.D], CORNER_RADIUS, true);
const TOP_FILL = `M ${V.A.x},${V.A.y} L ${V.E.x},${V.E.y} L ${V.F.x},${V.F.y} L ${V.B.x},${V.B.y} Z`;
const RIGHT_FILL = `M ${V.B.x},${V.B.y} L ${V.F.x},${V.F.y} L ${V.G.x},${V.G.y} L ${V.C.x},${V.C.y} Z`;

export const WireframeBox = ({
    className,
    color = "#4A4132",
    size = 120,
    rarityGlow = null,
}: WireframeBoxProps) => {
    // Minimalist direction: no neon bloom at all — the box reads as crisp
    // colored line-art. Rarity is carried by the stroke colour + faint face
    // fills, not by a glow. (rarityGlow kept in the API for compatibility.)
    void rarityGlow;
    const glowColor: string | null = null;
    const filterId = `glow-${rarityGlow ?? "default"}`;

    return (
        <svg
            width={size}
            height={size * (VB.h / VB.w)}
            viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
            preserveAspectRatio="xMidYMid meet"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ color, maxWidth: "100%", height: "auto" }}
        >
            {glowColor && (
                <defs>
                    <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.1" result="blur" />
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
                {/* ── Faint faces (just enough to give the cube a body) ── */}
                <path className="wf-face" d={TOP_FILL} fill="currentColor" stroke="none" opacity="0.09" />
                <path className="wf-face" d={RIGHT_FILL} fill="currentColor" stroke="none" opacity="0.045" />
                <path className="wf-face" d={FRONT_FILL} fill="currentColor" stroke="none" opacity="0.12" />

                {/* ── Hidden edges (one element → no opacity build-up) ── */}
                <path className="wf-edge wf-edge-hidden" d={HIDDEN} pathLength={1} fill="none" strokeWidth="1.2" opacity="0.34" />

                {/* ── Visible wireframe (crisp, rounded) ── */}
                <path className="wf-edge" d={SILHOUETTE} pathLength={1} fill="none" strokeWidth="1.8" />
                <path className="wf-edge" d={INTERIOR} pathLength={1} fill="none" strokeWidth="1.8" />
            </g>
        </svg>
    );
};
