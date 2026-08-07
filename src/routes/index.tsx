import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

function LandingPage() {
	const [drawerOpen, setDrawerOpen] = useState(false);

	return (
		<div className="flex min-h-screen flex-col antialiased">
			{/* TopAppBar */}
			<header className="fixed top-0 z-50 mx-auto flex w-full max-w-[1200px] items-center justify-between bg-surface/80 px-lg py-sm shadow-sm backdrop-blur-md">
				<Link to="/" className="flex items-center gap-sm text-primary">
					<span
						className="material-symbols-outlined"
						style={{ fontVariationSettings: "'FILL' 1" }}
					>
						sports_esports
					</span>
					<span className="text-display-lg-mobile tracking-tighter">
						BLANTYRE PINBALL
					</span>
				</Link>

				{/* Hamburger Menu for Mobile */}
				<button
					type="button"
					className="p-2 text-primary md:hidden"
					onClick={() => setDrawerOpen(true)}
					aria-label="Open menu"
				>
					<span className="material-symbols-outlined">menu</span>
				</button>

				{/* Desktop Nav (Hidden on Mobile) */}
				<nav className="hidden gap-lg md:flex">
					<Link
						className="rounded-full px-4 py-2 text-label-caps text-on-surface-variant transition-colors hover:bg-surface-variant/50 hover:text-primary"
						to="/launch"
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
						className="rounded-full px-4 py-2 text-label-caps text-on-surface-variant transition-colors hover:bg-surface-variant/50 hover:text-primary"
						to="/about"
					>
						About
					</Link>
				</nav>
			</header>

			{/* Navigation Drawer (Mobile Sidebar) */}
			<div
				className={`fixed inset-y-0 left-0 z-50 w-64 rounded-r-lg bg-surface shadow-xl transition-transform duration-300 md:hidden ${
					drawerOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="flex h-full flex-col bg-surface-container-low p-lg">
					<div className="mb-xl flex items-center justify-between">
						<span className="text-display-lg-mobile text-primary">MENU</span>
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
							className="flex items-center gap-md rounded-md p-3 text-label-caps text-on-surface-variant transition-transform hover:bg-surface-variant active:scale-98"
							to="/launch"
						>
							<span className="material-symbols-outlined">play_circle</span>
							Play Now
						</Link>
						<button
							type="button"
							className="flex items-center gap-md rounded-md p-3 text-label-caps text-on-surface-variant transition-transform hover:bg-surface-variant active:scale-98"
						>
							<span className="material-symbols-outlined">leaderboard</span>
							Leaderboard
						</button>
						<button
							type="button"
							className="flex items-center gap-md rounded-md p-3 text-label-caps text-on-surface-variant transition-transform hover:bg-surface-variant active:scale-98"
						>
							<span className="material-symbols-outlined">settings</span>
							Settings
						</button>
						<Link
							className="flex items-center gap-md rounded-md p-3 text-label-caps text-on-surface-variant transition-transform hover:bg-surface-variant active:scale-98"
							to="/about"
						>
							<span className="material-symbols-outlined">info</span>
							About
						</Link>
					</nav>
				</div>
			</div>

			{/* Main Content */}
			<main className="mx-auto mt-lg w-full max-w-[1200px] flex-grow px-md pt-3xl md:px-lg">
				{/* Hero Section */}
				<section className="flex flex-col items-center gap-lg py-2xl text-center">
					<img
						alt="Blantyre Pinball Logo"
						className="mb-sm h-48 w-48 object-contain drop-shadow-lg"
						src="/logo.png"
					/>
					<h1 className="text-display-lg text-primary">Blantyre Pinball</h1>
					<p className="max-w-2xl text-body-lg text-on-surface-variant">
						Experience Blantyre like never before in this vibrant, high-stakes
						digital arcade experience.
					</p>
					<div className="mt-md flex flex-col gap-md sm:flex-row">
						<Link
							to="/launch"
							className="rounded-full bg-secondary px-xl py-sm text-label-caps text-on-secondary shadow-md transition-all hover:shadow-lg active:scale-95"
						>
							Play Now
						</Link>
						<Link
							to="/about"
							className="rounded-full bg-primary px-xl py-sm text-label-caps text-on-primary shadow-md transition-all hover:shadow-lg active:scale-95"
						>
							Learn More
						</Link>
					</div>
				</section>

				{/* Features Bento Grid */}
				<section className="py-2xl">
					<h2 className="mb-xl text-center text-headline-md text-primary">
						Game Features
					</h2>
					<div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
						<div className="rounded-2xl bg-surface-container p-lg soft-shadow transition-transform hover:-translate-y-1">
							<div className="mb-md flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
								<span className="material-symbols-outlined">
									roundabout_right
								</span>
							</div>
							<h3 className="mb-sm text-headline-md text-primary">
								Traffic Circles
							</h3>
							<p className="text-body-md text-on-surface-variant">
								Navigate the chaotic beauty of Blantyre's iconic roundabouts.
								Precision is key to rack up multipliers.
							</p>
						</div>
						<div className="rounded-2xl bg-surface-container p-lg soft-shadow transition-transform hover:-translate-y-1">
							<div className="mb-md flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary">
								<span className="material-symbols-outlined">landscape</span>
							</div>
							<h3 className="mb-sm text-headline-md text-primary">
								Iconic Landmarks
							</h3>
							<p className="text-body-md text-on-surface-variant">
								Hit targets styled after famous Malawian landmarks to unlock
								hidden modes and massive point bonuses.
							</p>
						</div>
						<div className="rounded-2xl bg-surface-container p-lg soft-shadow transition-transform hover:-translate-y-1">
							<div className="mb-md flex h-12 w-12 items-center justify-center rounded-full bg-primary-container/20 text-primary-container">
								<span className="material-symbols-outlined">bolt</span>
							</div>
							<h3 className="mb-sm text-headline-md text-primary">
								High Energy
							</h3>
							<p className="text-body-md text-on-surface-variant">
								Fast-paced, physics-driven gameplay that captures the vibrant
								daytime energy of the city.
							</p>
						</div>
					</div>
				</section>

				{/* Screenshot/Table Gallery */}
				<section className="py-2xl">
					<h2 className="mb-xl text-center text-headline-md text-primary">
						The Table
					</h2>
					<div className="overflow-hidden rounded-2xl bg-surface-container soft-shadow">
						<div className="flex items-center justify-between bg-surface p-lg">
							<div>
								<span className="text-label-caps uppercase tracking-widest text-secondary">
									Table 1
								</span>
								<h3 className="text-headline-md text-primary">
									The Blantyre Loop
								</h3>
							</div>
							<Link
								to="/launch"
								className="rounded-full p-2 text-primary transition-colors hover:bg-surface-variant"
							>
								<span className="material-symbols-outlined">arrow_forward</span>
							</Link>
						</div>
					</div>
				</section>

				{/* Mini Leaderboard */}
				<section className="mx-auto w-full max-w-2xl py-2xl">
					<div className="mb-md flex items-end justify-between px-xs">
						<h2 className="text-headline-md text-primary">Top Scores</h2>
						<button
							type="button"
							className="text-label-caps text-secondary hover:underline"
						>
							View All
						</button>
					</div>
					<div className="flex flex-col overflow-hidden rounded-2xl bg-surface-container soft-shadow">
						<div className="flex items-center justify-between border-b border-surface-variant bg-primary/5 p-md">
							<div className="flex items-center gap-md">
								<span className="w-8 text-center text-headline-md text-secondary">
									1
								</span>
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-tint text-label-caps text-on-primary">
									MJ
								</div>
								<span className="text-body-md text-primary font-semibold">
									MalawiJuice
								</span>
							</div>
							<span className="text-headline-md text-primary tracking-tight">
								14,502,900
							</span>
						</div>
						<div className="flex items-center justify-between border-b border-surface-variant p-md">
							<div className="flex items-center gap-md">
								<span className="w-8 text-center text-headline-md text-on-surface-variant">
									2
								</span>
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-label-caps text-on-secondary-container">
									KB
								</div>
								<span className="text-body-md text-on-surface">KondwaniB</span>
							</div>
							<span className="text-headline-md text-on-surface-variant tracking-tight">
								12,184,000
							</span>
						</div>
						<div className="flex items-center justify-between p-md">
							<div className="flex items-center gap-md">
								<span className="w-8 text-center text-headline-md text-on-surface-variant">
									3
								</span>
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-tertiary-container text-label-caps text-on-tertiary-container">
									ZT
								</div>
								<span className="text-body-md text-on-surface">ZikomoTech</span>
							</div>
							<span className="text-headline-md text-on-surface-variant tracking-tight">
								9,850,200
							</span>
						</div>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="mt-auto flex w-full flex-col items-center gap-md bg-primary-container px-lg py-2xl text-on-primary-container md:flex-row md:justify-between">
				<div className="text-label-caps text-secondary-fixed">
					BLANTYRE PINBALL
				</div>
				<div className="text-center text-body-md md:text-left">
					© 2024 Blantyre Pinball. Built for the energy of Malawi.
				</div>
				<nav className="flex gap-md">
					<button
						type="button"
						className="text-body-md text-on-primary-container/80 opacity-80 transition-all hover:text-on-primary-container hover:underline hover:opacity-100"
					>
						GitHub
					</button>
					<button
						type="button"
						className="text-body-md text-on-primary-container/80 opacity-80 transition-all hover:text-on-primary-container hover:underline hover:opacity-100"
					>
						Credits
					</button>
					<button
						type="button"
						className="text-body-md text-on-primary-container/80 opacity-80 transition-all hover:text-on-primary-container hover:underline hover:opacity-100"
					>
						Privacy
					</button>
					<button
						type="button"
						className="text-body-md text-on-primary-container/80 opacity-80 transition-all hover:text-on-primary-container hover:underline hover:opacity-100"
					>
						Support
					</button>
				</nav>
			</footer>
		</div>
	);
}
