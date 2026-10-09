import { useEffect, useRef } from "react";
import { soundFX } from "./sound";
import type { GameState, MissionActionType, TelemetrySnapshot } from "./types";
import { BLANTYRE_MISSIONS, BLANTYRE_RANKS } from "./types";

interface PinballCanvasProps {
	gameState: GameState;
	leftFlipperPressed: boolean;
	rightFlipperPressed: boolean;
	plungerPressed: boolean;
	nudgeTrigger: number;
	resetTrigger: number;
	onTelemetryUpdate: (snapshot: TelemetrySnapshot) => void;
	onRoundSummary: (summary: {
		roundScore: number;
		totalScore: number;
		ballsRemaining: number;
		multiplier: number;
		sectorBonus: number;
	}) => void;
	onGameOver: (finalScore: number, rankTitle: string) => void;
}

interface WallSegment {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	restitution?: number;
	isSlingshot?: boolean;
	slingshotNormal?: { x: number; y: number };
	isDropTarget?: boolean;
	targetIndex?: number;
}

interface BumperNode {
	x: number;
	y: number;
	radius: number;
	label: string;
	subLabel: string;
	basePoints: number;
	hitTimer: number;
	color: string;
}

interface RolloverLane {
	x: number;
	y: number;
	radius: number;
	letterIndex: number;
	letter: string;
	cooldown: number;
}

interface FloatingPopup {
	x: number;
	y: number;
	text: string;
	color: string;
	alpha: number;
	vy: number;
}

interface SparkParticle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
	color: string;
	alpha: number;
}

export function PinballCanvas({
	gameState,
	leftFlipperPressed,
	rightFlipperPressed,
	plungerPressed,
	nudgeTrigger,
	resetTrigger,
	onTelemetryUpdate,
	onRoundSummary,
	onGameOver,
}: PinballCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	// Mutable control refs for 60fps physics access without re-binding RAF
	const controlsRef = useRef({
		left: false,
		right: false,
		plunger: false,
		gameState,
	});

	useEffect(() => {
		controlsRef.current.left = leftFlipperPressed;
		controlsRef.current.right = rightFlipperPressed;
		controlsRef.current.plunger = plungerPressed;
		controlsRef.current.gameState = gameState;
	}, [leftFlipperPressed, rightFlipperPressed, plungerPressed, gameState]);

	// Physics state stored in ref
	const physicsRef = useRef({
		ball: {
			x: 500,
			y: 665,
			vx: 0,
			vy: 0,
			radius: 10.5,
			trail: [] as { x: number; y: number }[],
		},
		leftFlipper: {
			pivotX: 162,
			pivotY: 696,
			length: 72,
			angle: 0.44,
			restAngle: 0.44,
			activeAngle: -0.46,
			angularVelocity: 0,
		},
		rightFlipper: {
			pivotX: 338,
			pivotY: 696,
			length: 72,
			angle: Math.PI - 0.44,
			restAngle: Math.PI - 0.44,
			activeAngle: Math.PI + 0.46,
			angularVelocity: 0,
		},
		plungerCharge: 0,
		oneWayGateClosed: false,
		loopCaptureTimer: 0,
		ballSaveTimer: 0,
		score: 0,
		roundStartScore: 0,
		highScore: Number(localStorage.getItem("blantyre_pinball_hi") || "85000"),
		ballsRemaining: 3,
		currentBall: 1,
		multiplier: 1,
		rankIndex: 0,
		missionIndex: 0,
		missionProgress: 0,
		missionsCompleted: 0,
		sectorLights: [false, false, false, false, false, false, false, false],
		dropTargetsDown: [false, false, false],
		tiltWarningCount: 0,
		isTilted: false,
		statusMessage: "PULL PLUNGER [SPACE] TO LAUNCH",
		bumperUpgradeLevel: 1,
		tableShakeX: 0,
		tableShakeY: 0,
		popups: [] as FloatingPopup[],
		particles: [] as SparkParticle[],
		bumpers: [
			{
				x: 250,
				y: 195,
				radius: 27,
				label: "MICHIRU",
				subLabel: "PEAK",
				basePoints: 500,
				hitTimer: 0,
				color: "#38BDF8",
			},
			{
				x: 180,
				y: 268,
				radius: 25,
				label: "SOCHE",
				subLabel: "BEACON",
				basePoints: 500,
				hitTimer: 0,
				color: "#F59E0B",
			},
			{
				x: 320,
				y: 268,
				radius: 25,
				label: "NDIRANDE",
				subLabel: "RIDGE",
				basePoints: 500,
				hitTimer: 0,
				color: "#10B981",
			},
			{
				x: 250,
				y: 334,
				radius: 21,
				label: "KABULA",
				subLabel: "CORE",
				basePoints: 750,
				hitTimer: 0,
				color: "#E879F9",
			},
		] as BumperNode[],
		rollovers: [
			{ x: 168, y: 112, radius: 13, letterIndex: 0, letter: "B", cooldown: 0 },
			{ x: 222, y: 102, radius: 13, letterIndex: 1, letter: "L", cooldown: 0 },
			{ x: 278, y: 102, radius: 13, letterIndex: 2, letter: "A", cooldown: 0 },
			{ x: 332, y: 112, radius: 13, letterIndex: 3, letter: "N", cooldown: 0 },
			{ x: 96, y: 315, radius: 13, letterIndex: 4, letter: "T", cooldown: 0 },
			{ x: 404, y: 315, radius: 13, letterIndex: 5, letter: "Y", cooldown: 0 },
			{ x: 86, y: 585, radius: 13, letterIndex: 6, letter: "R", cooldown: 0 },
			{ x: 414, y: 585, radius: 13, letterIndex: 7, letter: "E", cooldown: 0 },
		] as RolloverLane[],
		slingshotFlashLeft: 0,
		slingshotFlashRight: 0,
	});

	// Helper to emit telemetry snapshot to React HUD
	const syncTelemetry = () => {
		const p = physicsRef.current;
		const inPlunger = p.ball.x > 474 && p.ball.y > 540;
		onTelemetryUpdate({
			score: p.score,
			highScore: p.highScore,
			ballsRemaining: p.ballsRemaining,
			currentBall: p.currentBall,
			multiplier: p.multiplier,
			rankIndex: p.rankIndex,
			activeMission:
				BLANTYRE_MISSIONS[p.missionIndex % BLANTYRE_MISSIONS.length],
			missionProgress: p.missionProgress,
			missionsCompleted: p.missionsCompleted,
			sectorLights: [...p.sectorLights],
			dropTargetsDown: [...p.dropTargetsDown],
			plungerCharge: Math.round(p.plungerCharge),
			ballInPlunger: inPlunger,
			ballSaveActive: p.ballSaveTimer > 0,
			tiltWarningCount: p.tiltWarningCount,
			isTilted: p.isTilted,
			statusMessage: p.statusMessage,
			bumperUpgradeLevel: p.bumperUpgradeLevel,
		});
	};

	// Reset ball to plunger lane
	const resetBallToPlunger = (message: string) => {
		const p = physicsRef.current;
		p.ball.x = 500;
		p.ball.y = 665;
		p.ball.vx = 0;
		p.ball.vy = 0;
		p.ball.trail = [];
		p.plungerCharge = 0;
		p.oneWayGateClosed = false;
		p.loopCaptureTimer = 0;
		p.ballSaveTimer = 0;
		p.isTilted = false;
		p.statusMessage = message;
		syncTelemetry();
	};

	// Full game reset
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset helper is stable (ref-only); effect must fire on trigger change alone.
	useEffect(() => {
		if (resetTrigger === 0) return;
		const p = physicsRef.current;
		p.score = 0;
		p.roundStartScore = 0;
		p.ballsRemaining = 3;
		p.currentBall = 1;
		p.multiplier = 1;
		p.rankIndex = 0;
		p.missionIndex = 0;
		p.missionProgress = 0;
		p.missionsCompleted = 0;
		p.sectorLights = [false, false, false, false, false, false, false, false];
		p.dropTargetsDown = [false, false, false];
		p.tiltWarningCount = 0;
		p.isTilted = false;
		p.bumperUpgradeLevel = 1;
		p.popups = [];
		p.particles = [];
		resetBallToPlunger("BALL 1 READY · HOLD SPACE TO LAUNCH");
	}, [resetTrigger]);

	// Handle table nudge
	// biome-ignore lint/correctness/useExhaustiveDependencies: telemetry helper is stable (ref-only); effect must fire on trigger change alone.
	useEffect(() => {
		if (nudgeTrigger === 0) return;
		const p = physicsRef.current;
		if (controlsRef.current.gameState !== "PLAYING" || p.isTilted) return;

		soundFX.playNudge();
		p.tiltWarningCount += 1;
		p.tableShakeX = (Math.random() > 0.5 ? 1 : -1) * 7;
		p.tableShakeY = -5;

		// Apply physical impulse to ball if in playfield
		if (p.ball.x < 474) {
			p.ball.vx += (Math.random() - 0.5) * 4.5;
			p.ball.vy -= 2.6;
		}

		if (p.tiltWarningCount >= 3) {
			p.isTilted = true;
			p.statusMessage = "TILT! FLIPPERS LOCKED";
			p.popups.push({
				x: 250,
				y: 420,
				text: "TILT! FLIPPERS OFFLINE",
				color: "#EF4444",
				alpha: 1.0,
				vy: -0.6,
			});
		} else {
			p.statusMessage = `CAREFUL: TABLE NUDGE (${p.tiltWarningCount}/3 TILT)`;
			p.popups.push({
				x: p.ball.x,
				y: p.ball.y - 20,
				text: "NUDGE!",
				color: "#F59E0B",
				alpha: 1.0,
				vy: -1.1,
			});
		}
		syncTelemetry();
	}, [nudgeTrigger]);

	// Main 60fps Canvas Physics & Rendering Loop
	// biome-ignore lint/correctness/useExhaustiveDependencies: loop binds once on mount on purpose; controls flow through refs and React setters are stable.
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let animationFrameId: number;
		let lastTelemetryTick = 0;

		const addPoints = (
			basePts: number,
			x: number,
			y: number,
			label?: string,
			color = "#38BDF8",
		) => {
			const p = physicsRef.current;
			if (p.isTilted) return;
			const totalPts = basePts * p.multiplier;
			p.score += totalPts;

			if (p.score > p.highScore) {
				p.highScore = p.score;
				localStorage.setItem("blantyre_pinball_hi", String(p.highScore));
			}

			// Check rank promotion
			let nextRank = p.rankIndex;
			for (let i = BLANTYRE_RANKS.length - 1; i >= 0; i--) {
				if (p.score >= BLANTYRE_RANKS[i].minScore) {
					nextRank = i;
					break;
				}
			}
			if (nextRank > p.rankIndex) {
				p.rankIndex = nextRank;
				const promotedRank = BLANTYRE_RANKS[nextRank];
				p.statusMessage = `RANK UP: ${promotedRank.title.toUpperCase()}!`;
				soundFX.playRankPromotion();
				p.popups.push({
					x: 250,
					y: 310,
					text: `RANK UP: ${promotedRank.title.toUpperCase()}`,
					color: "#F59E0B",
					alpha: 1.3,
					vy: -0.7,
				});
			}

			p.popups.push({
				x,
				y,
				text: label
					? `${label} +${totalPts.toLocaleString()}`
					: `+${totalPts.toLocaleString()}`,
				color,
				alpha: 1.0,
				vy: -1.1,
			});
		};

		const advanceMission = (actionType: MissionActionType, amount = 1) => {
			const p = physicsRef.current;
			const activeMission =
				BLANTYRE_MISSIONS[p.missionIndex % BLANTYRE_MISSIONS.length];
			if (activeMission.actionType !== actionType) return;

			p.missionProgress += amount;
			if (p.missionProgress >= activeMission.targetGoal) {
				// Mission Complete!
				p.missionsCompleted += 1;
				p.missionProgress = 0;
				p.missionIndex = (p.missionIndex + 1) % BLANTYRE_MISSIONS.length;
				p.bumperUpgradeLevel = Math.min(4, p.bumperUpgradeLevel + 1);
				soundFX.playRankPromotion();
				addPoints(
					activeMission.rewardScore,
					250,
					240,
					"MISSION DONE!",
					"#10B981",
				);
				p.statusMessage = `MISSION DONE! NEXT: ${BLANTYRE_MISSIONS[p.missionIndex].title.toUpperCase()}`;
			}
		};

		const spawnParticles = (
			x: number,
			y: number,
			color: string,
			count = 10,
		) => {
			const p = physicsRef.current;
			for (let i = 0; i < count; i++) {
				const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
				const speed = 1.5 + Math.random() * 4.2;
				p.particles.push({
					x,
					y,
					vx: Math.cos(angle) * speed,
					vy: Math.sin(angle) * speed,
					radius: 1.8 + Math.random() * 2.2,
					color,
					alpha: 1.0,
				});
			}
		};

		// Build table geometry segments
		const getTableWalls = (): WallSegment[] => {
			const p = physicsRef.current;
			const walls: WallSegment[] = [
				// Left outer wall
				{ x1: 58, y1: 630, x2: 58, y2: 145 },
				// Top-left dome arch
				{ x1: 58, y1: 145, x2: 105, y2: 75 },
				{ x1: 105, y1: 75, x2: 195, y2: 44 },
				{ x1: 195, y1: 44, x2: 335, y2: 44 },
				{ x1: 335, y1: 44, x2: 445, y2: 78 },
				{ x1: 445, y1: 78, x2: 520, y2: 145 },
				// Rightmost outer plunger wall
				{ x1: 520, y1: 145, x2: 520, y2: 720 },
				// Plunger floor
				{ x1: 478, y1: 720, x2: 520, y2: 720, restitution: 0.2 },
				// Plunger inner divider wall
				{ x1: 478, y1: 175, x2: 478, y2: 720 },

				// Left inlane & flipper guide
				{ x1: 58, y1: 630, x2: 162, y2: 696, restitution: 0.45 },
				{ x1: 96, y1: 545, x2: 96, y2: 615 },
				{ x1: 96, y1: 615, x2: 162, y2: 696 },

				// Right inlane & flipper guide
				{ x1: 442, y1: 630, x2: 338, y2: 696, restitution: 0.45 },
				{ x1: 404, y1: 545, x2: 404, y2: 615 },
				{ x1: 404, y1: 615, x2: 338, y2: 696 },
				// Right outer playfield boundary above outlane
				{ x1: 442, y1: 340, x2: 442, y2: 630 },

				// Left Slingshot Triangle (Victoria Ave Kicker)
				{
					x1: 118,
					y1: 530,
					x2: 172,
					y2: 634,
					isSlingshot: true,
					slingshotNormal: { x: 0.86, y: -0.5 },
				},
				{ x1: 118, y1: 530, x2: 118, y2: 612 },
				{ x1: 118, y1: 612, x2: 172, y2: 634 },

				// Right Slingshot Triangle (Limbe Kicker)
				{
					x1: 382,
					y1: 530,
					x2: 328,
					y2: 634,
					isSlingshot: true,
					slingshotNormal: { x: -0.86, y: -0.5 },
				},
				{ x1: 382, y1: 530, x2: 382, y2: 612 },
				{ x1: 382, y1: 612, x2: 328, y2: 634 },

				// Upper-right Chichiri loop deflector guide
				{ x1: 432, y1: 175, x2: 454, y2: 265 },
			];

			// One-way gate preventing ball from falling back into plunger lane
			if (p.oneWayGateClosed) {
				walls.push({ x1: 478, y1: 175, x2: 520, y2: 145, restitution: 0.7 });
			}

			// 3 Chileka Drop Targets along Left Ridge
			const dropCoords = [
				{ x1: 74, y1: 365, x2: 86, y2: 402 },
				{ x1: 74, y1: 412, x2: 86, y2: 449 },
				{ x1: 74, y1: 459, x2: 86, y2: 496 },
			];
			dropCoords.forEach((seg, idx) => {
				if (!p.dropTargetsDown[idx]) {
					walls.push({
						...seg,
						isDropTarget: true,
						targetIndex: idx,
						restitution: 1.15,
					});
				}
			});

			return walls;
		};

		// Closest point on segment helper
		const closestPointOnSegment = (
			px: number,
			py: number,
			x1: number,
			y1: number,
			x2: number,
			y2: number,
		) => {
			const dx = x2 - x1;
			const dy = y2 - y1;
			const lenSq = dx * dx + dy * dy;
			if (lenSq === 0) return { x: x1, y: y1, t: 0 };
			const t = Math.max(
				0,
				Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq),
			);
			return {
				x: x1 + t * dx,
				y: y1 + t * dy,
				t,
			};
		};

		const stepPhysics = () => {
			const p = physicsRef.current;
			const ctrl = controlsRef.current;

			if (ctrl.gameState !== "PLAYING") return;

			// Decay visual timers
			p.tableShakeX *= 0.82;
			p.tableShakeY *= 0.82;
			if (p.ballSaveTimer > 0) p.ballSaveTimer -= 1 / 60;
			if (p.slingshotFlashLeft > 0) p.slingshotFlashLeft -= 1;
			if (p.slingshotFlashRight > 0) p.slingshotFlashRight -= 1;

			p.bumpers.forEach((b) => {
				if (b.hitTimer > 0) b.hitTimer -= 1;
			});
			p.rollovers.forEach((r) => {
				if (r.cooldown > 0) r.cooldown -= 1;
			});

			// Plunger charge & release logic
			const ballInShooterLane = p.ball.x > 475 && p.ball.y > 540;
			if (ctrl.plunger && ballInShooterLane) {
				p.plungerCharge = Math.min(100, p.plungerCharge + 1.85);
			} else if (!ctrl.plunger && p.plungerCharge > 4 && ballInShooterLane) {
				const launchPower =
					15.5 + (p.plungerCharge / 100) * 14.5 + (Math.random() - 0.5) * 0.9;
				p.ball.vy = -launchPower;
				p.ball.vx = -0.8;
				soundFX.playPlungerLaunch(p.plungerCharge / 100);
				p.plungerCharge = 0;
				p.ballSaveTimer = 15; // 15s ball save on launch
				p.statusMessage = "BALL LAUNCHED · BALL SAVE ACTIVE (15S)";
			} else if (!ctrl.plunger) {
				p.plungerCharge = Math.max(0, p.plungerCharge - 6);
			}

			// Loop capture state (Chichiri Loop at x: 398, y: 215)
			if (p.loopCaptureTimer > 0) {
				p.loopCaptureTimer -= 1;
				p.ball.x = 398 + Math.sin(p.loopCaptureTimer * 0.5) * 2.5;
				p.ball.y = 215 + Math.cos(p.loopCaptureTimer * 0.5) * 2.5;
				p.ball.vx = 0;
				p.ball.vy = 0;

				if (p.loopCaptureTimer === 1) {
					// Eject with a strong kick toward the center bumpers
					const ejectAngle = Math.PI * 0.72 + (Math.random() - 0.5) * 0.22;
					const speed = 15.5;
					p.ball.vx = Math.cos(ejectAngle) * speed;
					p.ball.vy = Math.sin(ejectAngle) * speed;
					spawnParticles(398, 215, "#10B981", 16);
					soundFX.playPlungerLaunch(0.9);
				}
				return;
			}

			// Sub-stepped physics integration (8 sub-steps per frame for zero-tunneling)
			const SUB_STEPS = 8;
			const dt = 1 / SUB_STEPS;
			const gravity = 0.21 * dt;

			// Update flippers before sub-steps
			const updateFlipper = (
				flipper: typeof p.leftFlipper,
				isPressed: boolean,
				side: "left" | "right",
			) => {
				const prevAngle = flipper.angle;
				const target =
					isPressed && !p.isTilted ? flipper.activeAngle : flipper.restAngle;
				const diff = target - flipper.angle;

				if (Math.abs(diff) > 0.01) {
					// Play sound right as flipper starts swinging up
					if (
						isPressed &&
						!p.isTilted &&
						Math.abs(flipper.angle - flipper.restAngle) < 0.08
					) {
						soundFX.playFlipper(side);
					}
					flipper.angle += diff * 0.36;
				} else {
					flipper.angle = target;
				}
				flipper.angularVelocity = (flipper.angle - prevAngle) / SUB_STEPS;
			};

			updateFlipper(p.leftFlipper, ctrl.left, "left");
			updateFlipper(p.rightFlipper, ctrl.right, "right");

			const walls = getTableWalls();

			for (let step = 0; step < SUB_STEPS; step++) {
				p.ball.vy += gravity;
				p.ball.vx *= 0.9992 ** dt;
				p.ball.vy *= 0.9992 ** dt;

				p.ball.x += p.ball.vx * dt;
				p.ball.y += p.ball.vy * dt;

				// Close one-way gate once ball exits upper shooter lane into playfield
				if (!p.oneWayGateClosed && p.ball.x < 462 && p.ball.y < 230) {
					p.oneWayGateClosed = true;
				}

				// 1. Collide with static walls, slingshots, and drop targets
				for (const wall of walls) {
					const closest = closestPointOnSegment(
						p.ball.x,
						p.ball.y,
						wall.x1,
						wall.y1,
						wall.x2,
						wall.y2,
					);
					const dx = p.ball.x - closest.x;
					const dy = p.ball.y - closest.y;
					const dist = Math.hypot(dx, dy);

					if (dist < p.ball.radius && dist > 0.0001) {
						const nx = dx / dist;
						const ny = dy / dist;

						// Resolve penetration
						p.ball.x = closest.x + nx * p.ball.radius;
						p.ball.y = closest.y + ny * p.ball.radius;

						const vn = p.ball.vx * nx + p.ball.vy * ny;
						if (vn < 0) {
							if (wall.isSlingshot && wall.slingshotNormal && !p.isTilted) {
								p.ball.vx = wall.slingshotNormal.x * 13.5;
								p.ball.vy = wall.slingshotNormal.y * 13.5;
								if (wall.x1 < 250) {
									p.slingshotFlashLeft = 10;
								} else {
									p.slingshotFlashRight = 10;
								}
								soundFX.playSlingshot();
								addPoints(350, closest.x, closest.y, "KICKER", "#F59E0B");
								spawnParticles(closest.x, closest.y, "#F59E0B", 7);
							} else if (wall.isDropTarget && wall.targetIndex !== undefined) {
								const rest = wall.restitution ?? 0.95;
								p.ball.vx -= (1 + rest) * vn * nx;
								p.ball.vy -= (1 + rest) * vn * ny;

								p.dropTargetsDown[wall.targetIndex] = true;
								advanceMission("DROP_TARGETS", 1);

								const allDown = p.dropTargetsDown.every(Boolean);
								soundFX.playTargetHit(allDown);
								spawnParticles(closest.x, closest.y, "#38BDF8", 10);

								if (allDown) {
									addPoints(
										5000,
										closest.x + 30,
										closest.y,
										"CHILEKA CLEARED",
										"#10B981",
									);
									p.multiplier = Math.min(8, p.multiplier + 1);
									p.statusMessage = `CHILEKA CLEARED! MULTIPLIER UP TO ${p.multiplier}X`;
									setTimeout(() => {
										physicsRef.current.dropTargetsDown = [false, false, false];
									}, 1400);
								} else {
									addPoints(
										1000,
										closest.x + 25,
										closest.y,
										"TARGET",
										"#38BDF8",
									);
								}
							} else {
								const rest = wall.restitution ?? 0.72;
								p.ball.vx -= (1 + rest) * vn * nx;
								p.ball.vy -= (1 + rest) * vn * ny;
							}
						}
					}
				}

				// 2. Collide with Flippers
				const checkFlipperCollision = (flipper: typeof p.leftFlipper) => {
					const tipX =
						flipper.pivotX + Math.cos(flipper.angle) * flipper.length;
					const tipY =
						flipper.pivotY + Math.sin(flipper.angle) * flipper.length;
					const closest = closestPointOnSegment(
						p.ball.x,
						p.ball.y,
						flipper.pivotX,
						flipper.pivotY,
						tipX,
						tipY,
					);

					const flipperThickness = 7.5;
					const minDist = p.ball.radius + flipperThickness;
					const dx = p.ball.x - closest.x;
					const dy = p.ball.y - closest.y;
					const dist = Math.hypot(dx, dy);

					if (dist < minDist && dist > 0.0001) {
						const nx = dx / dist;
						const ny = dy / dist;

						p.ball.x = closest.x + nx * minDist;
						p.ball.y = closest.y + ny * minDist;

						const vn = p.ball.vx * nx + p.ball.vy * ny;
						const radiusArm = closest.t * flipper.length;
						const swingBoost =
							Math.abs(flipper.angularVelocity) * radiusArm * 2.4;

						if (vn < 0) {
							const restitution = 0.82;
							p.ball.vx -= (1 + restitution) * vn * nx;
							p.ball.vy -= (1 + restitution) * vn * ny;
						}

						if (swingBoost > 0.4 && !p.isTilted) {
							p.ball.vx +=
								nx * (swingBoost + 6.8) + (Math.random() - 0.5) * 0.7;
							p.ball.vy += ny * (swingBoost + 8.5);
						}
					}
				};

				checkFlipperCollision(p.leftFlipper);
				checkFlipperCollision(p.rightFlipper);

				// 3. Collide with Jet Bumpers (Michiru, Soche, Ndirande, Kabula)
				p.bumpers.forEach((bumper, idx) => {
					const dx = p.ball.x - bumper.x;
					const dy = p.ball.y - bumper.y;
					const dist = Math.hypot(dx, dy);
					const minDist = p.ball.radius + bumper.radius;

					if (dist < minDist && dist > 0.0001) {
						const nx = dx / dist;
						const ny = dy / dist;

						p.ball.x = bumper.x + nx * minDist;
						p.ball.y = bumper.y + ny * minDist;

						const bounceSpeed = Math.max(
							10.5,
							Math.hypot(p.ball.vx, p.ball.vy) * 1.12,
						);
						p.ball.vx = nx * bounceSpeed;
						p.ball.vy = ny * bounceSpeed;

						if (bumper.hitTimer === 0 && !p.isTilted) {
							bumper.hitTimer = 12;
							soundFX.playBumper(idx + p.bumperUpgradeLevel);
							const pts = bumper.basePoints * p.bumperUpgradeLevel;
							addPoints(
								pts,
								bumper.x,
								bumper.y - 18,
								bumper.label,
								bumper.color,
							);
							advanceMission("BUMPERS", 1);
							spawnParticles(
								bumper.x + nx * bumper.radius,
								bumper.y + ny * bumper.radius,
								bumper.color,
								9,
							);
						}
					}
				});
			}

			// 4. Check Chichiri Loop Kicker Pocket (x: 398, y: 215)
			const distLoop = Math.hypot(p.ball.x - 398, p.ball.y - 215);
			if (distLoop < 18 && p.loopCaptureTimer === 0 && !p.isTilted) {
				p.loopCaptureTimer = 52; // ~0.85s lock
				soundFX.playLoopCapture();
				addPoints(3500, 398, 195, "CHICHIRI LOOP", "#10B981");
				advanceMission("LOOP", 1);
				p.ballSaveTimer = Math.max(p.ballSaveTimer, 10);
				p.statusMessage = "CHICHIRI LOOP LOCKED · +3,500 PTS & BALL SAVE";
			}

			// 5. Check Rollover Lanes (B-L-A-N-T-Y-R-E)
			p.rollovers.forEach((lane) => {
				if (lane.cooldown === 0 && !p.isTilted) {
					const d = Math.hypot(p.ball.x - lane.x, p.ball.y - lane.y);
					if (d < lane.radius + p.ball.radius * 0.6) {
						lane.cooldown = 45;
						const wasLit = p.sectorLights[lane.letterIndex];
						p.sectorLights[lane.letterIndex] = true;
						soundFX.playTargetHit(false);
						addPoints(
							wasLit ? 400 : 1200,
							lane.x,
							lane.y - 12,
							`LANE ${lane.letter}`,
							"#38BDF8",
						);

						if (p.sectorLights.every(Boolean)) {
							p.multiplier = Math.min(10, p.multiplier + 1);
							addPoints(12000, 250, 160, "BLANTYRE COMPLETE!", "#F59E0B");
							soundFX.playRankPromotion();
							p.statusMessage = `ALL BLANTYRE LANES LIT! MULTIPLIER ${p.multiplier}X`;
							p.sectorLights = [
								false,
								false,
								false,
								false,
								false,
								false,
								false,
								false,
							];
						}
					}
				}
			});

			// Clamp maximum ball speed
			const speed = Math.hypot(p.ball.vx, p.ball.vy);
			const maxSpeed = 24;
			if (speed > maxSpeed) {
				p.ball.vx = (p.ball.vx / speed) * maxSpeed;
				p.ball.vy = (p.ball.vy / speed) * maxSpeed;
			}

			// Record motion trail
			p.ball.trail.unshift({ x: p.ball.x, y: p.ball.y });
			if (p.ball.trail.length > 12) {
				p.ball.trail.pop();
			}

			// 6. Check Ball Drain below flippers
			if (p.ball.y > 765) {
				if (p.ballSaveTimer > 0 && !p.isTilted) {
					// Ball Save Auto-Relaunch!
					soundFX.playLoopCapture();
					p.ball.x = 500;
					p.ball.y = 640;
					p.ball.vx = 0;
					p.ball.vy = -24.5;
					p.ballSaveTimer = 0;
					p.oneWayGateClosed = false;
					p.statusMessage = "BALL SAVED!";
					p.popups.push({
						x: 250,
						y: 520,
						text: "BALL SAVED!",
						color: "#10B981",
						alpha: 1.2,
						vy: -0.9,
					});
				} else {
					// Ball Lost
					soundFX.playBallDrain();
					const roundEarned = p.score - p.roundStartScore;
					const litCount = p.sectorLights.filter(Boolean).length;
					const sectorBonus = litCount * 1500 * p.multiplier;
					p.score += sectorBonus;
					p.roundStartScore = p.score;

					if (p.ballsRemaining > 1) {
						p.ballsRemaining -= 1;
						p.currentBall += 1;
						onRoundSummary({
							roundScore: roundEarned,
							totalScore: p.score,
							ballsRemaining: p.ballsRemaining,
							multiplier: p.multiplier,
							sectorBonus,
						});
						resetBallToPlunger(
							`BALL ${p.currentBall} READY · HOLD SPACE TO LAUNCH`,
						);
					} else {
						p.ballsRemaining = 0;
						syncTelemetry();
						onGameOver(p.score, BLANTYRE_RANKS[p.rankIndex].title);
					}
				}
			}

			// Update floating popups & particles
			p.popups.forEach((pop) => {
				pop.y += pop.vy;
				pop.alpha -= 0.018;
			});
			p.popups = p.popups.filter((pop) => pop.alpha > 0);

			p.particles.forEach((pt) => {
				pt.x += pt.vx;
				pt.y += pt.vy;
				pt.alpha -= 0.032;
			});
			p.particles = p.particles.filter((pt) => pt.alpha > 0);
		};

		const renderTable = (now: number) => {
			const p = physicsRef.current;
			ctx.save();
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Apply subtle table nudge shake
			ctx.translate(p.tableShakeX, p.tableShakeY);

			// 1. Cabinet Playfield Background
			const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
			bgGrad.addColorStop(0, "#091022");
			bgGrad.addColorStop(0.5, "#0F1B33");
			bgGrad.addColorStop(1, "#080D1A");
			ctx.fillStyle = bgGrad;
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// 2. Subtle Grid Lines
			ctx.strokeStyle = "rgba(56, 189, 248, 0.05)";
			ctx.lineWidth = 1;
			for (let x = 60; x < 480; x += 40) {
				ctx.beginPath();
				ctx.moveTo(x, 45);
				ctx.lineTo(x, 730);
				ctx.stroke();
			}
			for (let y = 60; y < 740; y += 40) {
				ctx.beginPath();
				ctx.moveTo(58, y);
				ctx.lineTo(478, y);
				ctx.stroke();
			}

			// 3. Center Playfield Emblem: Mulanje Peaks & Loop Ring
			ctx.save();
			ctx.translate(250, 445);
			ctx.strokeStyle = "rgba(56, 189, 248, 0.14)";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(0, 0, 74, 0, Math.PI * 2);
			ctx.stroke();

			ctx.strokeStyle = "rgba(245, 158, 11, 0.16)";
			ctx.beginPath();
			ctx.arc(0, 0, 56, 0, Math.PI * 2);
			ctx.stroke();

			// Stylized Twin Peaks Silhouette inside ring
			ctx.beginPath();
			ctx.moveTo(-48, 22);
			ctx.lineTo(-18, -26);
			ctx.lineTo(4, 2);
			ctx.lineTo(24, -18);
			ctx.lineTo(48, 22);
			ctx.closePath();
			ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
			ctx.fill();
			ctx.strokeStyle = "rgba(56, 189, 248, 0.28)";
			ctx.stroke();

			ctx.fillStyle = "rgba(248, 250, 252, 0.45)";
			ctx.font = "700 10px Orbitron, sans-serif";
			ctx.textAlign = "center";
			ctx.fillText("BLANTYRE", 0, 38);
			ctx.font = '600 9px "JetBrains Mono", monospace';
			ctx.fillStyle = "#F59E0B";
			ctx.fillText(
				`BONUS ${p.multiplier}X · LVL ${p.bumperUpgradeLevel}`,
				0,
				52,
			);
			ctx.restore();

			// 4. Chichiri Loop Kicker (x: 398, y: 215)
			ctx.save();
			ctx.translate(398, 215);
			const pulse = Math.sin(now * 0.008) * 3;
			const loopGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, 24 + pulse);
			loopGrad.addColorStop(0, "#10B981");
			loopGrad.addColorStop(0.55, "rgba(16, 185, 129, 0.28)");
			loopGrad.addColorStop(1, "rgba(16, 185, 129, 0)");
			ctx.fillStyle = loopGrad;
			ctx.beginPath();
			ctx.arc(0, 0, 24 + pulse, 0, Math.PI * 2);
			ctx.fill();

			ctx.strokeStyle = "#10B981";
			ctx.lineWidth = 2;
			ctx.setLineDash([5, 4]);
			ctx.rotate(now * 0.002);
			ctx.beginPath();
			ctx.arc(0, 0, 16, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();

			ctx.fillStyle = "#10B981";
			ctx.font = "700 8px Orbitron, sans-serif";
			ctx.textAlign = "center";
			ctx.fillText("CHICHIRI LOOP", 398, 184);

			// 5. Rollover Lanes (B-L-A-N-T-Y-R-E)
			p.rollovers.forEach((lane) => {
				const isLit = p.sectorLights[lane.letterIndex];
				ctx.save();
				ctx.beginPath();
				ctx.arc(lane.x, lane.y, lane.radius, 0, Math.PI * 2);
				ctx.fillStyle = isLit
					? "rgba(245, 158, 11, 0.28)"
					: "rgba(30, 41, 59, 0.75)";
				ctx.fill();
				ctx.lineWidth = 2;
				ctx.strokeStyle = isLit ? "#F59E0B" : "rgba(148, 163, 184, 0.35)";
				ctx.stroke();

				ctx.fillStyle = isLit ? "#FEF3C7" : "#94A3B8";
				ctx.font = "700 11px Orbitron, sans-serif";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(lane.letter, lane.x, lane.y + 0.5);
				ctx.restore();
			});

			// 6. Ball Save Indicator between flippers
			const shieldActive = p.ballSaveTimer > 0;
			const shieldBlink =
				shieldActive &&
				(p.ballSaveTimer > 4 || Math.floor(now / 150) % 2 === 0);
			ctx.save();
			ctx.translate(250, 725);
			ctx.beginPath();
			ctx.arc(0, 0, 15, 0, Math.PI * 2);
			ctx.fillStyle = shieldBlink
				? "rgba(16, 185, 129, 0.25)"
				: "rgba(15, 23, 42, 0.8)";
			ctx.fill();
			ctx.lineWidth = 2;
			ctx.strokeStyle = shieldBlink ? "#10B981" : "#334155";
			ctx.stroke();
			ctx.fillStyle = shieldBlink ? "#10B981" : "#475569";
			ctx.font = "700 7px Orbitron, sans-serif";
			ctx.textAlign = "center";
			ctx.fillText("SAVE", 0, 2.5);
			ctx.restore();

			// 7. Render Table Walls, Slingshots & Chileka Drop Targets
			const walls = getTableWalls();
			walls.forEach((w) => {
				ctx.beginPath();
				ctx.moveTo(w.x1, w.y1);
				ctx.lineTo(w.x2, w.y2);

				if (w.isDropTarget) {
					ctx.strokeStyle = "#38BDF8";
					ctx.lineWidth = 6;
				} else if (w.isSlingshot) {
					const flash =
						(w.x1 < 250 && p.slingshotFlashLeft > 0) ||
						(w.x1 > 250 && p.slingshotFlashRight > 0);
					ctx.strokeStyle = flash ? "#FEF08A" : "#F59E0B";
					ctx.lineWidth = flash ? 5 : 3;
				} else {
					ctx.strokeStyle = "#475569";
					ctx.lineWidth = 3.5;
				}
				ctx.lineCap = "round";
				ctx.stroke();
			});

			// Label for Chileka Bank
			ctx.save();
			ctx.translate(50, 430);
			ctx.rotate(-Math.PI / 2);
			ctx.fillStyle = "#38BDF8";
			ctx.font = "700 8px Orbitron, sans-serif";
			ctx.textAlign = "center";
			ctx.fillText("CHILEKA", 0, 0);
			ctx.restore();

			// 8. Render 4 Bumpers (Michiru, Soche, Ndirande, Kabula)
			p.bumpers.forEach((b) => {
				const isHit = b.hitTimer > 0;
				const r = isHit ? b.radius + 4 : b.radius;

				ctx.save();
				// Outer glow ring
				ctx.beginPath();
				ctx.arc(b.x, b.y, r + 5, 0, Math.PI * 2);
				ctx.fillStyle = isHit
					? "rgba(254, 240, 138, 0.35)"
					: "rgba(15, 23, 42, 0.65)";
				ctx.fill();

				// Main bumper cap
				ctx.beginPath();
				ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
				ctx.fillStyle = isHit ? "#FEF08A" : "#1E293B";
				ctx.fill();
				ctx.lineWidth = 3;
				ctx.strokeStyle = isHit ? "#FFFFFF" : b.color;
				ctx.stroke();

				// Inner core ring
				ctx.beginPath();
				ctx.arc(b.x, b.y, r * 0.68, 0, Math.PI * 2);
				ctx.strokeStyle = b.color;
				ctx.lineWidth = 1.5;
				ctx.stroke();

				// Bumper label
				ctx.fillStyle = isHit ? "#0F172A" : "#F8FAFC";
				ctx.font = "700 8px Orbitron, sans-serif";
				ctx.textAlign = "center";
				ctx.fillText(b.label, b.x, b.y - 1);
				ctx.font = '600 7px "JetBrains Mono", monospace';
				ctx.fillStyle = isHit ? "#0F172A" : b.color;
				ctx.fillText(b.subLabel, b.x, b.y + 8);
				ctx.restore();
			});

			// 9. Plunger Spring Mechanism in Shooter Lane
			const springTopY = 678 + (p.plungerCharge / 100) * 34;
			ctx.save();
			ctx.strokeStyle = p.plungerCharge > 60 ? "#EF4444" : "#F59E0B";
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(486, springTopY);
			ctx.lineTo(512, springTopY);
			ctx.stroke();

			// Coil zig-zags
			ctx.lineWidth = 2;
			ctx.strokeStyle = "#94A3B8";
			ctx.beginPath();
			const coils = 6;
			for (let i = 0; i <= coils; i++) {
				const cy = springTopY + ((720 - springTopY) * i) / coils;
				const cx = i % 2 === 0 ? 490 : 508;
				if (i === 0) ctx.moveTo(499, cy);
				else ctx.lineTo(cx, cy);
			}
			ctx.stroke();
			ctx.restore();

			// 10. Render Flippers (Left & Right)
			const drawFlipper = (flipper: typeof p.leftFlipper) => {
				const tipX = flipper.pivotX + Math.cos(flipper.angle) * flipper.length;
				const tipY = flipper.pivotY + Math.sin(flipper.angle) * flipper.length;

				ctx.save();
				ctx.strokeStyle = p.isTilted ? "#64748B" : "#F59E0B";
				ctx.lineWidth = 15;
				ctx.lineCap = "round";
				ctx.beginPath();
				ctx.moveTo(flipper.pivotX, flipper.pivotY);
				ctx.lineTo(tipX, tipY);
				ctx.stroke();

				// Inner core
				ctx.strokeStyle = "#FEF3C7";
				ctx.lineWidth = 6;
				ctx.beginPath();
				ctx.moveTo(flipper.pivotX, flipper.pivotY);
				ctx.lineTo(tipX, tipY);
				ctx.stroke();

				// Pivot bolt
				ctx.fillStyle = "#0F172A";
				ctx.beginPath();
				ctx.arc(flipper.pivotX, flipper.pivotY, 4.5, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			};

			drawFlipper(p.leftFlipper);
			drawFlipper(p.rightFlipper);

			// 11. Render Ball Motion Trail & Pinball
			p.ball.trail.forEach((pt, idx) => {
				const ratio = 1 - idx / p.ball.trail.length;
				ctx.beginPath();
				ctx.arc(pt.x, pt.y, p.ball.radius * ratio * 0.75, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(56, 189, 248, ${ratio * 0.24})`;
				ctx.fill();
			});

			ctx.save();
			const ballGrad = ctx.createRadialGradient(
				p.ball.x - 3.5,
				p.ball.y - 3.5,
				1.5,
				p.ball.x,
				p.ball.y,
				p.ball.radius,
			);
			ballGrad.addColorStop(0, "#FFFFFF");
			ballGrad.addColorStop(0.55, "#E2E8F0");
			ballGrad.addColorStop(1, "#64748B");

			ctx.beginPath();
			ctx.arc(p.ball.x, p.ball.y, p.ball.radius, 0, Math.PI * 2);
			ctx.fillStyle = ballGrad;
			ctx.fill();
			ctx.lineWidth = 1.2;
			ctx.strokeStyle = "#F8FAFC";
			ctx.stroke();
			ctx.restore();

			// 12. Render Spark Particles & Floating Score Popups
			p.particles.forEach((pt) => {
				ctx.save();
				ctx.globalAlpha = Math.max(0, pt.alpha);
				ctx.fillStyle = pt.color;
				ctx.beginPath();
				ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			});

			p.popups.forEach((pop) => {
				ctx.save();
				ctx.globalAlpha = Math.min(1, Math.max(0, pop.alpha));
				ctx.font = "700 11px Orbitron, sans-serif";
				ctx.textAlign = "center";
				ctx.fillStyle = pop.color;
				ctx.fillText(pop.text, pop.x, pop.y);
				ctx.restore();
			});

			ctx.restore();
		};

		const loop = (now: number) => {
			stepPhysics();
			renderTable(now);

			if (now - lastTelemetryTick > 85) {
				syncTelemetry();
				lastTelemetryTick = now;
			}

			animationFrameId = requestAnimationFrame(loop);
		};

		animationFrameId = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(animationFrameId);
	}, []);

	return (
		<div className="relative flex items-center justify-center">
			<canvas
				ref={canvasRef}
				width={550}
				height={760}
				className="h-auto w-full max-w-[500px] rounded-2xl border border-slate-700/80 bg-[#080D1A] shadow-2xl"
			/>
		</div>
	);
}
