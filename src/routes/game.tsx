import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
    BallCollider,
    CuboidCollider,
    CylinderCollider,
    Physics,
    RigidBody,
} from "@react-three/rapier";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/game")({
    component: GamePage,
});

/* ---------- Static city layout data ---------- */

const BUILDINGS: {
    position: [number, number, number];
    size: [number, number, number];
    color: string;
}[] = [
    { position: [-6, 0.4, -8], size: [1.2, 0.8, 1.2], color: "#e8d9c0" },
    { position: [-4.6, 0.4, -8.6], size: [1, 1, 1], color: "#f2e6d0" },
    { position: [-3.4, 0.35, -8.2], size: [0.9, 0.7, 0.9], color: "#e0b9a8" },
    { position: [4, 0.4, -8], size: [1.1, 0.8, 1.1], color: "#f2e6d0" },
    { position: [5.4, 0.5, -7.5], size: [1, 1.1, 1], color: "#dfe7ee" },
    { position: [-8, 0.3, -2], size: [0.9, 0.6, 0.9], color: "#e8d9c0" },
    { position: [-7.5, 0.3, 0.5], size: [0.8, 0.6, 1.4], color: "#f2e6d0" },
    { position: [7.6, 0.3, -1], size: [0.9, 0.6, 0.9], color: "#e0b9a8" },
    { position: [7.2, 0.35, 1.5], size: [1.1, 0.7, 1.1], color: "#dfe7ee" },
    { position: [-2, 0.3, -4.6], size: [0.9, 0.6, 0.9], color: "#f2e6d0" },
    { position: [2.2, 0.3, -4.4], size: [0.8, 0.6, 0.8], color: "#e8d9c0" },
    { position: [-1, 0.3, 0.5], size: [1.2, 0.6, 0.7], color: "#f4c9a8" },
];

const ROADS: {
    position: [number, number, number];
    size: [number, number];
    rotationY: number;
}[] = [
    { position: [0, 0.01, -9], size: [16, 1.4], rotationY: 0 },
    { position: [0, 0.01, -4.5], size: [14, 1.2], rotationY: 0 },
    { position: [-6.5, 0.01, -6.5], size: [6, 1.2], rotationY: Math.PI / 2 },
    { position: [6.5, 0.01, -6.5], size: [6, 1.2], rotationY: Math.PI / 2 },
    { position: [0, 0.01, 0], size: [20, 1.2], rotationY: Math.PI / 2 },
];

/* ---------- Reusable pieces ---------- */

function Building({
    position,
    size,
    color,
}: {
    position: [number, number, number];
    size: [number, number, number];
    color: string;
}) {
    return (
        <RigidBody type="fixed" colliders={false} position={position}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={size} />
                <meshStandardMaterial color={color} roughness={0.8} metalness={0.05} />
            </mesh>
            <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
        </RigidBody>
    );
}

function Road({
    position,
    size,
    rotationY,
}: {
    position: [number, number, number];
    size: [number, number];
    rotationY: number;
}) {
    return (
        <mesh
            position={position}
            rotation={[-Math.PI / 2, 0, rotationY]}
            receiveShadow
        >
            <planeGeometry args={size} />
            <meshStandardMaterial color="#3a3f47" roughness={0.9} />
        </mesh>
    );
}

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
            <mesh castShadow>
                <cylinderGeometry args={[radius, radius, height, 32]} />
                <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
            </mesh>
            <CylinderCollider args={[height / 2, radius]} />
        </RigidBody>
    );
}

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
            <RigidBody
                type="fixed"
                colliders={false}
                position={position}
                rotation={rotation}
            >
                <mesh castShadow>
                    <boxGeometry args={[2.4, 0.25, 0.5]} />
                    <meshStandardMaterial color="#0d3b66" metalness={0.5} roughness={0.4} />
                </mesh>
                <CuboidCollider args={[1.2, 0.125, 0.25]} />
            </RigidBody>
            {/* yellow kicker post like in the reference image */}
            <mesh position={[position[0] + kickerX, position[1], position[2]]} castShadow>
                <capsuleGeometry args={[0.22, 0.5, 8, 16]} />
                <meshStandardMaterial color="#fdbc13" metalness={0.6} roughness={0.3} />
            </mesh>
        </group>
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

/* ---------- HUD ---------- */

function HUD({ score, highScore, balls }: { score: number; highScore: number; balls: number }) {
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

/* ---------- Scene ---------- */

function GamePage() {
    const [score] = useState(1_240_500);
    const [highScore] = useState(5_000_000);
    const [balls] = useState(3);

    return (
        <main className="relative h-screen w-screen overflow-hidden bg-surface">
            <HUD score={score} highScore={highScore} balls={balls} />

            <Canvas shadows camera={{ position: [0, 15, 11], fov: 45 }}>
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
                    {/* Table / Floor — green terrain instead of blue */}
                    <RigidBody type="fixed" colliders={false} position={[0, -0.25, 0]}>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                            <planeGeometry args={[24, 24]} />
                            <meshStandardMaterial color="#6fb542" roughness={0.95} />
                        </mesh>
                        <CuboidCollider args={[12, 0.25, 12]} />
                    </RigidBody>

                    {/* Road network (visual only) */}
                    {ROADS.map((r, i) => (
                        <Road key={i} {...r} />
                    ))}

                    {/* City buildings scattered around the playfield */}
                    {BUILDINGS.map((b, i) => (
                        <Building key={i} {...b} />
                    ))}

                    {/* Landmark domes (the big blue/yellow rounded buildings) */}
                    <Landmark position={[-4.5, 0.35, -3]} color="#0d3b66" radius={1.1} height={0.7} />
                    <Landmark position={[1.5, 0.5, -3.5]} color="#fdbc13" radius={0.9} height={1} />

                    {/* Playfield bumpers */}
                    <PinballBumper position={[-3, 0.2, -1]} color="#ba1a1a" />
                    <PinballBumper position={[0, 0.2, -2.2]} color="#fdbc13" />
                    <PinballBumper position={[3, 0.2, -1]} color="#00263f" />

                    {/* Flippers */}
                    <Flipper position={[-1.6, 0.15, 3]} rotation={[0, 0, -0.12]} side="left" />
                    <Flipper position={[1.6, 0.15, 3]} rotation={[0, 0, 0.12]} side="right" />

                    {/* The ball */}
                    <Pinball position={[0, 2.5, 1.5]} />
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