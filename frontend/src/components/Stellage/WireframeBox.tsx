import { useId } from "react";
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
const GLOW_BY_RARITY: Record<
    "rare" | "golden" | "dev",
    { blur: number; opacity: number }
> = {
    rare: { blur: 3.5, opacity: 0.7 },
    golden: { blur: 5, opacity: 0.85 },
    dev: { blur: 6.5, opacity: 1 },
};

/* Плотность заливки граней. Коробка — объёмный объект (не призрачный контур):
   верхняя грань самая светлая, передняя средняя, боковая тёмная — даёт объём. */
const FACE_OPACITY = {
    top: 0.42,
    front: 0.26,
    right: 0.14,
} as const;

/* ── Content glyph placement (front face «canvas») ──
   Передняя грань — прямоугольник frontWidth×frontHeight в точке (A). Глиф
   рисуется в сетке 24×24 (центр 12,12), масштабируется и центрируется на грани. */
const GLYPH_SCALE = 2.2;
const GLYPH_STROKE = 1.8;
const GLYPH_CENTER = {
    x: V.A.x + LAYOUT.frontWidth / 2,
    y: V.A.y + LAYOUT.frontHeight / 2,
};
// Ниже этого размера глиф не читается — грань оставляем пустой.
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

export const WireframeBox = ({
    className,
    color = "var(--box-common)",
    size = 120,
    rarityGlow = null,
    contentType = null,
}: WireframeBoxProps) => {
    const uid = useId();
    const glow = rarityGlow ? GLOW_BY_RARITY[rarityGlow] : null;
    const filterId = `wf-glow-${uid}`;
    const clipId = `wf-front-clip-${uid}`;
    const poolBlurId = `wf-pool-blur-${uid}`;
    const glyphGlowId = `wf-glyph-glow-${uid}`;
    const glyph = size >= GLYPH_MIN_SIZE ? getContentGlyph(contentType) : null;
    // На полке (size 80) глиф должен быть простым, без ореола — как в ленте
    const isSmallBox = size < 100;

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
                {glow && (
                    <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation={glow.blur} result="blur" />
                        <feFlood floodColor="currentColor" floodOpacity={glow.opacity} result="color" />
                        <feComposite in="color" in2="blur" operator="in" result="glow" />
                        <feMerge>
                            <feMergeNode in="glow" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                )}
                {glyph && (
                    <>
                        {/* Пул света ограничиваем передней гранью — свет «внутри» коробки. */}
                        <clipPath id={clipId}>
                            <path d={FRONT_FILL} />
                        </clipPath>
                        <filter id={poolBlurId} x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="5.5" />
                        </filter>
                        {/* Свечение глифа: бирюзовый ореол вокруг линий — будто он горит. */}
                        <filter id={glyphGlowId} x="-60%" y="-60%" width="220%" height="220%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="b" />
                            <feFlood floodColor="currentColor" floodOpacity="0.9" result="c" />
                            <feComposite in="c" in2="b" operator="in" result="g" />
                            <feMerge>
                                <feMergeNode in="g" />
                                <feMergeNode in="g" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </>
                )}
            </defs>

            <g
                filter={glow ? `url(#${filterId})` : undefined}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {/* ── Solid shaded faces (коробка как объём, а не контур) ── */}
                <path className="wf-face" d={TOP_FILL} fill="currentColor" stroke="none" opacity={FACE_OPACITY.top} />
                <path className="wf-face" d={RIGHT_FILL} fill="currentColor" stroke="none" opacity={FACE_OPACITY.right} />
                <path className="wf-face" d={FRONT_FILL} fill="currentColor" stroke="none" opacity={FACE_OPACITY.front} />

                {/* ── Hidden edges (one element → no opacity build-up) ── */}
                <path className="wf-edge wf-edge-hidden" d={HIDDEN} pathLength={1} fill="none" strokeWidth="1.2" opacity="0.34" />

                {/* ── Visible wireframe (crisp, rounded) ── */}
                <path className="wf-edge" d={SILHOUETTE} pathLength={1} fill="none" strokeWidth="1.8" />
                <path className="wf-edge" d={INTERIOR} pathLength={1} fill="none" strokeWidth="1.8" />
            </g>

            {/* ── Content-type glyph «горит внутри» коробки ──
               Свет типа контента — в цвете самой коробки (currentColor), мягкий пул
               света под глифом ограничен передней гранью — будто горит внутри. */}
            {glyph && (
                <>
                    <g clipPath={`url(#${clipId})`}>
                        <circle
                            cx={GLYPH_CENTER.x}
                            cy={GLYPH_CENTER.y}
                            r={20}
                            fill="currentColor"
                            opacity={0.22}
                            filter={`url(#${poolBlurId})`}
                        />
                    </g>
                    <g
                        className="wf-glyph"
                        filter={!isSmallBox ? `url(#${glyphGlowId})` : undefined}
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
};
