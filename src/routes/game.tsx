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

export const Route = createFileRoute("/game")({
	component: GamePage,
});

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
}: {
	position: [number, number, number];
	rotation: [number, number, number];
}) {
	return (
		<RigidBody
			type="fixed"
			colliders={false}
			position={position}
			rotation={rotation}
		>
			<mesh castShadow>
				<boxGeometry args={[2.4, 0.25, 0.5]} />
				<meshStandardMaterial color="#ffdea3" metalness={0.4} roughness={0.6} />
			</mesh>
			<CuboidCollider args={[1.2, 0.125, 0.25]} />
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

function GamePage() {
	return (
		<main className="h-screen w-screen overflow-hidden bg-surface">
			<Canvas shadows camera={{ position: [8, 9, 12], fov: 50 }}>
				<color attach="background" args={["#f0eded"]} />
				<fog attach="fog" args={["#f0eded", 28, 65]} />

				<ambientLight intensity={0.6} />
				<directionalLight
					position={[10, 15, 8]}
					intensity={1.4}
					castShadow
					shadow-mapSize-width={1024}
					shadow-mapSize-height={1024}
				/>

				<Physics gravity={[0, -9.81, 0]}>
					{/* Table / Floor */}
					<RigidBody type="fixed" colliders={false} position={[0, -0.25, 0]}>
						<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
							<planeGeometry args={[24, 24]} />
							<meshStandardMaterial color="#0a3c5d" />
						</mesh>
						<gridHelper
							args={[24, 24, "#a3c3f2", "#1f4a6c"]}
							position={[0, 0.02, 0]}
						/>
						<CuboidCollider args={[12, 0.25, 12]} />
					</RigidBody>

					{/* Playfield bumpers */}
					<PinballBumper position={[-3, 0.2, -1]} color="#ba1a1a" />
					<PinballBumper position={[0, 0.2, -2.2]} color="#fdbc13" />
					<PinballBumper position={[3, 0.2, -1]} color="#00263f" />

					{/* Flippers */}
					<Flipper position={[-1.6, 0.15, 3]} rotation={[0, 0, -0.12]} />
					<Flipper position={[1.6, 0.15, 3]} rotation={[0, 0, 0.12]} />

					{/* The ball */}
					<Pinball position={[0, 2.5, 1.5]} />
				</Physics>

				<OrbitControls
					makeDefault
					enablePan={false}
					maxPolarAngle={Math.PI / 2.1}
					minDistance={6}
					maxDistance={30}
				/>
			</Canvas>
		</main>
	);
}
