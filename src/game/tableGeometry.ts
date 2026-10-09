/**
 * Table perimeter geometry, ported from the Gemini 2D canvas prototype into
 * this repo's 3D table space.
 *
 * Coordinate mapping:
 * - Gemini canvas used (x, y) with y growing DOWNWARD, 550 x 760.
 * - This table uses (x, z) on the ground plane with +z toward the player
 *   (down-table, toward the flippers). So Gemini +y == our +z.
 * - Slingshot normals are stored as { x, z } where -z means up-table.
 *
 * Table extents: x in [-TABLE_HALF, TABLE_HALF], z in [-TABLE_HALF, TABLE_HALF].
 * The shooter lane lives on the right edge (x ~ LANE_DIVIDER_X..LANE_OUTER_X).
 */

export interface SlingshotNormal {
	x: number;
	z: number;
}

export interface WallSegment {
	/** Start point on the ground plane. */
	x1: number;
	z1: number;
	/** End point on the ground plane. */
	x2: number;
	z2: number;
	restitution?: number;
	isSlingshot?: boolean;
	slingshotNormal?: SlingshotNormal;
	isDropTarget?: boolean;
	targetIndex?: number;
}

export const TABLE_HALF = 13;
export const LANE_DIVIDER_X = 11.2;
export const LANE_OUTER_X = 12.5;
export const LANE_BOTTOM_Z = 12.55;
export const LANE_EXIT_Z = -10;
export const LAUNCH_SPOT = { x: 11.85, y: 1.2, z: 11 } as const;

/** Physics wall height (y) used by Rapier colliders. */
export const WALL_HEIGHT = 0.6;
export const WALL_Y = 0.55;

export interface TableWallOptions {
	oneWayGateClosed: boolean;
	dropTargetsDown: boolean[];
}

/**
 * Full perimeter + lane + slingshots + drop targets.
 * Replaces the 4-box `PlayfieldWalls` in routes/game.tsx once wired up.
 */
export function getTableWalls(opts: TableWallOptions): WallSegment[] {
	const walls: WallSegment[] = [
		// Left outer wall (leaves room for the arched top corners).
		{ x1: -TABLE_HALF, z1: -11, x2: -TABLE_HALF, z2: TABLE_HALF },
		// Bottom wall behind the flippers.
		{
			x1: -TABLE_HALF,
			z1: TABLE_HALF,
			x2: TABLE_HALF,
			z2: TABLE_HALF,
		},
		// Right outer wall (outside the shooter lane).
		{ x1: TABLE_HALF, z1: -11, x2: TABLE_HALF, z2: TABLE_HALF },

		// Arched top: 5 segments forming a shallow dome instead of a flat wall.
		{ x1: -TABLE_HALF, z1: -11, x2: -9, z2: -TABLE_HALF },
		{ x1: -9, z1: -TABLE_HALF, x2: -3, z2: -13.6 },
		{ x1: -3, z1: -13.6, x2: 3, z2: -13.6 },
		{ x1: 3, z1: -13.6, x2: 9, z2: -TABLE_HALF },
		{ x1: 9, z1: -TABLE_HALF, x2: LANE_OUTER_X, z2: -11 },

		// Shooter lane: divider, outer, and bottom cap.
		{ x1: LANE_DIVIDER_X, z1: LANE_EXIT_Z, x2: LANE_DIVIDER_X, z2: 12.6 },
		{ x1: LANE_OUTER_X, z1: -11, x2: LANE_OUTER_X, z2: 12.6 },
		{
			x1: 11.1,
			z1: LANE_BOTTOM_Z,
			x2: 12.6,
			z2: LANE_BOTTOM_Z,
			restitution: 0.2,
		},
		// Top curve deflector: turns the straight -z launch into -x motion
		// so the ball exits through the gap into the playfield.
		{ x1: 12.6, z1: -12.4, x2: 11.4, z2: -10.6 },

		// Inlane guides angling down toward the flipper pivots.
		// Left: outer (-9, 3.5) -> left flipper pivot (-1.6, 5).
		{ x1: -9, z1: 3.5, x2: -1.6, z2: 5.2, restitution: 0.45 },
		// Right: outer (9, 3.5) -> right flipper pivot (1.6, 5).
		{ x1: 9, z1: 3.5, x2: 1.6, z2: 5.2, restitution: 0.45 },
		// Short verticals above the outlanes.
		{ x1: -9, z1: 0.5, x2: -9, z2: 3.5 },
		{ x1: 9, z1: 0.5, x2: 9, z2: 3.5 },

		// Left slingshot kicker edge (Victoria Ave) with outward normal.
		{
			x1: -6.4,
			z1: 0.2,
			x2: -4.6,
			z2: 3.2,
			isSlingshot: true,
			slingshotNormal: { x: 0.86, z: -0.5 },
		},
		{ x1: -6.4, z1: 0.2, x2: -6.4, z2: 2.4 },
		{ x1: -6.4, z1: 2.4, x2: -4.6, z2: 3.2 },

		// Right slingshot kicker edge (Limbe Rail) with outward normal.
		{
			x1: 6.4,
			z1: 0.2,
			x2: 4.6,
			z2: 3.2,
			isSlingshot: true,
			slingshotNormal: { x: -0.86, z: -0.5 },
		},
		{ x1: 6.4, z1: 0.2, x2: 6.4, z2: 2.4 },
		{ x1: 6.4, z1: 2.4, x2: 4.6, z2: 3.2 },

		// Upper-right wormhole deflector guide (funnels toward the kicker).
		{ x1: 8.2, z1: -11, x2: 9.4, z2: -7 },
	];

	// One-way gate: closes the lane exit once the ball is on the playfield
	// so it can't fall back down the shooter lane.
	if (opts.oneWayGateClosed) {
		walls.push({
			x1: LANE_DIVIDER_X,
			z1: LANE_EXIT_Z,
			x2: LANE_OUTER_X,
			z2: -11.8,
			restitution: 0.7,
		});
	}

	// 3 Chileka Radar drop targets along the left ridge.
	const dropCoords: [number, number, number, number][] = [
		[-10.6, -4.5, -10.1, -3.2],
		[-10.6, -2.4, -10.1, -1.1],
		[-10.6, -0.3, -10.1, 1.0],
	];
	dropCoords.forEach(([x1, z1, x2, z2], idx) => {
		if (!opts.dropTargetsDown[idx]) {
			walls.push({
				x1,
				z1,
				x2,
				z2,
				isDropTarget: true,
				targetIndex: idx,
				restitution: 1.15,
			});
		}
	});

	return walls;
}

export interface ColliderPlacement {
	/** Center of the segment on the ground plane. */
	x: number;
	z: number;
	/** Y-rotation (radians) for a box whose length runs along local Z. */
	rotationY: number;
	/** Half of the segment length (box half-extent along local Z). */
	halfLength: number;
	length: number;
}

/**
 * Convert a 2D wall segment into a Rapier/three.js box placement.
 * Pair with `<CuboidCollider args={[0.15, WALL_HEIGHT, halfLength]} />`
 * inside a fixed RigidBody at `[x, WALL_Y, z]` with `rotation={[0, rotationY, 0]}`.
 */
export function segmentToCollider(seg: WallSegment): ColliderPlacement {
	const dx = seg.x2 - seg.x1;
	const dz = seg.z2 - seg.z1;
	const length = Math.hypot(dx, dz);
	return {
		x: (seg.x1 + seg.x2) / 2,
		z: (seg.z1 + seg.z2) / 2,
		rotationY: Math.atan2(dx, dz),
		halfLength: length / 2,
		length,
	};
}

/** Closest point on a segment to (px, pz) — same helper the 2D sim used. */
export function closestPointOnSegment(
	px: number,
	pz: number,
	x1: number,
	z1: number,
	x2: number,
	z2: number,
): { x: number; z: number; t: number } {
	const dx = x2 - x1;
	const dz = z2 - z1;
	const lenSq = dx * dx + dz * dz;
	if (lenSq === 0) return { x: x1, z: z1, t: 0 };
	const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lenSq));
	return { x: x1 + t * dx, z: z1 + t * dz, t };
}
