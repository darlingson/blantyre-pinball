import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-6xl font-black">Blantyre Pinball</h1>

      <p className="mt-6 max-w-2xl text-lg">
        A modern pinball game inspired by the streets, landmarks and culture of
        Blantyre, Malawi.
      </p>

      <div className="mt-10 flex gap-4">
        <Link
          to="/launch"
          className="rounded bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Play
        </Link>

        <Link
          to="/about"
          className="rounded border px-6 py-3 font-semibold hover:bg-gray-100"
        >
          About
        </Link>
      </div>
    </main>
  )
}