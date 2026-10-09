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

export type MissionActionType = "BUMPERS" | "DROP_TARGETS" | "LOOP" | "RAMPS";

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
		title: "Chichiri Rookie",
		landmark: "Chichiri Trade Fair Grounds",
		minScore: 0,
		badgeCode: "RK-01",
	},
	{
		level: 2,
		title: "Ndirande Amateur",
		landmark: "Ndirande Mountain Ridge",
		minScore: 15000,
		badgeCode: "AM-02",
	},
	{
		level: 3,
		title: "Soche Semi-Pro",
		landmark: "Soche Hill Beacon",
		minScore: 45000,
		badgeCode: "SEMI-03",
	},
	{
		level: 4,
		title: "Michiru Professional",
		landmark: "Michiru Nature Sanctuary",
		minScore: 95000,
		badgeCode: "PRO-04",
	},
	{
		level: 5,
		title: "Victoria Avenue Captain",
		landmark: "Victoria Avenue",
		minScore: 175000,
		badgeCode: "CAPT-05",
	},
	{
		level: 6,
		title: "Kabula Champion",
		landmark: "St. Michael & All Angels",
		minScore: 300000,
		badgeCode: "CHMP-06",
	},
	{
		level: 7,
		title: "Mulanje Legend",
		landmark: "Sapitwa Peak",
		minScore: 500000,
		badgeCode: "LGD-07",
	},
];

export const BLANTYRE_MISSIONS: MissionDef[] = [
	{
		id: "michiru-patrol",
		title: "Michiru Peak Survey",
		location: "Upper Bumper Tri-Cluster",
		description:
			"Strike the Michiru, Soche, and Ndirande bumpers 8 times to light the trail.",
		targetGoal: 8,
		rewardScore: 15000,
		actionType: "BUMPERS",
	},
	{
		id: "chileka-approach",
		title: "Chileka Approach",
		location: "Left Bank Drop Targets",
		description: "Knock down all 3 Chileka drop targets to clear the approach.",
		targetGoal: 3,
		rewardScore: 22500,
		actionType: "DROP_TARGETS",
	},
	{
		id: "chileka-approach",
		title: "Chileka Approach",
		location: "Chileka Airport",
		description: "Knock down all 3 drop targets to clear the runway.",
		targetGoal: 3,
		rewardScore: 22500,
		actionType: "DROP_TARGETS",
	},
	{
		id: "shire-express",
		title: "Shire Highlands Cruise",
		location: "Outer Lanes & Rollovers",
		description:
			"Hit the upper rollovers and bumpers 12 times to reach full speed.",
		targetGoal: 12,
		rewardScore: 40000,
		actionType: "BUMPERS",
	},
	{
		id: "mandala-house",
		title: "Mandala House Tour",
		location: "Oldest Building · 1882",
		description:
			"Strike 20 bumpers to walk the veranda of Malawi's oldest building, home to a cafe, gallery and library.",
		targetGoal: 20,
		rewardScore: 50000,
		actionType: "BUMPERS",
	},
];

export interface StreetLane {
	letter: string;
	road: string;
}

/** The 8 rollover lanes, each a real Blantyre street. Order matches the
 *  B-L-A-N-T-Y-R-E lane positions on the table, top arch first. */
export const BLANTYRE_STREETS: StreetLane[] = [
	{ letter: "B", road: "Victoria Avenue" },
	{ letter: "L", road: "Henderson Street" },
	{ letter: "A", road: "Haile Selassie Rd" },
	{ letter: "N", road: "Glyn Jones Rd" },
	{ letter: "T", road: "Chipembere Hwy" },
	{ letter: "Y", road: "Mandala Rd" },
	{ letter: "R", road: "Ndirande Rd" },
	{ letter: "E", road: "Michiru Rd" },
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
