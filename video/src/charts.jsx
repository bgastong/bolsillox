import { C, MONO, SANS, alpha } from "./theme";

// Curva suave (Catmull-Rom a Bezier) que pasa por todos los puntos.
export function smoothPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const t = 0.18;
    d += ` C ${p1.x + (p2.x - p0.x) * t} ${p1.y + (p2.y - p0.y) * t}, ${p2.x - (p3.x - p1.x) * t} ${p2.y - (p3.y - p1.y) * t}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/*
Linea con degradado debajo, que se dibuja de izquierda a derecha.
- values: valores; reveal: 0..1 cuanto de la linea se ve.
- color: color de la linea (o colorAt(i) por tramo).
- min/max: rango vertical (si no, se calcula).
*/
export function LineArea({ id, values, width, height, reveal = 1, color = C.income, min, max, markers = [], strokeWidth = 4, pad = 14 }) {
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => ({
    x: pad + (i / (values.length - 1)) * (width - pad * 2),
    y: pad + (1 - (v - lo) / span) * (height - pad * 2),
  }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts.at(-1).x} ${height} L ${pts[0].x} ${height} Z`;
  const clipWidth = pad + reveal * (width - pad);

  return (
    <svg width={width} height={height} style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={alpha(color, 0.28)} />
          <stop offset="100%" stopColor={alpha(color, 0)} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect x={-20} y={-40} width={clipWidth + 20} height={height + 80} />
        </clipPath>
      </defs>
      {/* Lineas guia */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke="rgba(255,255,255,0.05)" strokeWidth={1.5} />
      ))}
      <g clipPath={`url(#${id}-clip)`}>
        <path d={area} fill={`url(#${id}-fill)`} />
        <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* Punto al final de lo dibujado */}
      {reveal > 0.02 && reveal < 1 && (() => {
        const x = pad + reveal * (width - pad * 2);
        const i = Math.min(pts.length - 2, Math.floor(((x - pad) / (width - pad * 2)) * (pts.length - 1)));
        const f = ((x - pad) / (width - pad * 2)) * (pts.length - 1) - i;
        const y = pts[i].y + (pts[i + 1].y - pts[i].y) * f;
        return <circle cx={x} cy={y} r={7} fill={C.bg} stroke={color} strokeWidth={3.5} />;
      })()}
      {/* Marcas (por ejemplo, compras) */}
      {markers.map((m) => {
        const p = pts[m.index];
        return (
          <g key={m.index} opacity={m.opacity} transform={`translate(${p.x} ${p.y}) scale(${m.scale ?? 1})`}>
            <circle r={11} fill={C.fg} stroke={C.bg} strokeWidth={4} />
          </g>
        );
      })}
    </svg>
  );
}

// Arco de torta (angulos en radianes, 0 = arriba).
function arcPath(cx, cy, r, start, end) {
  const a0 = start - Math.PI / 2;
  const a1 = end - Math.PI / 2;
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`;
}

/*
Torta que entra girando (sweep 0..1) con etiquetas afuera.
slices: [{ label, value, color }]. lift: indice de la porcion que sale (o -1).
*/
export function Pie({ slices, size = 420, sweep = 1, labels = 1, lift = -1, liftAmount = 0 }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  // Mientras gira tambien crece desde el centro (entra mas suave).
  const grow = 1 - Math.pow(1 - Math.min(1, sweep * 1.25), 3);
  const r = size * 0.36 * (0.55 + 0.45 * grow);
  const cx = size / 2;
  const cy = size / 2;
  let angle = -Math.PI / 2; // arranca a la izquierda, como en la app
  const parts = slices.map((s, i) => {
    const span = (s.value / total) * Math.PI * 2 * sweep;
    const part = { ...s, i, start: angle, end: angle + span, share: s.value / total };
    angle += span;
    return part;
  });

  return (
    <svg width={size * 1.7} height={size} viewBox={`${-size * 0.35} 0 ${size * 1.7} ${size}`} style={{ overflow: "visible" }}>
      {parts.map((p) => {
        const mid = (p.start + p.end) / 2 - Math.PI / 2;
        const off = p.i === lift ? liftAmount : 0;
        return (
          <path
            key={p.label}
            d={arcPath(cx + Math.cos(mid) * off, cy + Math.sin(mid) * off, r, p.start, p.end)}
            fill={p.color}
            stroke={C.card}
            strokeWidth={4}
            strokeLinejoin="round"
          />
        );
      })}
      {parts
        .filter((p) => p.share >= 0.08)
        .map((p) => {
          const mid = (p.start + p.end) / 2 - Math.PI / 2;
          const right = Math.cos(mid) >= 0;
          const from = { x: cx + Math.cos(mid) * r, y: cy + Math.sin(mid) * r };
          const elbow = { x: cx + Math.cos(mid) * (r + 26), y: cy + Math.sin(mid) * (r + 26) };
          const endX = right ? cx + r + 120 : cx - r - 120;
          return (
            <g key={`l-${p.label}`} opacity={labels}>
              <path d={`M ${from.x} ${from.y} L ${elbow.x} ${elbow.y} L ${endX} ${elbow.y}`} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
              <circle cx={endX} cy={elbow.y} r={5} fill={p.color} />
              <text x={endX + (right ? 14 : -14)} y={elbow.y - 6} textAnchor={right ? "start" : "end"} fill={C.text2} style={{ fontFamily: SANS, fontSize: 22 }}>
                {p.label}
              </text>
              <text x={endX + (right ? 14 : -14)} y={elbow.y + 24} textAnchor={right ? "start" : "end"} fill={C.fg} style={{ fontFamily: MONO, fontSize: 22, fontWeight: 500 }}>
                {Math.round(p.share * 100)}%
              </text>
            </g>
          );
        })}
    </svg>
  );
}
