import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BoltIcon, LandmarkIcon, RoundaboutIcon } from "../components/icons";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

const leaderboard = [
	{ rank: 1, initials: "MJ", name: "MalawiJuice", score: "14,502,900" },
	{ rank: 2, initials: "KB", name: "KondwaniB", score: "12,184,000" },
	{ rank: 3, initials: "ZT", name: "ZikomoTech", score: "9,850,200" },
];

const features = [
	{
		num: "01",
		icon: RoundaboutIcon,
		kicker: "Precision lanes",
		title: "Traffic Circles",
		body: "Chain hits around Blantyre's iconic roundabouts to stack your multiplier.",
		chip: "bg-primary/10 text-primary",
		bar: "bg-primary",
	},
	{
		num: "02",
		icon: LandmarkIcon,
		kicker: "Hidden modes",
		title: "Iconic Landmarks",
		body: "Light targets styled after famous Malawian landmarks to unlock bonus rounds.",
		chip: "bg-secondary/10 text-secondary",
		bar: "bg-secondary",
	},
	{
		num: "03",
		icon: BoltIcon,
		kicker: "Midnight tilt",
		title: "High Energy",
		body: "Relentless, physics-driven action that captures the city's rapid heartbeat.",
		chip: "bg-primary-container/20 text-primary-container",
		bar: "bg-tertiary-container",
	},
];

function LandingPage() {
	const [drawerOpen, setDrawerOpen] = useState(false);

	return (
		<div className="flex min-h-screen flex-col antialiased">
			{/* TopAppBar */}
			<header className="fixed top-0 z-50 w-full bg-surface/80 shadow-sm backdrop-blur-md">
				<div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-lg py-sm">
					<Link to="/" className="flex items-center gap-sm text-primary">
						<span
							className="material-symbols-outlined"
							style={{ fontVariationSettings: "'FILL' 1" }}
						>
							sports_esports
						</span>
						<span className="font-display text-label-caps tracking-tighter">
							BLANTYRE PINBALL
						</span>
					</Link>

					<button
						type="button"
						className="p-2 text-primary md:hidden"
						onClick={() => setDrawerOpen(true)}
						aria-label="Open menu"
					>
						<span className="material-symbols-outlined">menu</span>
					</button>

					<nav className="hidden gap-lg md:flex">
						<Link
							to="/launch"
							className="rounded-full px-4 py-2 text-label-caps text-on-surface-variant transition-colors hover:bg-surface-variant/50 hover:text-primary"
						>
							Play Now
						</Link>
						<button
							type="button"
							className="rounded-full px-4 py-2 text-label-caps text-on-surface-variant transition-colors hover:bg-surface-variant/50 hover:text-primary"
						>
							Leaderboard
						</button>
						<button
							type="button"
							className="rounded-full px-4 py-2 text-label-caps text-on-surface-variant transition-colors hover:bg-surface-variant/50 hover:text-primary"
						>
							Settings
						</button>
						<Link
							to="/about"
							className="rounded-full px-4 py-2 text-label-caps text-on-surface-variant transition-colors hover:bg-surface-variant/50 hover:text-primary"
						>
							About
						</Link>
					</nav>
				</div>
			</header>

			{/* NavigationDrawer (Mobile Sidebar) */}
			<div
				className={`fixed inset-y-0 left-0 z-50 w-64 rounded-r-lg bg-surface shadow-xl transition-transform duration-300 md:hidden ${
					drawerOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="flex h-full flex-col bg-surface-container-low p-lg">
					<div className="mb-xl flex items-center justify-between">
						<span className="font-display text-headline-md text-primary">
							MENU
						</span>
						<button
							type="button"
							className="rounded-full p-2 text-on-surface-variant hover:bg-surface-variant"
							onClick={() => setDrawerOpen(false)}
							aria-label="Close menu"
						>
							<span className="material-symbols-outlined">close</span>
						</button>
					</div>
					<nav className="flex flex-col gap-sm">
						<Link
							to="/launch"
							className="flex items-center gap-md rounded-md p-3 text-label-caps text-on-surface-variant transition-transform hover:bg-surface-variant"
						>
							<span className="material-symbols-outlined">play_circle</span>
							Play Now
						</Link>
						<button
							type="button"
							className="flex items-center gap-md rounded-md p-3 text-label-caps text-on-surface-variant transition-transform hover:bg-surface-variant"
						>
							<span className="material-symbols-outlined">leaderboard</span>
							Leaderboard
						</button>
						<button
							type="button"
							className="flex items-center gap-md rounded-md p-3 text-label-caps text-on-surface-variant transition-transform hover:bg-surface-variant"
						>
							<span className="material-symbols-outlined">settings</span>
							Settings
						</button>
						<Link
							to="/about"
							className="flex items-center gap-md rounded-md p-3 text-label-caps text-on-surface-variant transition-transform hover:bg-surface-variant"
						>
							<span className="material-symbols-outlined">info</span>
							About
						</Link>
					</nav>
				</div>
			</div>

			{/* Main Content */}
			<main className="mx-auto w-full max-w-[1200px] flex-grow px-md pt-24 md:px-lg">
				{/* Hero Section */}
				<section className="flex flex-col items-center gap-4 border-b border-surface-variant py-10 text-center">
					<img
						alt="Blantyre Pinball Logo"
						className="h-24 w-24 object-contain"
						src="/logo.png"
					/>
					<h1 className="text-display-lg text-primary">Blantyre Pinball</h1>
					<p className="text-body-lg text-on-surface-variant">
						Experience Blantyre like never before in this vibrant, high-stakes
						digital arcade experience.
					</p>
					<div className="mt-2 flex gap-md">
						<Link
							to="/launch"
							className="rounded-full bg-secondary px-xl py-sm text-label-caps text-on-secondary shadow-md transition-all hover:shadow-lg"
						>
							Play Now
						</Link>
						<Link
							to="/about"
							className="rounded-full bg-primary px-xl py-sm text-label-caps text-on-primary shadow-md transition-all hover:shadow-lg"
						>
							Learn More
						</Link>
					</div>
				</section>

				{/* Features Bento Grid */}
				<section className="py-12">
					<h2 className="mb-xl text-headline-md text-primary">Game Features</h2>
					<div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
						{features.map((f) => (
							<article
								key={f.num}
								className="group flex flex-col overflow-hidden rounded-2xl bg-surface-container p-lg soft-shadow transition-transform hover:-translate-y-1"
							>
								<div className="flex items-start justify-between">
									<div
										className={`flex h-12 w-12 items-center justify-center rounded-xl ${f.chip}`}
									>
										<f.icon className="h-6 w-6" />
									</div>
									<span className="font-display text-sm font-semibold tracking-[0.2em] text-on-surface-variant">
										{f.num}
									</span>
								</div>
								<div className="mt-8">
									<p className="text-label-caps text-secondary">{f.kicker}</p>
									<h3 className="mt-1 text-headline-md text-primary">
										{f.title}
									</h3>
									<p className="mt-2 text-body-md text-on-surface-variant">
										{f.body}
									</p>
								</div>
								<div
									className={`mt-8 h-1 w-12 rounded-full ${f.bar} transition-all duration-300 group-hover:w-full`}
								/>
							</article>
						))}
					</div>
				</section>

				{/* Mini Leaderboard */}
				<section className="py-12">
					<div className="mb-lg flex items-center justify-between">
						<h2 className="text-headline-md text-primary">Top Scores</h2>
						<button
							type="button"
							className="text-label-caps text-secondary hover:underline"
						>
							View All
						</button>
					</div>
					<div className="flex flex-col overflow-hidden rounded-2xl bg-surface-container soft-shadow">
						{leaderboard.map((row) => (
							<article
								key={row.rank}
								className={`flex items-center justify-between gap-4 p-md ${
									row.rank !== leaderboard.length
										? "border-b border-surface-variant"
										: ""
								}`}
							>
								<div className="flex min-w-0 items-center gap-md">
									<span className="w-8 shrink-0 text-center text-headline-md text-secondary">
										{row.rank}
									</span>
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-tint text-label-caps text-on-primary">
										{row.initials}
									</div>
									<span className="truncate text-body-md font-semibold text-primary">
										{row.name}
									</span>
								</div>
								<span className="shrink-0 text-headline-md text-primary tracking-tight">
									{row.score}
								</span>
							</article>
						))}
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="mt-auto flex w-full flex-col items-center gap-md bg-primary-container px-lg py-2xl text-on-primary-container md:flex-row md:justify-between">
				<span className="text-label-caps text-secondary-fixed">
					BLANTYRE PINBALL
				</span>
				<span className="text-center text-body-md md:text-left">
					© 2024 Blantyre Pinball. Built for the energy of Malawi.
				</span>
				<nav className="flex gap-md">
					{["GitHub", "Credits", "Privacy", "Support"].map((label) => (
						<button
							key={label}
							type="button"
							className="text-body-md text-on-primary-container/80 opacity-80 transition-all hover:text-on-primary-container hover:underline hover:opacity-100"
						>
							{label}
						</button>
					))}
				</nav>
			</footer>
		</div>
	);
}
