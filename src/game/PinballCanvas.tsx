import { useEffect, useRef } from "react";
import { soundFX } from "./sound";
import type { GameState, MissionActionType, TelemetrySnapshot } from "./types";
import { BLANTYRE_MISSIONS, BLANTYRE_RANKS, BLANTYRE_STREETS } from "./types";

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
	/** Balls moving up fast pass straight through (one-way gate) */
	isOneWay?: boolean;
	/** Upward-velocity threshold for the pass-through; below it collides */
	oneWayVy?: number;
	/** Physics only — never drawn (e.g. the spring tip under its own art) */
	noDraw?: boolean;
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

const ROLLOVER_SPOTS = [
	{ x: 168, y: 112 },
	{ x: 222, y: 102 },
	{ x: 278, y: 102 },
	{ x: 332, y: 112 },
	{ x: 96, y: 315 },
	{ x: 365, y: 150 },
	{ x: 86, y: 585 },
	{ x: 414, y: 585 },
];

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

interface BallState {
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
	trail: { x: number; y: number }[];
	stillFrames: number;
}

// Mandala Vault pocket (bank vault of Malawi's oldest building)
const VAULT_X = 110;
const VAULT_Y = 208;

// Reserve Bank chamber at the top of the Hannover Street lane
const RESERVE_X = 384;
const RESERVE_Y = 342;
const RESERVE_BASE = 10000;

// Seat position: parked on top of the plunger spring
const SEAT_X = 500;
const SEAT_Y = 668;

// CBD standup targets: Victoria, Henderson, Haile Selassie
const TRI_TARGETS = [
	{ x: 140, y: 420, label: "VICTORIA" },
	{ x: 300, y: 445, label: "HENDERSON" },
	{ x: 200, y: 470, label: "HAILE SELASSIE" },
];

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
			x: SEAT_X,
			y: SEAT_Y,
			vx: 0,
			vy: 0,
			radius: 10.5,
			trail: [] as { x: number; y: number }[],
			stillFrames: 0,
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
		loopCooldown: 0,
		vaultCooldown: 0,
		reserveJackpot: RESERVE_BASE,
		reserveTimer: 0,
		reserveCooldown: 0,
		reserveFastCd: 0,
		stuckX: SEAT_X,
		stuckY: SEAT_Y,
		stuckN: 0,
		stuckCd: 0,
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
		rollovers: ROLLOVER_SPOTS.map((spot, i) => ({
			...spot,
			radius: 13,
			letterIndex: i,
			letter: BLANTYRE_STREETS[i].letter,
			road: BLANTYRE_STREETS[i].road,
			cooldown: 0,
		})),
		slingshotFlashLeft: 0,
		slingshotFlashRight: 0,
		extraBalls: [] as BallState[],
		multiball: false,
		hasLaunched: false,
		vaultLocks: 0,
		vaultCaptureTimer: 0,
		triangleLit: [false, false, false],
		triCooldown: [0, 0, 0],
		triRearm: 0,
		runwayTimer: 0,
		expressIdle: 900,
		expressWindow: 0,
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
		p.ball.x = SEAT_X;
		p.ball.y = SEAT_Y;
		p.ball.vx = 0;
		p.ball.vy = 0;
		p.ball.trail = [];
		p.plungerCharge = 0;
		p.oneWayGateClosed = false;
		p.loopCaptureTimer = 0;
		p.loopCooldown = 0;
		p.vaultCaptureTimer = 0;
		p.vaultCooldown = 0;
		p.hasLaunched = false;
		p.ballSaveTimer = 0;
		p.isTilted = false;
		p.tiltWarningCount = 0;
		p.stuckN = 0;
		p.stuckCd = 0;
		p.stuckX = p.ball.x;
		p.stuckY = p.ball.y;
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
		p.extraBalls = [];
		p.multiball = false;
		p.vaultLocks = 0;
		p.triangleLit = [false, false, false];
		p.triCooldown = [0, 0, 0];
		p.triRearm = 0;
		p.runwayTimer = 0;
		p.expressIdle = 900;
		p.expressWindow = 0;
		p.loopCooldown = 0;
		p.vaultCooldown = 0;
		p.reserveJackpot = RESERVE_BASE;
		p.reserveTimer = 0;
		p.reserveCooldown = 0;
		p.reserveFastCd = 0;
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

		// Apply physical impulse to every live ball if in playfield
		for (const ball of [p.ball, ...p.extraBalls]) {
			if (ball.x < 474) {
				ball.vx += (Math.random() - 0.5) * 4.5;
				ball.vy -= 2.6;
			}
		}

		if (p.tiltWarningCount >= 3) {
			p.isTilted = true;
			p.popups.push({
				x: 250,
				y: 420,
				text: "TILT! FLIPPERS OFFLINE",
				color: "#EF4444",
				alpha: 1.0,
				vy: -0.6,
			});
			if (p.hasLaunched) {
				// Tilt forfeits the live ball on the spot: clear everything
				// playable and drop it down the drain. A fresh ball resets.
				p.statusMessage = "TILT! BALL FORFEITED";
				p.extraBalls = [];
				p.multiball = false;
				p.loopCaptureTimer = 0;
				p.loopCooldown = 0;
				p.vaultCaptureTimer = 0;
				p.vaultCooldown = 0;
				p.reserveTimer = 0;
				p.ballSaveTimer = 0;
				p.ball.x = 250;
				p.ball.y = 800;
				p.ball.vx = 0;
				p.ball.vy = 5;
			} else {
				// Tilted before launching: the lock lifts on the next launch
				p.statusMessage = "TILT! FLIPPERS LOCKED";
			}
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
			const totalPts = basePts * p.multiplier * (p.multiball ? 2 : 1);
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

		// Third vault lock: open the Mandala Vault — two balls, double points
		const startMultiball = () => {
			const p = physicsRef.current;
			p.vaultLocks = 0;
			p.multiball = true;
			p.ballSaveTimer = Math.max(p.ballSaveTimer, 10);
			const ejectAngle =
				Math.atan2(195 - VAULT_Y, 250 - VAULT_X) + (Math.random() - 0.5) * 0.2;
			p.ball.vx = Math.cos(ejectAngle) * 14;
			p.ball.vy = Math.sin(ejectAngle) * 14;
			p.extraBalls.push({
				x: 250,
				y: 420,
				vx: -7,
				vy: -9,
				radius: 10.5,
				trail: [],
				stillFrames: 0,
			});
			spawnParticles(VAULT_X, VAULT_Y, "#F59E0B", 18);
			soundFX.playRankPromotion();
			p.popups.push({
				x: 250,
				y: 380,
				text: "MULTIBALL — JACKPOT ×2",
				color: "#F59E0B",
				alpha: 1.3,
				vy: -0.7,
			});
			p.statusMessage = "MULTIBALL! ALL POINTS ×2";
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
				// Spring tip: the physical pad the ball actually rests on. It
				// rides down with the charge exactly like the spring crossbar
				// art, so the ball compresses the spring instead of floating.
				// Anything moving up passes through (launches never collide
				// with the tip snapping back), anything falling lands on it.
				{
					x1: 482,
					y1: 678 + p.plungerCharge * 0.34,
					x2: 518,
					y2: 678 + p.plungerCharge * 0.34,
					restitution: 0.1,
					noDraw: true,
					isOneWay: true,
					oneWayVy: 0,
				},

				// Left inlane guide: a single sloped floor running straight to
				// the left flipper pivot. Deliberately one wall, not two — a
				// second wall meeting it at the pivot would form a V-wedge
				// that narrows below ball width and traps balls permanently.
				{ x1: 58, y1: 630, x2: 162, y2: 696, restitution: 0.45 },
				{ x1: 96, y1: 545, x2: 96, y2: 615 },

				// Right inlane guide: same single-floor construction, mirrored
				{ x1: 442, y1: 630, x2: 338, y2: 696, restitution: 0.45 },
				{ x1: 404, y1: 545, x2: 404, y2: 615 },
				// Right outer playfield boundary above outlane
				{ x1: 442, y1: 340, x2: 442, y2: 630 },

				// Left Slingshot Triangle (Limbe Market Kicker)
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

				// Right Slingshot Triangle
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

				// Hannover Street lane: walled chute up to the Reserve chamber.
				// Near-parallel guides, open at both ends — nothing to wedge on.
				// The mouth tilts toward the flippers to invite approach shots.
				{ x1: 334, y1: 452, x2: 368, y2: 330 },
				{ x1: 370, y1: 450, x2: 400, y2: 330 },
			];

			// One-way gate: launched balls pass straight through it, but
			// nothing can fall back down the shooter lane
			if (p.oneWayGateClosed) {
				walls.push({
					x1: 478,
					y1: 175,
					x2: 520,
					y2: 145,
					restitution: 0.7,
					isOneWay: true,
					oneWayVy: -2,
				});
			}

			// 3 Chileka Airport Drop Targets along Left Ridge
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
			for (let i = 0; i < p.triCooldown.length; i++) {
				if (p.triCooldown[i] > 0) p.triCooldown[i] -= 1;
			}
			if (p.triRearm > 0) {
				p.triRearm -= 1;
				if (p.triRearm === 0) {
					p.triangleLit = [false, false, false];
				}
			}
			if (p.runwayTimer > 0) {
				p.runwayTimer -= 1;
				if (p.runwayTimer === 0) {
					p.dropTargetsDown = [false, false, false];
					p.statusMessage = "RUNWAY CLOSED";
				}
			}
			if (p.loopCooldown > 0) p.loopCooldown -= 1;
			if (p.vaultCooldown > 0) p.vaultCooldown -= 1;
			if (p.reserveCooldown > 0) p.reserveCooldown -= 1;
			if (p.reserveFastCd > 0) p.reserveFastCd -= 1;

			// Limbe Express schedule: a timed double-points window on the kicker
			if (p.expressWindow > 0) {
				p.expressWindow -= 1;
				if (p.expressWindow === 0) {
					p.statusMessage = "LIMBE EXPRESS DEPARTED";
				}
			} else {
				p.expressIdle -= 1;
				if (p.expressIdle <= 0) {
					p.expressWindow = 360; // 6s window
					p.expressIdle = 1500; // ~25s until the next departure
					soundFX.playTargetHit(true);
					p.statusMessage = "LIMBE EXPRESS DEPARTING — LEFT KICKER ×3";
				}
			}

			// Plunger charge & release logic
			const ballInShooterLane = p.ball.x > 475 && p.ball.y > 540;
			if (ctrl.plunger && ballInShooterLane) {
				p.plungerCharge = Math.min(100, p.plungerCharge + 1.85);
			} else if (!ctrl.plunger && p.plungerCharge > 4 && ballInShooterLane) {
				const charge = p.plungerCharge;
				const launchPower =
					15.5 + (charge / 100) * 14.5 + (Math.random() - 0.5) * 0.9;
				p.ball.vy = -launchPower;
				p.ball.vx = -0.8;
				soundFX.playPlungerLaunch(charge / 100);
				p.plungerCharge = 0;
				p.hasLaunched = true;
				// A fresh launch starts with a clean tilt slate
				p.tiltWarningCount = 0;
				p.isTilted = false;
				p.ballSaveTimer = 15; // 15s ball save on launch
				// Chipembere skill shot: launch-power zones pay out off the plunger
				let zoneName = "CITY LIMITS";
				let zonePts = 2000;
				if (charge >= 75) {
					zoneName = "FULL EXPRESS";
					zonePts = 12000;
				} else if (charge >= 35) {
					zoneName = "HIGHWAY CRUISE";
					zonePts = 5000;
				}
				addPoints(zonePts, 499, 300, zoneName, "#F59E0B");
				p.statusMessage = `SKILL SHOT: ${zoneName} · BALL SAVE ACTIVE (15S)`;
			} else if (!ctrl.plunger) {
				p.plungerCharge = Math.max(0, p.plungerCharge - 6);
			}

			// Capture states hold the main ball (loop kicker + vault) while any
			// extra multiball keeps rolling underneath. Ejects fire the moment
			// the timer hits zero (no re-park, or the kick would be destroyed)
			// and arm an entry cooldown so the ball can't instantly recapture.
			let mainParked = false;
			if (p.loopCaptureTimer > 0) {
				p.loopCaptureTimer -= 1;
				if (p.loopCaptureTimer === 0) {
					// Eject with a strong kick toward the center bumpers
					const ejectAngle = Math.PI * 0.72 + (Math.random() - 0.5) * 0.22;
					const speed = 15.5;
					p.ball.vx = Math.cos(ejectAngle) * speed;
					p.ball.vy = Math.sin(ejectAngle) * speed;
					spawnParticles(398, 215, "#10B981", 16);
					soundFX.playPlungerLaunch(0.9);
					p.loopCooldown = 45;
				} else {
					p.ball.x = 398 + Math.sin(p.loopCaptureTimer * 0.5) * 2.5;
					p.ball.y = 215 + Math.cos(p.loopCaptureTimer * 0.5) * 2.5;
					p.ball.vx = 0;
					p.ball.vy = 0;
					mainParked = true;
				}
			}
			if (p.vaultCaptureTimer > 0) {
				p.vaultCaptureTimer -= 1;
				if (p.vaultCaptureTimer === 0) {
					if (p.vaultLocks >= 3) {
						startMultiball();
					} else {
						const ejectAngle =
							Math.atan2(195 - VAULT_Y, 250 - VAULT_X) +
							(Math.random() - 0.5) * 0.2;
						p.ball.vx = Math.cos(ejectAngle) * 14;
						p.ball.vy = Math.sin(ejectAngle) * 14;
						spawnParticles(VAULT_X, VAULT_Y, "#F59E0B", 12);
						soundFX.playPlungerLaunch(0.7);
					}
					p.vaultCooldown = 45;
				} else {
					p.ball.x = VAULT_X + Math.sin(p.vaultCaptureTimer * 0.5) * 2.5;
					p.ball.y = VAULT_Y + Math.cos(p.vaultCaptureTimer * 0.5) * 2.5;
					p.ball.vx = 0;
					p.ball.vy = 0;
					mainParked = true;
				}
			}
			if (p.reserveTimer > 0) {
				p.reserveTimer -= 1;
				if (p.reserveTimer === 0) {
					// Bank the jackpot and eject back toward the bumpers
					const banked = p.reserveJackpot;
					p.reserveJackpot = RESERVE_BASE;
					const ejectAngle =
						Math.atan2(200 - RESERVE_Y, 250 - RESERVE_X) +
						(Math.random() - 0.5) * 0.2;
					p.ball.vx = Math.cos(ejectAngle) * 13;
					p.ball.vy = Math.sin(ejectAngle) * 13;
					addPoints(
						banked,
						RESERVE_X,
						RESERVE_Y - 24,
						"RESERVE BANKED",
						"#10B981",
					);
					spawnParticles(RESERVE_X, RESERVE_Y, "#10B981", 14);
					soundFX.playRankPromotion();
					p.statusMessage = `RESERVE BANKED ${banked.toLocaleString()} · JACKPOT RESET`;
					p.reserveCooldown = 45;
				} else {
					p.ball.x = RESERVE_X + Math.sin(p.reserveTimer * 0.5) * 2.5;
					p.ball.y = RESERVE_Y + Math.cos(p.reserveTimer * 0.5) * 2.5;
					p.ball.vx = 0;
					p.ball.vy = 0;
					mainParked = true;
				}
			}

			// Anti-stuck nudge: a live main ball that barely moves gets a kick
			// instead of parking forever. Parked pre-launch balls, captures,
			// the lane, and the drain approach are left alone — and while a
			// flipper is held the player is in control, so hands off.
			const flipping = ctrl.left || ctrl.right;
			const stuckSafe =
				!p.hasLaunched ||
				mainParked ||
				flipping ||
				p.ball.x >= 474 ||
				p.ball.y >= 740;
			if (stuckSafe) {
				p.stuckN = 0;
				p.stuckX = p.ball.x;
				p.stuckY = p.ball.y;
			} else if (p.stuckCd > 0) {
				p.stuckCd -= 1;
			} else {
				p.stuckN += 1;
				if (p.stuckN >= 150) {
					const moved = Math.hypot(p.ball.x - p.stuckX, p.ball.y - p.stuckY);
					p.stuckX = p.ball.x;
					p.stuckY = p.ball.y;
					p.stuckN = 0;
					if (moved < 8) {
						p.stuckCd = 300;
						p.ball.vx += (Math.random() - 0.5) * 8;
						p.ball.vy -= 7;
						soundFX.playNudge();
						p.popups.push({
							x: p.ball.x,
							y: p.ball.y - 20,
							text: "STUCK — AUTO NUDGE",
							color: "#F59E0B",
							alpha: 1.0,
							vy: -1.1,
						});
					}
				}
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

			// One full substep pass for a single ball; the main ball and any
			// multiball extras share it so every ball scores and collides alike
			const stepOneBall = (ball: BallState, isMain: boolean) => {
				for (let step = 0; step < SUB_STEPS; step++) {
					ball.vy += gravity;
					ball.vx *= 0.9992 ** dt;
					ball.vy *= 0.9992 ** dt;

					ball.x += ball.vx * dt;
					ball.y += ball.vy * dt;

					// Close one-way gate once the main ball exits into the playfield
					if (isMain && !p.oneWayGateClosed && ball.x < 462 && ball.y < 230) {
						p.oneWayGateClosed = true;
					}

					// 1. Collide with static walls, slingshots, and drop targets
					for (const wall of walls) {
						// One-way surfaces: pass through when moving up fast
						// enough, collide otherwise (gate blocks fall-backs,
						// spring tip catches falls but never stops a launch)
						if (wall.isOneWay && ball.vy < (wall.oneWayVy ?? -2)) continue;
						const closest = closestPointOnSegment(
							ball.x,
							ball.y,
							wall.x1,
							wall.y1,
							wall.x2,
							wall.y2,
						);
						const dx = ball.x - closest.x;
						const dy = ball.y - closest.y;
						const dist = Math.hypot(dx, dy);

						if (dist < ball.radius && dist > 0.0001) {
							const nx = dx / dist;
							const ny = dy / dist;

							// Resolve penetration
							ball.x = closest.x + nx * ball.radius;
							ball.y = closest.y + ny * ball.radius;

							const vn = ball.vx * nx + ball.vy * ny;
							if (vn < 0) {
								if (wall.isSlingshot && wall.slingshotNormal && !p.isTilted) {
									ball.vx = wall.slingshotNormal.x * 13.5;
									ball.vy = wall.slingshotNormal.y * 13.5;
									const isLeft = wall.x1 < 250;
									if (isLeft) {
										p.slingshotFlashLeft = 10;
									} else {
										p.slingshotFlashRight = 10;
									}
									soundFX.playSlingshot();
									// Limbe Express: timed triple points on the left kicker
									let slingLabel = "KICKER";
									let slingPts = 350;
									if (isLeft) {
										slingLabel = "LIMBE";
										if (p.expressWindow > 0) {
											slingLabel = "LIMBE EXPRESS";
											slingPts = 1000;
										}
									}
									addPoints(
										slingPts,
										closest.x,
										closest.y,
										slingLabel,
										"#F59E0B",
									);
									spawnParticles(
										closest.x,
										closest.y,
										"#F59E0B",
										slingPts > 350 ? 14 : 7,
									);
								} else if (
									wall.isDropTarget &&
									wall.targetIndex !== undefined
								) {
									const rest = wall.restitution ?? 0.95;
									ball.vx -= (1 + rest) * vn * nx;
									ball.vy -= (1 + rest) * vn * ny;

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
										// Runway opens: doubled lanes for 20s, then the
										// bank resets when it closes
										p.runwayTimer = 1200;
										p.statusMessage = `CHILEKA CLEARED! MULTIPLIER UP TO ${p.multiplier}X · RUNWAY OPEN 20S`;
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
									ball.vx -= (1 + rest) * vn * nx;
									ball.vy -= (1 + rest) * vn * ny;
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
							ball.x,
							ball.y,
							flipper.pivotX,
							flipper.pivotY,
							tipX,
							tipY,
						);

						const flipperThickness = 7.5;
						const minDist = ball.radius + flipperThickness;
						const dx = ball.x - closest.x;
						const dy = ball.y - closest.y;
						const dist = Math.hypot(dx, dy);

						if (dist < minDist && dist > 0.0001) {
							const nx = dx / dist;
							const ny = dy / dist;

							ball.x = closest.x + nx * minDist;
							ball.y = closest.y + ny * minDist;

							const vn = ball.vx * nx + ball.vy * ny;
							const radiusArm = closest.t * flipper.length;
							const swingBoost =
								Math.abs(flipper.angularVelocity) * radiusArm * 2.4;

							if (vn < 0) {
								const restitution = 0.82;
								ball.vx -= (1 + restitution) * vn * nx;
								ball.vy -= (1 + restitution) * vn * ny;
							}

							if (swingBoost > 0.4 && !p.isTilted) {
								ball.vx +=
									nx * (swingBoost + 6.8) + (Math.random() - 0.5) * 0.7;
								ball.vy += ny * (swingBoost + 8.5);
							}
						}
					};

					checkFlipperCollision(p.leftFlipper);
					checkFlipperCollision(p.rightFlipper);

					// 3. Collide with Jet Bumpers (Michiru, Soche, Ndirande, Kabula)
					p.bumpers.forEach((bumper, idx) => {
						const dx = ball.x - bumper.x;
						const dy = ball.y - bumper.y;
						const dist = Math.hypot(dx, dy);
						const minDist = ball.radius + bumper.radius;

						if (dist < minDist && dist > 0.0001) {
							const nx = dx / dist;
							const ny = dy / dist;

							ball.x = bumper.x + nx * minDist;
							ball.y = bumper.y + ny * minDist;

							const bounceSpeed = Math.max(
								10.5,
								Math.hypot(ball.vx, ball.vy) * 1.12,
							);
							ball.vx = nx * bounceSpeed;
							ball.vy = ny * bounceSpeed;

							if (bumper.hitTimer === 0 && !p.isTilted) {
								bumper.hitTimer = 12;
								soundFX.playBumper(idx + p.bumperUpgradeLevel);
								// Every bumper hit feeds the Reserve jackpot
								p.reserveJackpot += 250;
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

					// 4. CBD standup targets (Victoria / Henderson /
					// Haile Selassie) — light all three for the block bonus
					TRI_TARGETS.forEach((target, idx) => {
						if (p.triCooldown[idx] > 0) return;
						const dx = ball.x - target.x;
						const dy = ball.y - target.y;
						const dist = Math.hypot(dx, dy);
						const minDist = ball.radius + 10;
						if (dist < minDist && dist > 0.0001) {
							const nx = dx / dist;
							const ny = dy / dist;
							ball.x = target.x + nx * minDist;
							ball.y = target.y + ny * minDist;
							const vn = ball.vx * nx + ball.vy * ny;
							if (vn < 0) {
								ball.vx -= 2 * vn * nx;
								ball.vy -= 2 * vn * ny;
								ball.vx += nx * 2.5;
								ball.vy += ny * 2.5;
							}
							p.triCooldown[idx] = 30;
							if (p.isTilted) return;
							soundFX.playTargetHit(false);
							if (!p.triangleLit[idx]) {
								p.triangleLit[idx] = true;
								addPoints(
									1000,
									target.x,
									target.y - 20,
									target.label,
									"#F59E0B",
								);
								spawnParticles(target.x, target.y, "#F59E0B", 8);
								if (p.triangleLit.every(Boolean)) {
									addPoints(10000, 250, 480, "CBD COMPLETE", "#F59E0B");
									p.multiplier = Math.min(8, p.multiplier + 1);
									soundFX.playRankPromotion();
									p.statusMessage = `CBD COMPLETE! MULTIPLIER UP TO ${p.multiplier}X`;
									p.triRearm = 120;
								}
							} else {
								addPoints(
									400,
									target.x,
									target.y - 20,
									target.label,
									"#94A3B8",
								);
							}
						}
					});
				}
			};

			if (!mainParked) stepOneBall(p.ball, true);
			for (const extra of p.extraBalls) stepOneBall(extra, false);

			// 4. Chichiri Loop Kicker Pocket, main ball only (x: 398, y: 215)
			const distLoop = Math.hypot(p.ball.x - 398, p.ball.y - 215);
			if (
				distLoop < 18 &&
				p.loopCaptureTimer === 0 &&
				p.vaultCaptureTimer === 0 &&
				p.loopCooldown === 0 &&
				!p.isTilted
			) {
				p.loopCaptureTimer = 52; // ~0.85s lock
				soundFX.playLoopCapture();
				addPoints(3500, 398, 195, "CHICHIRI LOOP", "#10B981");
				advanceMission("LOOP", 1);
				p.ballSaveTimer = Math.max(p.ballSaveTimer, 10);
				p.statusMessage = "CHICHIRI LOOP LOCKED · +3,500 PTS & BALL SAVE";
			}

			// 4b. Mandala Vault pocket, main ball only — locks feed multiball
			const distVault = Math.hypot(p.ball.x - VAULT_X, p.ball.y - VAULT_Y);
			if (
				distVault < 16 &&
				p.vaultCaptureTimer === 0 &&
				p.loopCaptureTimer === 0 &&
				p.vaultCooldown === 0 &&
				!p.isTilted
			) {
				p.vaultCaptureTimer = 45; // ~0.75s lock
				soundFX.playTargetHit(false);
				p.vaultLocks += 1;
				addPoints(
					2500,
					VAULT_X,
					VAULT_Y - 22,
					`VAULT LOCK ${p.vaultLocks}/3`,
					"#F59E0B",
				);
				spawnParticles(VAULT_X, VAULT_Y, "#F59E0B", 10);
				p.statusMessage =
					p.vaultLocks >= 3
						? "VAULT FULL — HOLD ON"
						: `VAULT LOCK ${p.vaultLocks}/3 · MANDALA HOUSE`;
			}

			// 4c. Reserve Bank chamber, main ball only — soft shots bank it
			const distReserve = Math.hypot(
				p.ball.x - RESERVE_X,
				p.ball.y - RESERVE_Y,
			);
			const reserveSpeed = Math.hypot(p.ball.vx, p.ball.vy);
			if (
				distReserve < 14 &&
				p.reserveTimer === 0 &&
				p.loopCaptureTimer === 0 &&
				p.vaultCaptureTimer === 0 &&
				p.reserveCooldown === 0 &&
				!p.isTilted
			) {
				if (reserveSpeed < 9) {
					p.reserveTimer = 60; // ~1s hold
					soundFX.playTargetHit(false);
					p.statusMessage = "RESERVE CHAMBER — BANKING JACKPOT";
				} else if (p.reserveFastCd === 0) {
					p.reserveFastCd = 120;
					p.popups.push({
						x: p.ball.x,
						y: p.ball.y - 20,
						text: "TOO FAST!",
						color: "#94A3B8",
						alpha: 1.0,
						vy: -1.1,
					});
				}
			}

			const liveBalls = [p.ball, ...p.extraBalls];

			// 5. Rollover Lanes (every live ball; doubled while runway is open)
			for (const ball of liveBalls) {
				p.rollovers.forEach((lane) => {
					if (lane.cooldown === 0 && !p.isTilted) {
						const d = Math.hypot(ball.x - lane.x, ball.y - lane.y);
						if (d < lane.radius + ball.radius * 0.6) {
							lane.cooldown = 45;
							const wasLit = p.sectorLights[lane.letterIndex];
							p.sectorLights[lane.letterIndex] = true;
							soundFX.playTargetHit(false);
							let base = wasLit ? 400 : 1200;
							if (p.runwayTimer > 0) base *= 2;
							addPoints(
								base,
								lane.x,
								lane.y - 12,
								lane.road.toUpperCase(),
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
			}

			// Clamp speed + record trails (every live ball)
			for (const ball of liveBalls) {
				const speed = Math.hypot(ball.vx, ball.vy);
				const maxSpeed = 24;
				if (speed > maxSpeed) {
					ball.vx = (ball.vx / speed) * maxSpeed;
					ball.vy = (ball.vy / speed) * maxSpeed;
				}
				ball.trail.unshift({ x: ball.x, y: ball.y });
				if (ball.trail.length > 12) {
					ball.trail.pop();
				}
			}

			// Lane recovery: a launched main ball that dribbles back down the
			// shooter lane parks on the pad for a proper retry; a settled
			// extra ball kicks itself back out so multiball can't soft-lock
			if (p.hasLaunched) {
				const mainSpeed = Math.hypot(p.ball.vx, p.ball.vy);
				const mainInLane = p.ball.x > 474 && p.ball.y > 540;
				const mainOnPad =
					Math.abs(p.ball.x - SEAT_X) < 3 && Math.abs(p.ball.y - SEAT_Y) < 3;
				if (mainInLane && mainSpeed < 0.7 && !mainOnPad) {
					p.ball.stillFrames += 1;
					if (p.ball.stillFrames > 120) {
						p.ball.stillFrames = 0;
						p.ball.x = SEAT_X;
						p.ball.y = SEAT_Y;
						p.ball.vx = 0;
						p.ball.vy = 0;
						p.plungerCharge = 0;
						p.oneWayGateClosed = false;
						p.statusMessage = "BACK ON THE PAD — HOLD SPACE";
					}
				} else {
					p.ball.stillFrames = 0;
				}
				for (const extra of p.extraBalls) {
					const speed = Math.hypot(extra.vx, extra.vy);
					if (extra.x > 474 && extra.y > 540 && speed < 0.7) {
						extra.stillFrames += 1;
						if (extra.stillFrames > 120) {
							extra.stillFrames = 0;
							extra.vx = -0.8;
							extra.vy = -22;
							soundFX.playPlungerLaunch(0.5);
						}
					} else {
						extra.stillFrames = 0;
					}
				}
			}

			// 6. Extra-ball drains (multiball balls just leave the table)
			for (let i = p.extraBalls.length - 1; i >= 0; i--) {
				const extra = p.extraBalls[i];
				if (extra.y > 765) {
					p.extraBalls.splice(i, 1);
					soundFX.playBallDrain();
					if (p.multiball && p.extraBalls.length === 0) {
						p.multiball = false;
						p.statusMessage = "MULTIBALL END";
					}
				}
			}

			// 7. Main-ball drain below flippers
			if (p.ball.y > 765) {
				const promoted = p.multiball ? p.extraBalls.shift() : undefined;
				if (promoted) {
					// An extra becomes the main ball — play continues
					p.ball = promoted;
					if (p.extraBalls.length === 0) {
						p.multiball = false;
						p.statusMessage = "MULTIBALL END";
					} else {
						p.statusMessage = "STILL ROLLING — MULTIBALL";
					}
				} else if (p.ballSaveTimer > 0 && !p.isTilted) {
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
					// A lost ball resets table modes for the next one
					p.runwayTimer = 0;
					p.triangleLit = [false, false, false];
					p.dropTargetsDown = [false, false, false];

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
			ctx.fillStyle = "#10B981";
			ctx.fillText(`RESERVE ${p.reserveJackpot.toLocaleString()}`, 0, 64);
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

			// 4b. Reserve Bank chamber ring, label, and Hannover paint
			ctx.save();
			ctx.translate(RESERVE_X, RESERVE_Y);
			ctx.beginPath();
			ctx.arc(0, 0, 20, 0, Math.PI * 2);
			ctx.fillStyle = "rgba(16, 185, 129, 0.10)";
			ctx.fill();
			ctx.lineWidth = 3;
			ctx.strokeStyle = "#10B981";
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(0, 0, 11, 0, Math.PI * 2);
			ctx.lineWidth = 2;
			ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
			ctx.stroke();
			ctx.restore();

			ctx.fillStyle = "#10B981";
			ctx.font = "700 8px Orbitron, sans-serif";
			ctx.textAlign = "center";
			ctx.fillText("RESERVE", 350, 510);

			ctx.save();
			ctx.translate(330, 400);
			ctx.rotate(-Math.PI / 2);
			ctx.fillStyle = "rgba(148, 163, 184, 0.55)";
			ctx.font = "700 8px Orbitron, sans-serif";
			ctx.textAlign = "center";
			ctx.fillText("HANNOVER ST", 0, 0);
			ctx.restore();

			// 4b. Mandala Vault with lock pips
			ctx.save();
			ctx.translate(VAULT_X, VAULT_Y);
			ctx.beginPath();
			ctx.arc(0, 0, 20, 0, Math.PI * 2);
			ctx.fillStyle = "rgba(245, 158, 11, 0.12)";
			ctx.fill();
			ctx.lineWidth = 3;
			ctx.strokeStyle = "#F59E0B";
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(0, 0, 11, 0, Math.PI * 2);
			ctx.lineWidth = 2;
			ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
			ctx.stroke();
			ctx.restore();
			for (let i = 0; i < 3; i++) {
				ctx.beginPath();
				ctx.arc(VAULT_X - 14 + i * 14, VAULT_Y + 30, 4, 0, Math.PI * 2);
				ctx.fillStyle =
					i < p.vaultLocks ? "#F59E0B" : "rgba(148, 163, 184, 0.35)";
				ctx.fill();
			}
			ctx.fillStyle = "#F59E0B";
			ctx.font = "700 8px Orbitron, sans-serif";
			ctx.textAlign = "center";
			ctx.fillText("MANDALA VAULT", VAULT_X, VAULT_Y - 28);

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
				if (w.noDraw) return;
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

			// Label for Chileka Airport bank
			ctx.save();
			ctx.translate(50, 430);
			ctx.rotate(-Math.PI / 2);
			ctx.fillStyle = "#38BDF8";
			ctx.font = "700 8px Orbitron, sans-serif";
			ctx.textAlign = "center";
			ctx.fillText("CHILEKA AIRPORT", 0, 0);
			ctx.restore();

			// Painted lane art: Masauko Chipembere Highway up the shooter lane
			ctx.save();
			ctx.translate(499, 400);
			ctx.rotate(-Math.PI / 2);
			ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
			ctx.font = "700 9px Orbitron, sans-serif";
			ctx.textAlign = "center";
			ctx.fillText("MASAUKO CHIPEMBERE HWY", 0, 0);
			ctx.restore();

			// 7b. CBD standup targets, lit gold once hit
			TRI_TARGETS.forEach((target, idx) => {
				const lit = p.triangleLit[idx];
				ctx.save();
				ctx.beginPath();
				ctx.arc(target.x, target.y, 10, 0, Math.PI * 2);
				ctx.fillStyle = lit ? "#F59E0B" : "rgba(30, 41, 59, 0.85)";
				ctx.fill();
				ctx.lineWidth = 2;
				ctx.strokeStyle = lit ? "#FEF3C7" : "rgba(148, 163, 184, 0.5)";
				ctx.stroke();
				ctx.fillStyle = lit ? "#0F172A" : "#94A3B8";
				ctx.font = "700 7px Orbitron, sans-serif";
				ctx.textAlign = "center";
				ctx.fillText(target.label, target.x, target.y + 20);
				ctx.restore();
			});

			// Runway countdown while Chileka stays open
			if (p.runwayTimer > 0) {
				ctx.fillStyle = "#38BDF8";
				ctx.font = "700 9px Orbitron, sans-serif";
				ctx.textAlign = "center";
				ctx.fillText(
					`RWY OPEN ${Math.ceil(p.runwayTimer / 60)}S · LANES ×2`,
					110,
					348,
				);
			}

			// Limbe Express departure tag on the left kicker
			if (p.expressWindow > 0) {
				ctx.fillStyle = "#F59E0B";
				ctx.font = "700 8px Orbitron, sans-serif";
				ctx.textAlign = "center";
				ctx.fillText("EXPRESS ×3", 145, 515);
			}

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

			// 11. Render Ball Motion Trails & Pinballs (main + multiball extras)
			const paintBall = (bx: number, by: number, br: number) => {
				const ballGrad = ctx.createRadialGradient(
					bx - 3.5,
					by - 3.5,
					1.5,
					bx,
					by,
					br,
				);
				ballGrad.addColorStop(0, "#FFFFFF");
				ballGrad.addColorStop(0.55, "#E2E8F0");
				ballGrad.addColorStop(1, "#64748B");

				ctx.save();
				ctx.beginPath();
				ctx.arc(bx, by, br, 0, Math.PI * 2);
				ctx.fillStyle = ballGrad;
				ctx.fill();
				ctx.lineWidth = 1.2;
				ctx.strokeStyle = "#F8FAFC";
				ctx.stroke();
				ctx.restore();
			};

			p.ball.trail.forEach((pt, idx) => {
				const ratio = 1 - idx / p.ball.trail.length;
				ctx.beginPath();
				ctx.arc(pt.x, pt.y, p.ball.radius * ratio * 0.75, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(56, 189, 248, ${ratio * 0.24})`;
				ctx.fill();
			});
			paintBall(p.ball.x, p.ball.y, p.ball.radius);

			p.extraBalls.forEach((extra) => {
				extra.trail.forEach((pt, idx) => {
					const ratio = 1 - idx / extra.trail.length;
					ctx.beginPath();
					ctx.arc(pt.x, pt.y, extra.radius * ratio * 0.75, 0, Math.PI * 2);
					ctx.fillStyle = `rgba(56, 189, 248, ${ratio * 0.24})`;
					ctx.fill();
				});
				paintBall(extra.x, extra.y, extra.radius);
			});

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
