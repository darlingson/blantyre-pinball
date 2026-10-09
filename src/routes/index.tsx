import { createFileRoute, Link } from "@tanstack/react-router";
import { animate, createScope, stagger } from "animejs";
import { useEffect, useRef } from "react";
import { HeroPinball } from "../components/HeroPinball";

export const Route = createFileRoute("/")({
	component: HomePage,
});

const steps = [
	{
		n: "1",
		title: "Launch",
		body: "Hold Space to charge the plunger, release to fire the ball up the lane and onto the table.",
	},
	{
		n: "2",
		title: "Work the table",
		body: "Hit hill bumpers, lock the Chichiri loop, drop the Chileka targets and light every letter of Blantyre.",
	},
	{
		n: "3",
		title: "Keep it alive",
		body: "Three balls a game, fifteen seconds of ball save on every launch, and a tilt sensor that warns before it bites.",
	},
];

function HomePage() {
	const root = useRef<HTMLDivElement | null>(null);
	const scope = useRef<{ revert: () => void } | null>(null);

	useEffect(() => {
		if (!root.current) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		scope.current = createScope({ root }).add(() => {
			animate(".home-enter", {
				opacity: [0, 1],
				y: [22, 0],
				duration: 700,
				ease: "outCubic",
				delay: stagger(90),
			});
		});

		return () => {
			scope.current?.revert();
			scope.current = null;
		};
	}, []);

	return (
		<div
			ref={root}
			className="flex min-h-screen flex-col bg-surface antialiased"
		>
			<header className="sticky top-0 z-50 border-b border-surface-variant/60 bg-surface/80 backdrop-blur-md">
				<div className="mx-auto flex w-full max-w-[1080px] items-center justify-between px-5 py-3">
					<Link
						to="/"
						className="font-display text-[15px] font-bold tracking-tight text-primary"
					>
						Blantyre Pinball
					</Link>
					<div className="flex items-center gap-6">
						<a
							href="#how"
							className="hidden text-[15px] text-on-surface-variant transition-colors hover:text-primary sm:block"
						>
							How it plays
						</a>
						<Link
							to="/about"
							className="hidden text-[15px] text-on-surface-variant transition-colors hover:text-primary sm:block"
						>
							About
						</Link>
						<Link
							to="/launch"
							className="squish-btn rounded-full bg-secondary px-5 py-2 text-label-caps text-on-secondary shadow-md transition-shadow hover:shadow-lg"
						>
							Play
						</Link>
					</div>
				</div>
			</header>

			<main className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col items-center px-5 pt-14 pb-12 text-center md:pt-20">
				<h1 className="home-enter max-w-[16ch] text-display-lg tracking-tight text-primary">
					Pinball, built from Blantyre.
				</h1>
				<p className="home-enter mt-4 max-w-[52ch] text-body-lg text-on-surface-variant">
					A free table set in the hills, markets and streets of Blantyre,
					Malawi. This is it running — every bumper, lane and target below is in
					the game.
				</p>
				<Link
					to="/launch"
					className="home-enter squish-btn mt-8 rounded-full bg-secondary px-10 py-4 text-label-caps text-on-secondary shadow-lg transition-shadow hover:shadow-xl"
				>
					Play now
				</Link>

				{/* The product, alive */}
				<div className="home-enter mt-12 w-full max-w-[560px] rounded-3xl border border-surface-variant/70 bg-surface-container-lowest p-5 soft-shadow md:p-7">
					<HeroPinball />
				</div>

				{/* How a round goes — a genuine sequence */}
				<section id="how" className="mt-20 w-full max-w-[880px] scroll-mt-24">
					<h2 className="text-headline-md text-primary">How a round goes</h2>
					<div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-surface-variant/70 bg-surface-variant/70 text-left md:grid-cols-3">
						{steps.map((s) => (
							<div key={s.n} className="bg-surface-container-lowest p-6">
								<p className="font-display text-2xl font-semibold text-secondary">
									{s.n}
								</p>
								<h3 className="mt-3 font-display text-lg font-semibold text-primary">
									{s.title}
								</h3>
								<p className="mt-2 text-body-md leading-relaxed text-on-surface-variant">
									{s.body}
								</p>
							</div>
						))}
					</div>

					<div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-body-md text-on-surface-variant">
						<span>
							<kbd className="rounded-sm border border-outline-variant bg-surface-container-lowest px-2 py-0.5 font-mono text-[13px] font-semibold text-primary">
								Z
							</kbd>{" "}
							flip
						</span>
						<span>
							<kbd className="rounded-sm border border-outline-variant bg-surface-container-lowest px-2 py-0.5 font-mono text-[13px] font-semibold text-primary">
								Space
							</kbd>{" "}
							launch
						</span>
						<span>
							<kbd className="rounded-sm border border-outline-variant bg-surface-container-lowest px-2 py-0.5 font-mono text-[13px] font-semibold text-primary">
								X
							</kbd>{" "}
							nudge
						</span>
					</div>
				</section>
			</main>

			<footer className="border-t border-surface-variant/60">
				<div className="mx-auto flex w-full max-w-[1080px] items-center justify-between px-5 py-6 text-body-md text-on-surface-variant">
					<span>Built in Blantyre, Malawi.</span>
					<Link to="/about" className="transition-colors hover:text-primary">
						About
					</Link>
				</div>
			</footer>
		</div>
	);
}
