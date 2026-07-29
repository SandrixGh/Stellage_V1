import { memo } from "react";
import { getContentGlyph } from "./contentGlyphs";

interface WireframeBoxProps {
    className?: string;
    color?: string;
    size?: number;
    rarityGlow?: "rare" | "golden" | "dev" | null;
    /** Тип контента коробки — рисует глиф на передней грани (photo/video/text/…). */
    contentType?: string | null;
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

/* ── Rarity aura ──────────────────────────────────────────────────────────
   Неон переселён с интерфейса на сам товар: Common — чистые линии без свечения,
   у редких коробок — цветная аура растущей силы. Цвет ауры = currentColor
   (цвет редкости), поэтому она следует за темой автоматически. */
const GRAD_BY_RARITY: Record<
    "common" | "rare" | "golden" | "dev",
    { stroke1: string; stroke2: string; opacity: number }
> = {
    common: { stroke1: "#475569", stroke2: "#94A3B8", opacity: 0.85 },
    rare: { stroke1: "#1E3A8A", stroke2: "#3B82F6", opacity: 0.9 },
    golden: { stroke1: "#78350F", stroke2: "#D97706", opacity: 0.95 },
    dev: { stroke1: "#581C87", stroke2: "#A855F7", opacity: 0.95 },
};

/* ── Content glyph placement (front face «canvas») ── */
const GLYPH_SCALE = 2.2;
const GLYPH_STROKE = 1.8;
const GLYPH_CENTER = {
    x: V.A.x + LAYOUT.frontWidth / 2,
    y: V.A.y + LAYOUT.frontHeight / 2,
};
const GLYPH_MIN_SIZE = 44;

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

export const WireframeBox = memo(({
    className,
    color = "var(--box-common)",
    size = 120,
    rarityGlow = null,
    contentType = null,
}: WireframeBoxProps) => {
    const rarityKey = rarityGlow || "common";
    const rarityTheme = GRAD_BY_RARITY[rarityKey];
    
    const strokeGradId = `wf-metal-grad-${rarityKey}`;
    const clipId = `wf-front-clip`;
    const poolRadialId = `wf-pool-radial-${rarityKey}`;
    const topGradId = `wf-top-grad`;
    const frontGradId = `wf-front-grad`;
    const glyph = size >= GLYPH_MIN_SIZE ? getContentGlyph(contentType) : null;

    return (
        <svg
            width={size}
            height={size * (VB.h / VB.w)}
            viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
            preserveAspectRatio="xMidYMid meet"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ color, maxWidth: "100%", height: "auto", overflow: "visible" }}
        >
            <defs>
                {/* Metallic gradient for wireframe edges */}
                <linearGradient id={strokeGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={rarityTheme.stroke1} />
                    <stop offset="100%" stopColor={rarityTheme.stroke2} />
                </linearGradient>

                {glyph && (
                    <>
                        <clipPath id={clipId}>
                            <path d={FRONT_FILL} />
                        </clipPath>
                        <radialGradient id={poolRadialId} cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor={rarityTheme.stroke2} stopOpacity="0.10" />
                            <stop offset="100%" stopColor={rarityTheme.stroke2} stopOpacity="0" />
                        </radialGradient>
                    </>
                )}
                <linearGradient id={topGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id={frontGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
                </linearGradient>
            </defs>

            <g
                stroke={`url(#${strokeGradId})`}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={rarityTheme.opacity}
            >
                {/* ── Solid glass shaded faces ── */}
                <path className="wf-face" d={TOP_FILL} fill={`url(#${topGradId})`} stroke="none" />
                <path className="wf-face" d={RIGHT_FILL} fill="currentColor" stroke="none" opacity={0.02} />
                <path className="wf-face" d={FRONT_FILL} fill={`url(#${frontGradId})`} stroke="none" />

                {/* ── Hidden interior edges ── */}
                <path className="wf-edge wf-edge-hidden" d={HIDDEN} pathLength={1} fill="none" strokeWidth="1" opacity={0.2} />

                {/* ── Visible wireframe silhouette & interior ── */}
                <path className="wf-edge" d={SILHOUETTE} pathLength={1} fill="none" strokeWidth="1.6" />
                <path className="wf-edge" d={INTERIOR} pathLength={1} fill="none" strokeWidth="1.6" />
            </g>

            {/* ── Content-type glyph floating inside the glass cube ── */}
            {glyph && (
                <>
                    <g clipPath={`url(#${clipId})`}>
                        <circle
                            cx={GLYPH_CENTER.x}
                            cy={GLYPH_CENTER.y}
                            r={25}
                            fill={`url(#${poolRadialId})`}
                        />
                    </g>
                    <g
                        className="wf-glyph"
                        transform={`translate(${GLYPH_CENTER.x} ${GLYPH_CENTER.y}) scale(${GLYPH_SCALE}) translate(-12 -12)`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={GLYPH_STROKE}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        {glyph}
                    </g>
                </>
            )}
        </svg>
    );
});
