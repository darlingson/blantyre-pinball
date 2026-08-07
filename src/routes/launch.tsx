import { createFileRoute, Link } from "@tanstack/react-router";
import { Info, Play, Settings, Trophy } from "lucide-react";

export const Route = createFileRoute("/launch")({
	component: LaunchPage,
});

function LaunchPage() {
	return (
		<main className="bg-animated-gradient relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-md antialiased">
			{/* Center Logo & Branding */}
			<div className="z-10 mb-2xl flex w-full flex-col items-center justify-center">
				<div className="mb-xl h-56 w-56 animate-fade-in-up sm:h-64 sm:w-64">
					<img
						alt="Blantyre Pinball Logo"
						className="h-full w-full object-contain drop-shadow-xl"
						src="/logo.png"
					/>
				</div>
				<h1 className="text-display-lg w-full text-center tracking-tighter text-primary drop-shadow-md">
					BLANTYRE PINBALL
				</h1>
				<p className="mt-sm w-full text-center text-body-md text-on-surface-variant">
					Built for the energy of Malawi.
				</p>
			</div>

			{/* Action Buttons */}
			<div className="z-10 flex w-full flex-col items-center gap-md">
				<Link
					to="/game"
					className="squish-btn group relative flex w-72 items-center justify-center gap-sm overflow-hidden rounded-full bg-secondary-container py-lg text-headline-md text-on-secondary-container shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
				>
					<span className="absolute inset-0 translate-y-full rounded-full bg-white/20 transition-transform duration-300 group-hover:translate-y-0" />
					<Play
						className="relative z-10 h-8 w-8 text-[32px]"
						fill="currentColor"
					/>
					<span className="relative z-10 uppercase tracking-wide">
						Start Game
					</span>
				</Link>

				{/* Secondary Navigation Grid */}
				<div className="mt-lg grid w-full max-w-[420px] grid-cols-2 gap-md">
					<button
						type="button"
						className="squish-btn glass-panel soft-depth flex flex-col items-center justify-center gap-xs rounded-xl py-5 text-primary transition-colors hover:bg-surface/50"
					>
						<Trophy className="h-6 w-6" />
						<span className="text-label-caps text-label-caps">Leaderboard</span>
					</button>
					<button
						type="button"
						className="squish-btn glass-panel soft-depth flex flex-col items-center justify-center gap-xs rounded-xl py-5 text-primary transition-colors hover:bg-surface/50"
					>
						<Settings className="h-6 w-6" />
						<span className="text-label-caps text-label-caps">Settings</span>
					</button>
				</div>

				{/* About Button */}
				<Link
					to="/about"
					className="squish-btn mt-sm flex items-center gap-xs rounded-full py-sm px-md text-label-caps text-on-surface-variant transition-colors hover:bg-surface-variant/30 hover:text-primary"
				>
					<Info className="h-4 w-4" />
					About
				</Link>
			</div>

			{/* Ambient UI Elements (Decorations) */}
			<div className="pointer-events-none absolute top-0 left-0 z-0 h-full w-full overflow-hidden">
				<div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-primary-fixed/30 opacity-50 blur-3xl" />
				<div className="absolute top-1/2 -right-32 h-96 w-96 rounded-full bg-secondary-fixed/20 opacity-50 blur-3xl" />
				<div className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-tertiary-fixed/20 opacity-50 blur-3xl" />
			</div>
		</main>
	);
}
