import { Html } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
	BallCollider,
	CuboidCollider,
	CylinderCollider,
	Physics,
	type RapierRigidBody,
	RigidBody,
} from "@react-three/rapier";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export const Route = createFileRoute("/game")({
	component: GamePage,
});

/* ---------------------------------------------------------- */
/* Curved dashed road, built from a CatmullRom spline          */
/* ---------------------------------------------------------- */

function CurvedRoad({
	points,
	width = 1.4,
}: {
	points: [number, number, number][];
	width?: number;
}) {
	const { roadGeom, dashPositions } = useMemo(() => {
		const curve = new THREE.CatmullRomCurve3(
			points.map((p) => new THREE.Vector3(...p)),
			false,
			"catmullrom",
			0.4,
		);
		const tubeGeom = new THREE.TubeGeometry(curve, 64, width / 2, 8, false);
		// flatten the tube onto the ground (y ~ 0) by squashing radial profile
		tubeGeom.scale(1, 0.02, 1);

		const dashCount = 26;
		const dashPositions: { pos: THREE.Vector3; rot: number }[] = [];
		for (let i = 0; i < dashCount; i++) {
			const t = i / dashCount;
			if (i % 2 === 0) {
				const pos = curve.getPointAt(t);
				const tangent = curve.getTangentAt(t);
				dashPositions.push({
					pos,
					rot: Math.atan2(tangent.x, tangent.z),
				});
			}
		}
		return { roadGeom: tubeGeom, dashPositions };
	}, [points, width]);

	return (
		<group>
			<mesh geometry={roadGeom} position={[0, 0.015, 0]} receiveShadow>
				<meshStandardMaterial color="#3a3f47" roughness={0.95} />
			</mesh>
			{dashPositions.map((d, i) => (
				<mesh
					key={i}
					position={[d.pos.x, 0.03, d.pos.z]}
					rotation={[-Math.PI / 2, 0, -d.rot]}
				>
					<planeGeometry args={[0.12, 0.5]} />
					<meshBasicMaterial color="#e8e8e8" />
				</mesh>
			))}
		</group>
	);
}

/* ---------------------------------------------------------- */
/* Rolling terrain — a displaced green plane, not flat         */
/* ---------------------------------------------------------- */

function Terrain() {
	const geom = useMemo(() => {
		const g = new THREE.PlaneGeometry(26, 26, 60, 60);
		const pos = g.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			const h =
				Math.sin(x * 0.25) * 0.15 +
				Math.cos(y * 0.22) * 0.15 +
				Math.sin((x + y) * 0.15) * 0.1;
			pos.setZ(i, h);
		}
		g.computeVertexNormals();
		return g;
	}, []);

	return (
		<mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
			<meshStandardMaterial color="#6fb542" roughness={0.95} />
		</mesh>
	);
}

/* ---------------------------------------------------------- */
/* Buildings — varied roof types                               */
/* ---------------------------------------------------------- */

type Roof = "flat" | "pitched" | "dome";

function Building({
	position,
	size,
	color,
	roof = "flat",
	roofColor = "#c4735a",
}: {
	position: [number, number, number];
	size: [number, number, number];
	color: string;
	roof?: Roof;
	roofColor?: string;
}) {
	const [w, h, d] = size;
	return (
		<RigidBody type="fixed" colliders={false} position={position}>
			<mesh castShadow receiveShadow position={[0, h / 2, 0]}>
				<boxGeometry args={[w, h, d]} />
				<meshStandardMaterial color={color} roughness={0.85} metalness={0.05} />
			</mesh>

			{roof === "pitched" && (
				<mesh
					castShadow
					position={[0, h + 0.15, 0]}
					rotation={[0, Math.PI / 4, 0]}
				>
					<coneGeometry args={[w * 0.75, 0.35, 4]} />
					<meshStandardMaterial color={roofColor} roughness={0.8} />
				</mesh>
			)}
			{roof === "dome" && (
				<mesh castShadow position={[0, h + 0.15, 0]}>
					<sphereGeometry
						args={[w * 0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
					/>
					<meshStandardMaterial color={roofColor} roughness={0.6} />
				</mesh>
			)}

			<CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
		</RigidBody>
	);
}

function Tree({ position }: { position: [number, number, number] }) {
	return (
		<RigidBody type="fixed" colliders={false} position={position}>
			<mesh castShadow position={[0, 0.2, 0]}>
				<cylinderGeometry args={[0.05, 0.07, 0.4, 6]} />
				<meshStandardMaterial color="#8a6142" />
			</mesh>
			<mesh castShadow position={[0, 0.55, 0]}>
				<coneGeometry args={[0.28, 0.6, 8]} />
				<meshStandardMaterial color="#4c8a3f" roughness={0.9} />
			</mesh>
			<CylinderCollider args={[0.3, 0.28]} position={[0, 0.3, 0]} />
		</RigidBody>
	);
}

/* ---------------------------------------------------------- */
/* Location pin label, like "OG Eatery" / "Hostaria Restaurant"*/
/* ---------------------------------------------------------- */

function LocationPin({
	position,
	label,
}: {
	position: [number, number, number];
	label: string;
}) {
	return (
		<group position={position}>
			<Html center distanceFactor={12} occlude={false}>
				<div className="pointer-events-none whitespace-nowrap rounded-md border border-slate-300 bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow">
					{label}
				</div>
			</Html>
		</group>
	);
}

/* ---------------------------------------------------------- */
/* Landmark domes (large rounded buildings)                    */
/* ---------------------------------------------------------- */

function Landmark({
	position,
	color,
	radius = 0.9,
	height = 0.7,
	onHit,
}: {
	position: [number, number, number];
	color: string;
	radius?: number;
	height?: number;
	onHit?: (pos: [number, number, number]) => void;
}) {
	return (
		<RigidBody
			type="fixed"
			colliders={false}
			position={position}
			restitution={0.7}
			onCollisionEnter={() => onHit?.(position)}
		>
			<mesh castShadow position={[0, height / 2, 0]}>
				<cylinderGeometry args={[radius, radius, height, 32]} />
				<meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
			</mesh>
			<mesh castShadow position={[0, height + radius * 0.35, 0]}>
				<sphereGeometry
					args={[radius * 0.75, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
				/>
				<meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
			</mesh>
			<CylinderCollider
				args={[height / 2, radius]}
				position={[0, height / 2, 0]}
			/>
		</RigidBody>
	);
}

/* ---------------------------------------------------------- */
/* Gameplay elements (bumpers / flippers / launch gates / ball)*/
/* ---------------------------------------------------------- */

function PinballBumper({
	position,
	color,
	onHit,
}: {
	position: [number, number, number];
	color: string;
	onHit?: (bumperPos: [number, number, number]) => void;
}) {
	const [flash, setFlash] = useState(false);
	const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (flashTimeout.current) clearTimeout(flashTimeout.current);
		};
	}, []);

	return (
		<RigidBody
			type="fixed"
			colliders={false}
			position={position}
			restitution={1.1}
			friction={0}
			onCollisionEnter={() => {
				onHit?.(position);
				setFlash(true);
				if (flashTimeout.current) clearTimeout(flashTimeout.current);
				flashTimeout.current = setTimeout(() => setFlash(false), 130);
			}}
		>
			<mesh castShadow>
				<cylinderGeometry args={[0.45, 0.45, 0.4, 32]} />
				<meshStandardMaterial
					color={color}
					metalness={0.6}
					roughness={0.35}
					emissive={color}
					emissiveIntensity={flash ? 1.6 : 0}
				/>
			</mesh>
			<CylinderCollider args={[0.4, 0.45]} restitution={1.1} friction={0} />
		</RigidBody>
	);
}

function Flipper({
	position,
	rotation,
	side,
}: {
	position: [number, number, number];
	rotation: [number, number, number];
	side: "left" | "right";
}) {
	const kickerX = side === "left" ? -1.5 : 1.5;
	return (
		<group>
			<RigidBody
				type="fixed"
				colliders={false}
				position={position}
				rotation={rotation}
			>
				<mesh castShadow>
					<boxGeometry args={[2.4, 0.25, 0.5]} />
					<meshStandardMaterial
						color="#0d3b66"
						metalness={0.5}
						roughness={0.4}
					/>
				</mesh>
				<CuboidCollider args={[1.2, 0.125, 0.25]} />
			</RigidBody>
			<mesh
				position={[position[0] + kickerX, position[1], position[2]]}
				castShadow
			>
				<capsuleGeometry args={[0.22, 0.5, 8, 16]} />
				<meshStandardMaterial color="#fdbc13" metalness={0.6} roughness={0.3} />
			</mesh>
		</group>
	);
}

/** Big angled entrance walls at the bottom of the table, like the reference image */
function LaunchGate({
	position,
	rotationY,
}: {
	position: [number, number, number];
	rotationY: number;
}) {
	return (
		<RigidBody
			type="fixed"
			colliders={false}
			position={position}
			rotation={[0, rotationY, 0]}
		>
			<mesh castShadow>
				<boxGeometry args={[0.3, 1.2, 3.4]} />
				<meshStandardMaterial color="#0d3b66" metalness={0.5} roughness={0.4} />
			</mesh>
			<mesh position={[0, -0.5, 1.6]} castShadow>
				<boxGeometry args={[0.4, 0.2, 0.6]} />
				<meshStandardMaterial color="#fdbc13" metalness={0.6} roughness={0.3} />
			</mesh>
			<CuboidCollider args={[0.15, 0.6, 1.7]} />
		</RigidBody>
	);
}

function Pinball({
	position,
	bodyRef,
}: {
	position: [number, number, number];
	bodyRef: React.MutableRefObject<RapierRigidBody | null>;
}) {
	return (
		<RigidBody
			ref={bodyRef}
			colliders={false}
			position={position}
			restitution={0.35}
			friction={0.2}
			linearDamping={0.05}
			ccd
			canSleep={false}
		>
			<mesh castShadow>
				<sphereGeometry args={[0.5, 48, 48]} />
				<meshStandardMaterial
					color="#fdbc13"
					metalness={0.8}
					roughness={0.25}
				/>
			</mesh>
			<BallCollider args={[0.5]} />
		</RigidBody>
	);
}

/* ---------------------------------------------------------- */
/* 2D keyboard controls — move the ball up/down (Z) and       */
/* left/right (X) on the flat playfield, like pinball.         */
/* ---------------------------------------------------------- */

function useKeys() {
	const [keys, setKeys] = useState({
		up: false,
		down: false,
		left: false,
		right: false,
	});

	useEffect(() => {
		const keyToDir: Record<string, keyof typeof keys> = {
			ArrowUp: "up",
			KeyW: "up",
			ArrowDown: "down",
			KeyS: "down",
			ArrowLeft: "left",
			KeyA: "left",
			ArrowRight: "right",
			KeyD: "right",
		};
		const update = (code: string, pressed: boolean) => {
			const dir = keyToDir[code];
			if (!dir) return;
			setKeys((prev) =>
				prev[dir] === pressed ? prev : { ...prev, [dir]: pressed },
			);
		};
		const onDown = (e: KeyboardEvent) => update(e.code, true);
		const onUp = (e: KeyboardEvent) => update(e.code, false);
		window.addEventListener("keydown", onDown);
		window.addEventListener("keyup", onUp);
		return () => {
			window.removeEventListener("keydown", onDown);
			window.removeEventListener("keyup", onUp);
		};
	}, []);

	return keys;
}

/** Steers the ball with horizontal force; the tilted gravity keeps pulling it down the board.
 *  Steering is disabled until the ball has been launched. */
function BallController({
	bodyRef,
	launched,
}: {
	bodyRef: React.MutableRefObject<RapierRigidBody | null>;
	launched: boolean;
}) {
	const keys = useKeys();

	useFrame((_, dt) => {
		const body = bodyRef.current;
		if (!body || !launched) return;
		const linvel = body.linvel();
		let { x, z } = linvel;

		if (keys.left) x = Math.max(x - 12 * dt, -8);
		if (keys.right) x = Math.min(x + 12 * dt, 8);
		if (keys.up) z = Math.max(z - 12 * dt, -6);
		if (keys.down) z = Math.min(z + 12 * dt, 10);

		body.setLinvel({ x, y: linvel.y, z }, true);
	});

	return null;
}

/* ---------------------------------------------------------- */
/* Launch tube — the ball starts here, and the player charges */
/* a plunger to shoot it up onto the playfield.                */
/* ---------------------------------------------------------- */

/* ---------------------------------------------------------- */
/* Shooter lane — a separated tube feeding the playfield.      */
/* The lane runs the full table height on the right edge. A    */
/* diagonal deflector at the top turns the ball's straight -Z  */
/* launch into -X motion, sending it through the exit gap in   */
/* the divider and into the playfield. Without that curve the  */
/* ball bounces off the top wall straight back down the lane.  */
/* ---------------------------------------------------------- */

/** Holds the ball in a side lane. The plunger rod retracts as the player
 *  charges power (driven by `powerRef`), like a real pinball plunger. */
function ShooterLane({
	powerRef,
}: {
	powerRef: React.MutableRefObject<number>;
}) {
	const rodRef = useRef<THREE.Group>(null);

	useFrame(() => {
		const rod = rodRef.current;
		if (rod) rod.position.z = 13.4 + powerRef.current * 2.4;
	});

	return (
		<group>
			{/* divider between lane and playfield (z -10..12.6).
                The gap at the top (z -13..-10) is the exit into the playfield. */}
			<RigidBody type="fixed" colliders={false} position={[11.2, 0.55, 1.3]}>
				<CuboidCollider args={[0.15, 0.6, 11.3]} />
			</RigidBody>
			{/* outer lane wall, full height so the ball can't escape right */}
			<RigidBody type="fixed" colliders={false} position={[12.5, 0.55, -0.2]}>
				<CuboidCollider args={[0.15, 0.6, 12.8]} />
			</RigidBody>
			{/* bottom cap — keeps the ball in the lane until launch */}
			<RigidBody type="fixed" colliders={false} position={[11.85, 0.55, 12.55]}>
				<CuboidCollider args={[0.75, 0.6, 0.15]} />
			</RigidBody>
			{/* top curve: diagonal deflector turns -Z motion into -X motion */}
			<RigidBody
				type="fixed"
				colliders={false}
				position={[12.05, 0.55, -11.6]}
				rotation={[0, Math.PI / 4, 0]}
			>
				<CuboidCollider args={[0.15, 0.6, 1.6]} />
			</RigidBody>

			{/* visual walls */}
			<mesh position={[11.2, 0.55, 1.3]} castShadow>
				<boxGeometry args={[0.3, 1.1, 22.6]} />
				<meshStandardMaterial color="#7a5a34" />
			</mesh>
			<mesh position={[12.5, 0.55, -0.2]} castShadow>
				<boxGeometry args={[0.3, 1.1, 25.6]} />
				<meshStandardMaterial color="#7a5a34" />
			</mesh>
			<mesh position={[11.85, 0.55, 12.55]} castShadow>
				<boxGeometry args={[1.5, 1.1, 0.15]} />
				<meshStandardMaterial color="#7a5a34" />
			</mesh>
			<mesh
				position={[12.05, 0.55, -11.6]}
				rotation={[0, Math.PI / 4, 0]}
				castShadow
			>
				<boxGeometry args={[0.3, 1.2, 3.2]} />
				<meshStandardMaterial color="#0d3b66" metalness={0.5} roughness={0.4} />
			</mesh>

			{/* plunger rod + knob, pulled back as power charges */}
			<group ref={rodRef} position={[11.85, 0.55, 13.4]}>
				<mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
					<cylinderGeometry args={[0.18, 0.18, 2.4, 16]} />
					<meshStandardMaterial
						color="#fdbc13"
						metalness={0.7}
						roughness={0.3}
					/>
				</mesh>
				<mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.3, 0]} castShadow>
					<cylinderGeometry args={[0.26, 0.26, 0.15, 16]} />
					<meshStandardMaterial color="#ba1a1a" />
				</mesh>
			</group>
		</group>
	);
}

/** Vertical power meter next to the launch tube; fills and turns red→green as you charge. */
function PowerMeter({
	powerRef,
}: {
	powerRef: React.MutableRefObject<number>;
}) {
	const barRef = useRef<THREE.Mesh>(null);
	const matRef = useRef<THREE.MeshStandardMaterial>(null);

	useFrame(() => {
		const bar = barRef.current;
		if (!bar) return;
		const p = powerRef.current;
		bar.scale.y = Math.max(p, 0.001);
		if (matRef.current) matRef.current.color.setHSL(0.33 * (1 - p), 0.85, 0.45);
	});

	return (
		<group position={[11.85, 0, 10.4]}>
			<mesh position={[0, 0.05, 0]}>
				<boxGeometry args={[0.24, 0.1, 0.1]} />
				<meshStandardMaterial color="#3f3f3f" />
			</mesh>
			<mesh ref={barRef} position={[0, 1.4, 0]}>
				<boxGeometry args={[0.18, 2.8, 0.08]} />
				<meshStandardMaterial ref={matRef} color="#3f6212" />
			</mesh>
			<mesh position={[0, 2.8, 0]}>
				<boxGeometry args={[0.24, 0.1, 0.1]} />
				<meshStandardMaterial color="#3f3f3f" />
			</mesh>
		</group>
	);
}

/** Hold SPACE to charge, release to launch the ball up the playfield.
 *  Low power drops the ball near the flippers; full power sends it at the bumpers.
 *  `enabled` is false while a ball is live — it re-arms after a drain so the
 *  next ball can be launched. */
function LauncherController({
	bodyRef,
	powerRef,
	enabled,
	onLaunch,
}: {
	bodyRef: React.MutableRefObject<RapierRigidBody | null>;
	powerRef: React.MutableRefObject<number>;
	enabled: boolean;
	onLaunch: () => void;
}) {
	const holding = useRef(false);
	const fired = useRef(false);
	const enabledRef = useRef(enabled);
	enabledRef.current = enabled;

	useEffect(() => {
		if (enabled) {
			fired.current = false;
			powerRef.current = 0;
		} else {
			holding.current = false;
		}
	}, [enabled, powerRef]);

	useEffect(() => {
		const onDown = (e: KeyboardEvent) => {
			if (e.code === "Space" && enabledRef.current && !fired.current) {
				holding.current = true;
				e.preventDefault();
			}
		};
		const onUp = (e: KeyboardEvent) => {
			if (e.code !== "Space") return;
			holding.current = false;
			if (fired.current || !enabledRef.current) return;
			const body = bodyRef.current;
			if (!body) return;
			fired.current = true;
			const power = powerRef.current;
			const speed = 8 + power * 18;
			body.setLinvel({ x: 0, y: 0.5, z: -speed }, true);
			onLaunch();
		};
		window.addEventListener("keydown", onDown);
		window.addEventListener("keyup", onUp);
		return () => {
			window.removeEventListener("keydown", onDown);
			window.removeEventListener("keyup", onUp);
		};
	}, [bodyRef, powerRef, onLaunch]);

	useFrame((_, dt) => {
		if (holding.current && !fired.current && enabledRef.current) {
			powerRef.current = Math.min(powerRef.current + dt / 1.6, 1);
		}
	});

	return null;
}

/** Watches for a drained ball (fell past the flippers toward the player)
 *  and reports it once per ball. The launch lane (x ~= 11.85) is excluded
 *  so the parked ball doesn't count as drained. */
function DrainWatcher({
	bodyRef,
	launched,
	onDrain,
}: {
	bodyRef: React.MutableRefObject<RapierRigidBody | null>;
	launched: boolean;
	onDrain: () => void;
}) {
	const launchedRef = useRef(launched);
	launchedRef.current = launched;
	const onDrainRef = useRef(onDrain);
	onDrainRef.current = onDrain;

	useFrame(() => {
		const body = bodyRef.current;
		if (!body || !launchedRef.current) return;
		const t = body.translation();
		const inLaunchLane = Math.abs(t.x - 11.85) < 1.0 && t.z > 6;
		if (t.y < -2) {
			onDrainRef.current();
		} else if (!inLaunchLane && t.z > 9.5 && t.y < 2) {
			onDrainRef.current();
		}
	});

	return null;
}

/** Recovers a ball that settles back into the shooter lane — a weak launch
 *  that never reached the top curve, or a live ball that fell back in.
 *  Like a real table it ends up parked on the plunger, so we re-arm
 *  SPACE instead of draining the ball. */
function LaneWatcher({
	bodyRef,
	launched,
	onBackToShooter,
}: {
	bodyRef: React.MutableRefObject<RapierRigidBody | null>;
	launched: boolean;
	onBackToShooter: () => void;
}) {
	const launchedRef = useRef(launched);
	launchedRef.current = launched;
	const cbRef = useRef(onBackToShooter);
	cbRef.current = onBackToShooter;
	const stillFrames = useRef(0);

	useFrame(() => {
		const body = bodyRef.current;
		if (!body || !launchedRef.current) {
			stillFrames.current = 0;
			return;
		}
		let inLane = false;
		let speed = 99;
		try {
			const t = body.translation();
			const v = body.linvel();
			speed = Math.hypot(v.x, v.y, v.z);
			inLane = t.x > 10.7 && t.x < 13 && t.z > 5.5 && t.z < 13.2 && t.y < 2.5;
		} catch {
			stillFrames.current = 0;
			return;
		}
		if (inLane && speed < 1.2) {
			stillFrames.current += 1;
			if (stillFrames.current > 45) {
				stillFrames.current = 0;
				cbRef.current();
			}
		} else {
			stillFrames.current = 0;
		}
	});

	return null;
}

/** Frees a ball wedged between two obstacles. If the ball barely changes
 *  position over ~2.5s while live (displacement-based, so a rocking ball
 *  still counts), it gets a random kick with a small hop — like shaking
 *  a real machine. Skips the shooter lane (LaneWatcher owns that). */
function StuckWatcher({
	bodyRef,
	launched,
	onStuck,
}: {
	bodyRef: React.MutableRefObject<RapierRigidBody | null>;
	launched: boolean;
	onStuck: () => void;
}) {
	const launchedRef = useRef(launched);
	launchedRef.current = launched;
	const cbRef = useRef(onStuck);
	cbRef.current = onStuck;
	const anchor = useRef<{ x: number; y: number; z: number } | null>(null);
	const frames = useRef(0);
	const cooldown = useRef(0);

	useFrame(() => {
		const body = bodyRef.current;
		if (!body || !launchedRef.current) {
			anchor.current = null;
			frames.current = 0;
			cooldown.current = 0;
			return;
		}
		if (cooldown.current > 0) {
			cooldown.current -= 1;
			return;
		}
		let t: { x: number; y: number; z: number };
		try {
			t = body.translation();
		} catch {
			return;
		}
		const inLane = t.x > 10.7 && t.x < 13 && t.z > 5.5 && t.z < 13.2;
		if (inLane || t.y > 2.5 || t.y < -2) {
			anchor.current = null;
			frames.current = 0;
			return;
		}
		if (!anchor.current) {
			anchor.current = { x: t.x, y: t.y, z: t.z };
			frames.current = 0;
			return;
		}
		frames.current += 1;
		if (frames.current >= 150) {
			const dx = t.x - anchor.current.x;
			const dy = t.y - anchor.current.y;
			const dz = t.z - anchor.current.z;
			const moved = Math.hypot(dx, dy, dz);
			anchor.current = { x: t.x, y: t.y, z: t.z };
			frames.current = 0;
			if (moved < 0.45) {
				cooldown.current = 150;
				cbRef.current();
			}
		}
	});

	return null;
}

/** Fixed walls around the playfield so the ball never leaves the boards. */
function PlayfieldWalls() {
	return (
		<group>
			<RigidBody type="fixed" colliders={false} position={[0, -0.5, -13]}>
				<CuboidCollider args={[13, 1, 0.35]} />
			</RigidBody>
			<RigidBody type="fixed" colliders={false} position={[0, -0.5, 13]}>
				<CuboidCollider args={[13, 1, 0.35]} />
			</RigidBody>
			<RigidBody type="fixed" colliders={false} position={[-13, -0.5, 0]}>
				<CuboidCollider args={[0.35, 1, 26]} />
			</RigidBody>
			<RigidBody type="fixed" colliders={false} position={[13, -0.5, 0]}>
				<CuboidCollider args={[0.35, 1, 26]} />
			</RigidBody>
		</group>
	);
}

/* ---------------------------------------------------------- */
/* HUD                                                          */
/* ---------------------------------------------------------- */

function HUD({
	score,
	highScore,
	balls,
	multiplier,
	launched,
	notice,
}: {
	score: number;
	highScore: number;
	balls: number;
	multiplier: number;
	launched: boolean;
	notice: string | null;
}) {
	return (
		<div className="pointer-events-none absolute inset-0 z-10">
			<div className="flex items-start justify-between p-4">
				<div className="pointer-events-auto rounded-2xl bg-white/80 px-5 py-3 backdrop-blur-sm shadow-md">
					<div className="text-xs font-semibold tracking-wide text-slate-500">
						CURRENT SCORE
					</div>
					<div className="text-3xl font-bold text-slate-900">
						{score.toLocaleString()}
					</div>
				</div>

				<div className="pointer-events-auto flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 shadow-md">
					<span className="text-amber-500">⚡</span>
					<span className="text-sm font-bold text-slate-800">
						x{multiplier}
					</span>
				</div>

				<div className="pointer-events-auto rounded-2xl bg-white/80 px-5 py-3 backdrop-blur-sm shadow-md">
					<div className="text-xs font-semibold tracking-wide text-slate-500">
						HIGH SCORE
					</div>
					<div className="text-3xl font-bold text-slate-900">
						{highScore.toLocaleString()}
					</div>
				</div>
			</div>

			{notice && (
				<div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-secondary-container px-4 py-2 text-sm font-bold text-on-secondary-container shadow-md">
					{notice}
				</div>
			)}

			<div className="absolute bottom-6 left-4 right-4 flex items-center justify-between">
				<div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 backdrop-blur-sm shadow-md">
					<span>⚾</span>
					<span className="font-semibold text-slate-900">BALLS: {balls}</span>
				</div>

				{balls === 0 ? (
					<div className="pointer-events-auto rounded-2xl bg-white/80 px-5 py-3 text-center backdrop-blur-sm shadow-md">
						<div className="text-xs font-semibold tracking-wide text-slate-500">
							GAME OVER
						</div>
						<div className="font-bold text-slate-900">
							Out of balls — refresh to play again
						</div>
					</div>
				) : (
					!launched && (
						<div className="pointer-events-auto rounded-2xl bg-white/80 px-5 py-3 text-center backdrop-blur-sm shadow-md">
							<div className="text-xs font-semibold tracking-wide text-slate-500">
								LAUNCH
							</div>
							<div className="font-bold text-slate-900">
								Hold{" "}
								<kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-sm">
									SPACE
								</kbd>{" "}
								to charge, release to launch
							</div>
						</div>
					)
				)}

				<button className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-xl backdrop-blur-sm shadow-md">
					⏸
				</button>
			</div>
		</div>
	);
}

/* ---------------------------------------------------------- */
/* Layout data                                                  */
/* ---------------------------------------------------------- */

const ROAD_A: [number, number, number][] = [
	[-8, 0, -9],
	[-6, 0, -9.5],
	[-2, 0, -9],
	[2, 0, -8.5],
	[5, 0, -9],
	[7.5, 0, -7],
];
const ROAD_B: [number, number, number][] = [
	[-8, 0, -2],
	[-6.5, 0, -3.5],
	[-4, 0, -4.2],
	[0, 0, -3.8],
	[3, 0, -4],
	[6, 0, -3],
	[8, 0, -1],
];
const ROAD_C: [number, number, number][] = [
	[7.5, 0, -7],
	[8.5, 0, -3],
	[8, 0, 1],
	[5, 0, 3.5],
];
const ROAD_D: [number, number, number][] = [
	[-2, 0, -8.8],
	[-1.5, 0, -4],
	[-1, 0, 0],
	[-1.6, 0, 3],
];
const ROAD_E: [number, number, number][] = [
	[-8, 0, -2],
	[-8.5, 0, 1],
	[-7, 0, 3.5],
];

const BUILDINGS: {
	position: [number, number, number];
	size: [number, number, number];
	color: string;
	roof?: Roof;
	roofColor?: string;
}[] = [
	{
		position: [-6.2, 0, -8.4],
		size: [1.1, 1.1, 1.1],
		color: "#e8d9c0",
		roof: "pitched",
	},
	{
		position: [-4.8, 0, -9],
		size: [0.9, 0.85, 0.9],
		color: "#f2e6d0",
		roof: "pitched",
	},
	{
		position: [-3.4, 0, -8.6],
		size: [1.2, 0.7, 1.2],
		color: "#e0b9a8",
		roof: "flat",
	},
	{
		position: [3.8, 0, -8.6],
		size: [1.1, 0.85, 1.1],
		color: "#f2e6d0",
		roof: "pitched",
	},
	{
		position: [5.6, 0, -7.9],
		size: [1, 1.3, 1],
		color: "#dfe7ee",
		roof: "flat",
	},
	{
		position: [-8.2, 0, -2.6],
		size: [0.9, 0.7, 0.9],
		color: "#e8d9c0",
		roof: "pitched",
	},
	{
		position: [-7.6, 0, 0.4],
		size: [0.8, 0.65, 1.6],
		color: "#f2e6d0",
		roof: "flat",
	},
	{
		position: [7.7, 0, -1.2],
		size: [0.9, 0.7, 0.9],
		color: "#e0b9a8",
		roof: "pitched",
	},
	{
		position: [7.2, 0, 1.8],
		size: [1.2, 1.5, 1.2],
		color: "#c9d3dc",
		roof: "flat",
	},
	{
		position: [-2.95, 0, -4.8],
		size: [0.9, 0.7, 0.9],
		color: "#f2e6d0",
		roof: "pitched",
	},
	{
		position: [2.4, 0, -4.6],
		size: [0.8, 0.65, 0.8],
		color: "#e8d9c0",
		roof: "pitched",
	},
	{
		position: [-1.2, 0, 0.6],
		size: [1.3, 0.7, 0.8],
		color: "#f4c9a8",
		roof: "flat",
	},
	{
		position: [4.2, 0, -1.8],
		size: [1, 1.6, 1],
		color: "#dce5ee",
		roof: "flat",
	},
];

const TREES: [number, number, number][] = [
	[-5.4, 0, -6.6],
	[-2.8, 0, -7.2],
	[1, 0, -6.5],
	[4.6, 0, -5.8],
	[-6.8, 0, -1],
	[6.3, 0, -3.5],
	[-3.6, 0, 1.2],
	[2.8, 0, 1.6],
];

/* ---------------------------------------------------------- */
/* Scene                                                        */
/* ---------------------------------------------------------- */

/** Fixed pinball view: camera sits behind the flippers (player side) and
 *  looks back up the table at the bumpers, framing the whole playfield. */
function PinballCamera() {
	const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

	useEffect(() => {
		camera.position.set(0, 16, 21);
		camera.fov = 50;
		camera.lookAt(0, 0.5, -2);
		camera.updateProjectionMatrix();
	}, [camera]);

	return null;
}

function GamePage() {
	const [score, setScore] = useState(0);
	const [highScore, setHighScore] = useState(5_000_000);
	const [balls, setBalls] = useState(3);
	const [multiplier, setMultiplier] = useState(1);
	const [launched, setLaunched] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const ballRef = useRef<RapierRigidBody | null>(null);
	const powerRef = useRef(0);
	const hitsRef = useRef(0);
	const multiplierRef = useRef(1);
	const drainingRef = useRef(false);
	const noticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const LAUNCH_SPOT = useMemo(() => ({ x: 11.85, y: 1.2, z: 11 }), []);

	useEffect(() => {
		setHighScore((h) => (score > h ? score : h));
	}, [score]);

	const kickBallFrom = (pos: [number, number, number], strength = 2.2) => {
		const body = ballRef.current;
		if (!body) return;
		try {
			const t = body.translation();
			const dx = t.x - pos[0];
			const dz = t.z - pos[2];
			const len = Math.hypot(dx, dz) || 1;
			body.applyImpulse(
				{ x: (dx / len) * strength, y: 0.6, z: (dz / len) * strength },
				true,
			);
		} catch {
			/* physics not ready yet */
		}
	};

	const bumpMultiplier = () => {
		hitsRef.current += 1;
		if (hitsRef.current % 8 === 0 && multiplierRef.current < 8) {
			multiplierRef.current += 1;
			setMultiplier(multiplierRef.current);
		}
	};

	const handleBumperHit = (pos: [number, number, number]) => {
		if (!launched) return;
		kickBallFrom(pos, 2.4);
		bumpMultiplier();
		setScore((s) => s + 500 * multiplierRef.current);
	};

	const handleLandmarkHit = (pos: [number, number, number]) => {
		if (!launched) return;
		kickBallFrom(pos, 1.4);
		bumpMultiplier();
		setScore((s) => s + 2000 * multiplierRef.current);
	};

	const handleLaunch = () => {
		drainingRef.current = false;
		setLaunched(true);
	};

	const flashNotice = (text: string) => {
		setNotice(text);
		if (noticeTimeout.current) clearTimeout(noticeTimeout.current);
		noticeTimeout.current = setTimeout(() => setNotice(null), 1600);
	};

	/** Random kick to free a wedged ball — doesn't score, just keeps play moving. */
	const handleStuck = () => {
		if (!launched) return;
		const body = ballRef.current;
		if (!body) return;
		try {
			const angle = Math.random() * Math.PI * 2;
			body.applyImpulse(
				{ x: Math.cos(angle) * 5, y: 2.0, z: Math.sin(angle) * 5 },
				true,
			);
		} catch {
			/* physics not ready yet */
		}
		flashNotice("Stuck ball — auto nudge!");
	};

	const resetBallToShooter = () => {
		const body = ballRef.current;
		try {
			body?.setTranslation(LAUNCH_SPOT, true);
			body?.setLinvel({ x: 0, y: 0, z: 0 }, true);
			body?.setAngvel({ x: 0, y: 0, z: 0 }, true);
		} catch {
			/* ignore reset errors */
		}
		powerRef.current = 0;
	};

	const handleDrain = () => {
		if (drainingRef.current || !launched) return;
		drainingRef.current = true;
		resetBallToShooter();
		multiplierRef.current = 1;
		setMultiplier(1);
		setLaunched(false);
		setBalls((b) => Math.max(0, b - 1));
		setTimeout(() => {
			drainingRef.current = false;
		}, 500);
	};

	/** Ball settled back in the lane — park it on the plunger and re-arm,
	 *  without costing a ball. */
	const handleLaneReturn = () => {
		if (!launched) return;
		resetBallToShooter();
		setLaunched(false);
	};

	return (
		<main className="relative h-screen w-screen overflow-hidden bg-surface">
			<HUD
				score={score}
				highScore={highScore}
				balls={balls}
				multiplier={multiplier}
				launched={launched}
				notice={notice}
			/>

			<Canvas shadows camera={{ position: [0, 16, 12], fov: 45 }}>
				<color attach="background" args={["#eaf3e6"]} />
				<fog attach="fog" args={["#eaf3e6", 30, 70]} />

				<ambientLight intensity={0.7} />
				<directionalLight
					position={[10, 18, 8]}
					intensity={1.5}
					castShadow
					shadow-mapSize-width={2048}
					shadow-mapSize-height={2048}
				/>

				{/* Tilted gravity: pulls the ball down the board (+Z toward the player) like a real pinball machine */}
				<Physics gravity={[0, -9.4, 3.4]}>
					{/* Rolling terrain floor + flat collider underneath it */}
					<RigidBody type="fixed" colliders={false} position={[0, -0.25, 0]}>
						<Terrain />
						<CuboidCollider args={[13, 0.25, 13]} />
					</RigidBody>

					{/* Curved dashed roads */}
					<CurvedRoad points={ROAD_A} />
					<CurvedRoad points={ROAD_B} />
					<CurvedRoad points={ROAD_C} width={1.2} />
					<CurvedRoad points={ROAD_D} width={1.1} />
					<CurvedRoad points={ROAD_E} width={1.1} />

					{/* City buildings with varied roofs */}
					{BUILDINGS.map((b, i) => (
						<Building key={i} {...b} />
					))}

					{/* Trees */}
					{TREES.map((pos, i) => (
						<Tree key={i} position={pos} />
					))}

					{/* Big landmark domes — bonus targets */}
					<Landmark
						position={[-4.5, 0, -3.5]}
						color="#0d3b66"
						radius={1.1}
						height={0.7}
						onHit={handleLandmarkHit}
					/>
					<Landmark
						position={[1.2, 0, -3.8]}
						color="#fdbc13"
						radius={0.9}
						height={1}
						onHit={handleLandmarkHit}
					/>

					{/* Location pins */}
					<LocationPin position={[-6.8, 0.6, -8.6]} label="OG Eatery" />
					<LocationPin position={[-0.3, 0.6, -1]} label="Hostaria Restaurant" />

					{/* Playfield bumpers — collision scoring + kick */}
					<PinballBumper
						position={[-3, 0.2, -1]}
						color="#ba1a1a"
						onHit={handleBumperHit}
					/>
					<PinballBumper
						position={[0, 0.2, -2.2]}
						color="#fdbc13"
						onHit={handleBumperHit}
					/>
					<PinballBumper
						position={[3, 0.2, -1]}
						color="#00263f"
						onHit={handleBumperHit}
					/>

					{/* Flippers */}
					<Flipper
						position={[-1.6, 0.15, 5]}
						rotation={[0, 0, -0.12]}
						side="left"
					/>
					<Flipper
						position={[1.6, 0.15, 5]}
						rotation={[0, 0, 0.12]}
						side="right"
					/>

					{/* Angled launch gates like the bottom of the reference image */}
					<LaunchGate position={[-3.2, 0.6, 6.5]} rotationY={0.55} />
					<LaunchGate position={[3.2, 0.6, 6.5]} rotationY={-0.55} />

					{/* Keep the ball on the playfield */}
					<PlayfieldWalls />

					{/* Shooter lane: the ball starts here, top curve feeds the playfield */}
					<ShooterLane powerRef={powerRef} />
					<PowerMeter powerRef={powerRef} />

					{/* The ball starts stopped in the launch lane */}
					<Pinball position={[11.85, 1.2, 11]} bodyRef={ballRef} />
					<LauncherController
						bodyRef={ballRef}
						powerRef={powerRef}
						enabled={!launched && balls > 0}
						onLaunch={handleLaunch}
					/>
					<BallController bodyRef={ballRef} launched={launched} />
					<DrainWatcher
						bodyRef={ballRef}
						launched={launched}
						onDrain={handleDrain}
					/>
					<LaneWatcher
						bodyRef={ballRef}
						launched={launched}
						onBackToShooter={handleLaneReturn}
					/>
					<StuckWatcher
						bodyRef={ballRef}
						launched={launched}
						onStuck={handleStuck}
					/>
				</Physics>

				{/* Fixed pinball camera angle — no orbit controls */}
				<PinballCamera />
			</Canvas>
		</main>
	);
}
