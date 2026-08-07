import type { SVGProps } from "react";

function RoundaboutIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			{...props}
		>
			<circle cx="12" cy="12" r="8.4" />
			<circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
			<path d="M12 3.6v2.2" />
			<path d="M20.4 12h-2.2" />
			<path d="M12 20.4v-2.2" />
			<path d="M3.6 12h2.2" />
		</svg>
	);
}

function LandmarkIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			{...props}
		>
			<path d="M12 2.2 4.8 8h14.4L12 2.2Z" />
			<path d="M4.4 8.2h15.2" />
			<path d="M7 8.2v6.4" />
			<path d="M12 8.2v6.4" />
			<path d="M17 8.2v6.4" />
			<path d="M4 14.6h16" />
			<path d="M5.4 14.6v2.2" />
			<path d="M18.6 14.6v2.2" />
			<path d="M5.4 16.8h13.2" />
		</svg>
	);
}

function BoltIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
			<path d="M13 2 4.6 12.8h4.9L8.6 22l9.9-10.6h-4.7L13 2Z" />
		</svg>
	);
}

export { RoundaboutIcon, LandmarkIcon, BoltIcon };
