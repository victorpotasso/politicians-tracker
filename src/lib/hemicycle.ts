/**
 * Generates seat coordinates for a parliamentary hemicycle (the classic
 * "arch" seating diagram). Seats are laid out across concentric rows and
 * returned ordered left → right so that party blocks form clean wedges.
 */

export interface SeatPoint {
  /** Horizontal position, centre of the arch at x = 0. */
  x: number;
  /** Vertical position in maths coordinates (higher = further up the arch). */
  y: number;
  /** Zero-based row index, inner row first. */
  row: number;
  /** Angle along the arch in radians: π (far left) → 0 (far right). */
  angle: number;
}

export interface Hemicycle {
  seats: SeatPoint[];
  /** Radius of the outermost row (maths units). */
  maxRadius: number;
  /** Suggested seat marker radius (maths units). */
  seatRadius: number;
}

const INNER_RADIUS = 1;
const ROW_SPACING = 1;

/** Pick a pleasing number of rows for a given seat count. */
function rowCountFor(total: number): number {
  return Math.max(3, Math.round(Math.sqrt(total) * 0.86));
}

/**
 * Build a hemicycle layout for `total` seats.
 * The returned seats are ordered from the leftmost to the rightmost position.
 */
export function generateHemicycle(total: number): Hemicycle {
  const empty: Hemicycle = { seats: [], maxRadius: 0, seatRadius: 0.32 };
  if (total <= 0) return empty;

  const rows = rowCountFor(total);
  const radii = Array.from({ length: rows }, (_, r) => INNER_RADIUS + r * ROW_SPACING);
  const radiusSum = radii.reduce((a, b) => a + b, 0);

  // Distribute seats across rows proportional to each row's radius.
  const counts = radii.map((rad) => Math.max(1, Math.floor((rad / radiusSum) * total)));
  let assigned = counts.reduce((a, b) => a + b, 0);

  // Reconcile rounding against the true total, adjusting outer rows first.
  let idx = counts.length - 1;
  while (assigned < total) {
    counts[idx] += 1;
    assigned += 1;
    idx = (idx - 1 + counts.length) % counts.length;
  }
  while (assigned > total) {
    if (counts[idx] > 1) {
      counts[idx] -= 1;
      assigned -= 1;
    }
    idx = (idx - 1 + counts.length) % counts.length;
  }

  const seats: SeatPoint[] = [];
  radii.forEach((rad, row) => {
    const n = counts[row];
    for (let s = 0; s < n; s++) {
      const t = n === 1 ? 0.5 : s / (n - 1);
      const angle = Math.PI * (1 - t);
      seats.push({ x: rad * Math.cos(angle), y: rad * Math.sin(angle), row, angle });
    }
  });

  // Order left → right (angle descending), inner rows first on ties.
  seats.sort((a, b) => b.angle - a.angle || a.row - b.row);

  const maxRadius = radii[radii.length - 1];
  return { seats, maxRadius, seatRadius: 0.34 };
}
