import { Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
    BallCollider,
    CuboidCollider,
    CylinderCollider,
    Physics,
    RigidBody,
} from "@react-three/rapier";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
        <mesh
            geometry={geom}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
        >
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
                    <sphereGeometry args={[w * 0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial color={roofColor} roughness={0.6} />
                </mesh>
            )}

            <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
        </RigidBody>
    );
}

function Tree({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            <mesh castShadow position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.05, 0.07, 0.4, 6]} />
                <meshStandardMaterial color="#8a6142" />
            </mesh>
            <mesh castShadow position={[0, 0.55, 0]}>
                <coneGeometry args={[0.28, 0.6, 8]} />
                <meshStandardMaterial color="#4c8a3f" roughness={0.9} />
            </mesh>
        </group>
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
}: {
    position: [number, number, number];
    color: string;
    radius?: number;
    height?: number;
}) {
    return (
        <RigidBody type="fixed" colliders={false} position={position}>
            <mesh castShadow position={[0, height / 2, 0]}>
                <cylinderGeometry args={[radius, radius, height, 32]} />
                <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
            </mesh>
            <mesh castShadow position={[0, height + radius * 0.35, 0]}>
                <sphereGeometry args={[radius * 0.75, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
            </mesh>
            <CylinderCollider args={[height / 2, radius]} position={[0, height / 2, 0]} />
        </RigidBody>
    );
}

/* ---------------------------------------------------------- */
/* Gameplay elements (bumpers / flippers / launch gates / ball)*/
/* ---------------------------------------------------------- */

function PinballBumper({
    position,
    color,
}: {
    position: [number, number, number];
    color: string;
}) {
    return (
        <RigidBody type="fixed" colliders={false} position={position}>
            <mesh castShadow>
                <cylinderGeometry args={[0.45, 0.45, 0.4, 32]} />
                <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} />
            </mesh>
            <CylinderCollider args={[0.4, 0.45]} />
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
            <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
                <mesh castShadow>
                    <boxGeometry args={[2.4, 0.25, 0.5]} />
                    <meshStandardMaterial color="#0d3b66" metalness={0.5} roughness={0.4} />
                </mesh>
                <CuboidCollider args={[1.2, 0.125, 0.25]} />
            </RigidBody>
            <mesh position={[position[0] + kickerX, position[1], position[2]]} castShadow>
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

function Pinball({ position }: { position: [number, number, number] }) {
    return (
        <RigidBody
            colliders={false}
            position={position}
            restitution={0.35}
            friction={0.2}
            linearDamping={0.05}
        >
            <mesh castShadow>
                <sphereGeometry args={[0.5, 48, 48]} />
                <meshStandardMaterial color="#fdbc13" metalness={0.8} roughness={0.25} />
            </mesh>
            <BallCollider args={[0.5]} />
        </RigidBody>
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
}: {
    score: number;
    highScore: number;
    balls: number;
    multiplier: number;
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
                    <span className="text-sm font-bold text-slate-800">x{multiplier}</span>
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

            <div className="absolute bottom-6 left-4 right-4 flex items-center justify-between">
                <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 backdrop-blur-sm shadow-md">
                    <span>⚾</span>
                    <span className="font-semibold text-slate-900">BALLS: {balls}</span>
                </div>
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
    [-8, 0, -9], [-6, 0, -9.5], [-2, 0, -9], [2, 0, -8.5],
    [5, 0, -9], [7.5, 0, -7],
];
const ROAD_B: [number, number, number][] = [
    [-8, 0, -2], [-6.5, 0, -3.5], [-4, 0, -4.2], [0, 0, -3.8],
    [3, 0, -4], [6, 0, -3], [8, 0, -1],
];
const ROAD_C: [number, number, number][] = [
    [7.5, 0, -7], [8.5, 0, -3], [8, 0, 1], [5, 0, 3.5],
];
const ROAD_D: [number, number, number][] = [
    [-2, 0, -8.8], [-1.5, 0, -4], [-1, 0, 0], [-1.6, 0, 3],
];
const ROAD_E: [number, number, number][] = [
    [-8, 0, -2], [-8.5, 0, 1], [-7, 0, 3.5],
];

const BUILDINGS: {
    position: [number, number, number];
    size: [number, number, number];
    color: string;
    roof?: Roof;
    roofColor?: string;
}[] = [
    { position: [-6.2, 0, -8.4], size: [1.1, 1.1, 1.1], color: "#e8d9c0", roof: "pitched" },
    { position: [-4.8, 0, -9], size: [0.9, 0.85, 0.9], color: "#f2e6d0", roof: "pitched" },
    { position: [-3.4, 0, -8.6], size: [1.2, 0.7, 1.2], color: "#e0b9a8", roof: "flat" },
    { position: [3.8, 0, -8.6], size: [1.1, 0.85, 1.1], color: "#f2e6d0", roof: "pitched" },
    { position: [5.6, 0, -7.9], size: [1, 1.3, 1], color: "#dfe7ee", roof: "flat" },
    { position: [-8.2, 0, -2.6], size: [0.9, 0.7, 0.9], color: "#e8d9c0", roof: "pitched" },
    { position: [-7.6, 0, 0.4], size: [0.8, 0.65, 1.6], color: "#f2e6d0", roof: "flat" },
    { position: [7.7, 0, -1.2], size: [0.9, 0.7, 0.9], color: "#e0b9a8", roof: "pitched" },
    { position: [7.2, 0, 1.8], size: [1.2, 1.5, 1.2], color: "#c9d3dc", roof: "flat" },
    { position: [-2.2, 0, -4.8], size: [0.9, 0.7, 0.9], color: "#f2e6d0", roof: "pitched" },
    { position: [2.4, 0, -4.6], size: [0.8, 0.65, 0.8], color: "#e8d9c0", roof: "pitched" },
    { position: [-1.2, 0, 0.6], size: [1.3, 0.7, 0.8], color: "#f4c9a8", roof: "flat" },
    { position: [4.2, 0, -1.8], size: [1, 1.6, 1], color: "#dce5ee", roof: "flat" },
];

const TREES: [number, number, number][] = [
    [-5.4, 0, -6.6], [-2.8, 0, -7.2], [1, 0, -6.5], [4.6, 0, -5.8],
    [-6.8, 0, -1], [6.3, 0, -3.5], [-3.6, 0, 1.2], [2.8, 0, 1.6],
];

/* ---------------------------------------------------------- */
/* Scene                                                        */
/* ---------------------------------------------------------- */

function GamePage() {
    const [score] = useState(1_240_500);
    const [highScore] = useState(5_000_000);
    const [balls] = useState(3);
    const [multiplier] = useState(5);

    return (
        <main className="relative h-screen w-screen overflow-hidden bg-surface">
            <HUD score={score} highScore={highScore} balls={balls} multiplier={multiplier} />

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

                <Physics gravity={[0, -9.81, 0]}>
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

                    {/* Big landmark domes */}
                    <Landmark position={[-4.5, 0, -3.5]} color="#0d3b66" radius={1.1} height={0.7} />
                    <Landmark position={[1.2, 0, -3.8]} color="#fdbc13" radius={0.9} height={1} />

                    {/* Location pins */}
                    <LocationPin position={[-6.8, 0.6, -8.6]} label="OG Eatery" />
                    <LocationPin position={[-0.3, 0.6, -1]} label="Hostaria Restaurant" />

                    {/* Playfield bumpers */}
                    <PinballBumper position={[-3, 0.2, -1]} color="#ba1a1a" />
                    <PinballBumper position={[0, 0.2, -2.2]} color="#fdbc13" />
                    <PinballBumper position={[3, 0.2, -1]} color="#00263f" />

                    {/* Flippers */}
                    <Flipper position={[-1.6, 0.15, 5]} rotation={[0, 0, -0.12]} side="left" />
                    <Flipper position={[1.6, 0.15, 5]} rotation={[0, 0, 0.12]} side="right" />

                    {/* Angled launch gates like the bottom of the reference image */}
                    <LaunchGate position={[-3.2, 0.6, 6.5]} rotationY={0.55} />
                    <LaunchGate position={[3.2, 0.6, 6.5]} rotationY={-0.55} />

                    {/* The ball */}
                    <Pinball position={[0, 3, 3]} />
                </Physics>

                <OrbitControls
                    makeDefault
                    enablePan={false}
                    maxPolarAngle={Math.PI / 2.4}
                    minDistance={8}
                    maxDistance={30}
                />
            </Canvas>
        </main>
    );
}