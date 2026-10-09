import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import "../game/arcade.css";
import { PinballCanvas } from "../game/PinballCanvas";
import type { GameState, TelemetrySnapshot } from "../game/types";
import { INITIAL_TELEMETRY } from "../game/types";

export const Route = createFileRoute("/game")({
	component: GamePage,
});

function GamePage() {
	const [gameState, setGameState] = useState<GameState>("PLAYING");
	const [leftFlipper, setLeftFlipper] = useState(false);
	const [rightFlipper, setRightFlipper] = useState(false);
	const [plungerHeld, setPlungerHeld] = useState(false);
	const [nudgeTrigger, setNudgeTrigger] = useState(0);
	const [resetTrigger, setResetTrigger] = useState(0);
	const [finalScore, setFinalScore] = useState<number | null>(null);
	const [telemetry, setTelemetry] =
		useState<TelemetrySnapshot>(INITIAL_TELEMETRY);

	const handlePlayAgain = () => {
		setFinalScore(null);
		setResetTrigger((prev) => prev + 1);
		setGameState("PLAYING");
	};

	// Keyboard controls: flippers, plunger, nudge
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.repeat || gameState !== "PLAYING") return;

			if (e.code === "ArrowLeft" || e.code === "KeyZ" || e.code === "KeyA") {
				e.preventDefault();
				setLeftFlipper(true);
			} else if (
				e.code === "ArrowRight" ||
				e.code === "Slash" ||
				e.code === "KeyD"
			) {
				e.preventDefault();
				setRightFlipper(true);
			} else if (e.code === "Space" || e.code === "ArrowDown") {
				e.preventDefault();
				setPlungerHeld(true);
			} else if (e.code === "KeyX" || e.code === "ArrowUp") {
				e.preventDefault();
				setNudgeTrigger((prev) => prev + 1);
			}
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.code === "ArrowLeft" || e.code === "KeyZ" || e.code === "KeyA") {
				setLeftFlipper(false);
			} else if (
				e.code === "ArrowRight" ||
				e.code === "Slash" ||
				e.code === "KeyD"
			) {
				setRightFlipper(false);
			} else if (e.code === "Space" || e.code === "ArrowDown") {
				setPlungerHeld(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [gameState]);

	return (
		<main className="flex min-h-screen flex-col items-center bg-surface px-4 py-6 antialiased">
			{/* Slim score strip */}
			<div className="arcade-mono flex w-full max-w-[500px] items-center justify-between text-sm">
				<span className="font-bold text-primary">
					{telemetry.score.toLocaleString().padStart(8, "0")}
				</span>
				<span className="text-on-surface-variant">
					BALL {telemetry.currentBall} OF 3
				</span>
				<span className="font-bold text-secondary">
					x{telemetry.multiplier}
				</span>
				<span className="text-on-surface-variant">
					BEST {telemetry.highScore.toLocaleString()}
				</span>
			</div>

			{/* The board */}
			<div className="relative mt-3 w-full max-w-[500px]">
				<PinballCanvas
					gameState={gameState}
					leftFlipperPressed={leftFlipper}
					rightFlipperPressed={rightFlipper}
					plungerPressed={plungerHeld}
					nudgeTrigger={nudgeTrigger}
					resetTrigger={resetTrigger}
					onTelemetryUpdate={setTelemetry}
					onRoundSummary={() => {
						// Engine auto-serves the next ball; stay on the board.
					}}
					onGameOver={(score) => {
						setFinalScore(score);
						setGameState("GAME_OVER");
					}}
				/>

				{gameState === "GAME_OVER" && finalScore !== null && (
					<div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-slate-950/85 p-6 text-center">
						<p className="arcade-mono text-xs tracking-widest text-sky-400">
							GAME OVER
						</p>
						<p className="arcade-mono mt-2 text-3xl font-bold text-amber-400">
							{finalScore.toLocaleString()}
						</p>
						<button
							type="button"
							onClick={handlePlayAgain}
							className="arcade-display mt-5 cursor-pointer rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 transition-transform active:scale-95 hover:bg-amber-300"
						>
							Play Again
						</button>
					</div>
				)}
			</div>

			{/* Engine status line */}
			<p className="arcade-mono mt-3 w-full max-w-[500px] truncate text-center text-xs text-on-surface-variant">
				{telemetry.statusMessage}
			</p>

			{/* Touch controls */}
			<div className="mt-3 grid w-full max-w-[500px] grid-cols-4 gap-2.5">
				<button
					type="button"
					onMouseDown={() => setLeftFlipper(true)}
					onMouseUp={() => setLeftFlipper(false)}
					onMouseLeave={() => setLeftFlipper(false)}
					onTouchStart={(e) => {
						e.preventDefault();
						setLeftFlipper(true);
					}}
					onTouchEnd={() => setLeftFlipper(false)}
					className={`arcade-display cursor-pointer select-none whitespace-nowrap rounded-xl border px-3 py-3 text-xs font-bold transition-transform ${
						leftFlipper
							? "scale-95 border-amber-300 bg-amber-400 text-slate-950"
							: "border-slate-700 bg-[#131D31] text-slate-200"
					}`}
				>
					◀ FLIP
				</button>

				<button
					type="button"
					onMouseDown={() => setPlungerHeld(true)}
					onMouseUp={() => setPlungerHeld(false)}
					onMouseLeave={() => setPlungerHeld(false)}
					onTouchStart={(e) => {
						e.preventDefault();
						setPlungerHeld(true);
					}}
					onTouchEnd={() => setPlungerHeld(false)}
					className={`arcade-display cursor-pointer select-none whitespace-nowrap rounded-xl border px-3 py-3 text-xs font-bold transition-transform ${
						plungerHeld
							? "scale-95 border-sky-300 bg-sky-400 text-slate-950"
							: "border-slate-700 bg-[#131D31] text-sky-300"
					}`}
				>
					LAUNCH
				</button>

				<button
					type="button"
					onClick={() => setNudgeTrigger((prev) => prev + 1)}
					className="arcade-display cursor-pointer select-none whitespace-nowrap rounded-xl border border-slate-700 bg-[#131D31] px-3 py-3 text-xs font-bold text-emerald-300 transition-transform active:scale-95"
				>
					NUDGE
				</button>

				<button
					type="button"
					onMouseDown={() => setRightFlipper(true)}
					onMouseUp={() => setRightFlipper(false)}
					onMouseLeave={() => setRightFlipper(false)}
					onTouchStart={(e) => {
						e.preventDefault();
						setRightFlipper(true);
					}}
					onTouchEnd={() => setRightFlipper(false)}
					className={`arcade-display cursor-pointer select-none whitespace-nowrap rounded-xl border px-3 py-3 text-xs font-bold transition-transform ${
						rightFlipper
							? "scale-95 border-amber-300 bg-amber-400 text-slate-950"
							: "border-slate-700 bg-[#131D31] text-slate-200"
					}`}
				>
					FLIP ▶
				</button>
			</div>
		</main>
	);
}
