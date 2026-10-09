import { animate, createScope } from "animejs";
import { useEffect, useRef } from "react";

/** Closed flight loop: plunge the lane, tour the bumpers, meet a flipper. */
const BALL_X = [
	340, 340, 250, 150, 245, 190, 130, 200, 205, 230, 290, 340, 340,
];
const BALL_Y = [500, 140, 75, 180, 205, 268, 345, 452, 455, 320, 200, 140, 500];

const FINAL_SCORE = 148200;

function HeroPinball() {
	const root = useRef<HTMLDivElement | null>(null);
	const scoreRef = useRef<HTMLSpanElement | null>(null);
	const scope = useRef<{ revert: () => void } | null>(null);

	useEffect(() => {
		if (!root.current) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			if (scoreRef.current) {
				scoreRef.current.textContent = FINAL_SCORE.toLocaleString();
			}
			return;
		}

		scope.current = createScope({ root }).add(() => {
			// Ball flight loop around the table
			animate(".hero-ball", {
				x: BALL_X,
				y: BALL_Y,
				duration: 8000,
				ease: "inOutSine",
				loop: true,
			});

			// Bumpers pop as the ball tours past
			animate(".hero-bump", {
				scale: [
					{ to: 1.28, duration: 160 },
					{ to: 1, duration: 420 },
				],
				delay: 1400,
				loop: true,
				loopDelay: 2400,
				ease: "outQuad",
			});

			// Chichiri loop glow breathes
			animate(".hero-loop", {
				opacity: [
					{ to: 0.35, duration: 900 },
					{ to: 1, duration: 900 },
				],
				loop: true,
				alternate: true,
				ease: "inOutSine",
			});

			// Flippers idle
			animate(".hero-flip", {
				y: [
					{ to: -5, duration: 500 },
					{ to: 0, duration: 500 },
				],
				loop: true,
				alternate: true,
				ease: "inOutSine",
			});

			// Score counts up once on load
			const counter = { value: 0 };
			animate(counter, {
				value: FINAL_SCORE,
				duration: 2600,
				ease: "outExpo",
				onUpdate: () => {
					if (scoreRef.current) {
						scoreRef.current.textContent = Math.round(
							counter.value,
						).toLocaleString();
					}
				},
			});
		});

		return () => {
			scope.current?.revert();
			scope.current = null;
		};
	}, []);

	return (
		<div ref={root}>
			<div className="flex items-center justify-between px-1 pb-3">
				<span className="text-label-caps text-on-surface-variant">Score</span>
				<span
					ref={scoreRef}
					className="font-display text-headline-md tabular-nums text-secondary"
				>
					0
				</span>
			</div>
			<svg
				viewBox="0 0 400 560"
				role="img"
				aria-label="Line drawing of the Blantyre Pinball table with a flying ball"
				className="h-auto w-full"
			>
				{/* Cabinet outline with arched top */}
				<path
					d="M40 520 L40 170 Q40 70 200 48 Q360 70 360 170 L360 520"
					fill="none"
					stroke="#00263f"
					strokeWidth="7"
					strokeLinecap="round"
				/>
				{/* Bottom guides with a drain gap */}
				<path
					d="M40 520 L150 470"
					fill="none"
					stroke="#00263f"
					strokeWidth="7"
					strokeLinecap="round"
				/>
				<path
					d="M360 520 L250 470"
					fill="none"
					stroke="#00263f"
					strokeWidth="7"
					strokeLinecap="round"
				/>
				{/* Shooter lane divider */}
				<path
					d="M322 210 L322 520"
					fill="none"
					stroke="#00263f"
					strokeWidth="5"
					strokeLinecap="round"
				/>
				{/* Hill bumpers */}
				<circle
					className="hero-bump"
					cx="150"
					cy="180"
					r="26"
					fill="#ffffff"
					stroke="#00263f"
					strokeWidth="6"
					style={{ transformBox: "fill-box", transformOrigin: "center" }}
				/>
				<circle
					className="hero-bump"
					cx="245"
					cy="205"
					r="26"
					fill="#ffffff"
					stroke="#00263f"
					strokeWidth="6"
					style={{ transformBox: "fill-box", transformOrigin: "center" }}
				/>
				<circle
					className="hero-bump"
					cx="190"
					cy="268"
					r="22"
					fill="#ffffff"
					stroke="#00263f"
					strokeWidth="6"
					style={{ transformBox: "fill-box", transformOrigin: "center" }}
				/>
				{/* Chichiri loop */}
				<circle
					className="hero-loop"
					cx="305"
					cy="120"
					r="16"
					fill="none"
					stroke="#004323"
					strokeWidth="6"
				/>
				{/* Chileka drop targets */}
				<rect x="58" y="300" width="12" height="32" rx="6" fill="#00263f" />
				<rect x="58" y="340" width="12" height="32" rx="6" fill="#00263f" />
				<rect x="58" y="380" width="12" height="32" rx="6" fill="#00263f" />
				{/* Rollover lane dots */}
				<circle cx="130" cy="110" r="5" fill="#00263f" />
				<circle cx="165" cy="102" r="5" fill="#00263f" />
				<circle cx="200" cy="102" r="5" fill="#00263f" />
				<circle cx="235" cy="110" r="5" fill="#00263f" />
				{/* Flippers */}
				<path
					className="hero-flip"
					d="M128 462 L182 484"
					fill="none"
					stroke="#00263f"
					strokeWidth="12"
					strokeLinecap="round"
				/>
				<path
					className="hero-flip"
					d="M272 462 L218 484"
					fill="none"
					stroke="#00263f"
					strokeWidth="12"
					strokeLinecap="round"
				/>
				{/* The ball */}
				<circle
					className="hero-ball"
					cx="0"
					cy="0"
					r="11"
					fill="#fdbc13"
					stroke="#7a5900"
					strokeWidth="2"
				/>
			</svg>
		</div>
	);
}

export { HeroPinball };
