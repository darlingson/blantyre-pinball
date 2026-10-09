export type GameState =
	| "TITLE_MENU"
	| "PLAYING"
	| "PAUSED"
	| "ROUND_SUMMARY"
	| "GAME_OVER";

export interface RankTier {
	level: number;
	title: string;
	landmark: string;
	minScore: number;
	badgeCode: string;
}

export type MissionActionType =
	| "BUMPERS"
	| "DROP_TARGETS"
	| "WORMHOLE"
	| "RAMPS";

export interface MissionDef {
	id: string;
	title: string;
	location: string;
	description: string;
	targetGoal: number;
	rewardScore: number;
	actionType: MissionActionType;
}

export interface HighScoreEntry {
	initials: string;
	score: number;
	rankTitle: string;
	date: string;
}

export interface TelemetrySnapshot {
	score: number;
	highScore: number;
	ballsRemaining: number;
	currentBall: number;
	multiplier: number;
	rankIndex: number;
	activeMission: MissionDef;
	missionProgress: number;
	missionsCompleted: number;
	/** 8 letters: B-L-A-N-T-Y-R-E */
	sectorLights: boolean[];
	/** 3 targets: Chileka North / Central / South */
	dropTargetsDown: boolean[];
	/** 0 to 100 */
	plungerCharge: number;
	ballInPlunger: boolean;
	ballSaveActive: boolean;
	tiltWarningCount: number;
	isTilted: boolean;
	statusMessage: string;
	bumperUpgradeLevel: number;
}

export interface RoundSummary {
	roundScore: number;
	totalScore: number;
	ballsRemaining: number;
	multiplier: number;
	sectorBonus: number;
}

export const BLANTYRE_RANKS: RankTier[] = [
	{
		level: 1,
		title: "Chichiri Cadet",
		landmark: "Chichiri Trade Fair Grounds",
		minScore: 0,
		badgeCode: "CADET-01",
	},
	{
		level: 2,
		title: "Ndirande Scout",
		landmark: "Ndirande Mountain Ridge",
		minScore: 15000,
		badgeCode: "SCOUT-02",
	},
	{
		level: 3,
		title: "Soche Navigator",
		landmark: "Soche Hill Beacon",
		minScore: 45000,
		badgeCode: "NAV-03",
	},
	{
		level: 4,
		title: "Michiru Ranger",
		landmark: "Michiru Nature Sanctuary",
		minScore: 95000,
		badgeCode: "RNG-04",
	},
	{
		level: 5,
		title: "Victoria Avenue Captain",
		landmark: "Mount Soche Spire",
		minScore: 175000,
		badgeCode: "CAPT-05",
	},
	{
		level: 6,
		title: "Kabula Commander",
		landmark: "St. Michael & All Angels",
		minScore: 300000,
		badgeCode: "CMDR-06",
	},
	{
		level: 7,
		title: "Mulanje Fleet Admiral",
		landmark: "Sapitwa Orbital Relay",
		minScore: 500000,
		badgeCode: "ADM-07",
	},
];

export const BLANTYRE_MISSIONS: MissionDef[] = [
	{
		id: "michiru-patrol",
		title: "Michiru Peak Survey",
		location: "Upper Bumper Tri-Cluster",
		description:
			"Strike the Michiru, Soche, and Ndirande jet bumpers 8 times to calibrate orbital sensors.",
		targetGoal: 8,
		rewardScore: 15000,
		actionType: "BUMPERS",
	},
	{
		id: "chileka-approach",
		title: "Chileka Radar Lock",
		location: "Left Bank Drop Targets",
		description:
			"Knock down all 3 Chileka Radar drop targets to clear the approach corridor.",
		targetGoal: 3,
		rewardScore: 22500,
		actionType: "DROP_TARGETS",
	},
	{
		id: "chichiri-wormhole",
		title: "Chichiri Dome Singularity",
		location: "Right Orbital Kicker",
		description:
			"Lock the pinball inside the Chichiri Wormhole Kicker twice for hyper-launch.",
		targetGoal: 2,
		rewardScore: 30000,
		actionType: "WORMHOLE",
	},
	{
		id: "shire-express",
		title: "Shire Highlands Overdrive",
		location: "Outer Orbit & Rollovers",
		description:
			"Ignite upper orbit rollovers and bumpers 12 times to reach warp velocity.",
		targetGoal: 12,
		rewardScore: 40000,
		actionType: "BUMPERS",
	},
];

export const BLANTYRE_LETTERS = [
	"B",
	"L",
	"A",
	"N",
	"T",
	"Y",
	"R",
	"E",
] as const;

export const INITIAL_TELEMETRY: TelemetrySnapshot = {
	score: 0,
	highScore: 0,
	ballsRemaining: 3,
	currentBall: 1,
	multiplier: 1,
	rankIndex: 0,
	activeMission: BLANTYRE_MISSIONS[0],
	missionProgress: 0,
	missionsCompleted: 0,
	sectorLights: [false, false, false, false, false, false, false, false],
	dropTargetsDown: [false, false, false],
	plungerCharge: 0,
	ballInPlunger: true,
	ballSaveActive: false,
	tiltWarningCount: 0,
	isTilted: false,
	statusMessage: "PULL PLUNGER [SPACE] TO LAUNCH",
	bumperUpgradeLevel: 1,
};

export function rankForScore(score: number): number {
	let nextRank = 0;
	for (let i = BLANTYRE_RANKS.length - 1; i >= 0; i--) {
		if (score >= BLANTYRE_RANKS[i].minScore) {
			nextRank = i;
			break;
		}
	}
	return nextRank;
}
