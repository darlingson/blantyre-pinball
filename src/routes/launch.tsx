import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/launch')({
  component: LaunchPage,
})

function LaunchPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-5xl font-black">Blantyre Pinball</h1>

      <p className="mt-4 text-gray-500">
        Ready to begin?
      </p>

      <div className="mt-10 flex gap-4">
        <Link
          to="/game"
          className="rounded bg-green-600 px-8 py-3 font-semibold text-white hover:bg-green-700"
        >
          Start Game
        </Link>

        <Link
          to="/"
          className="rounded border px-6 py-3"
        >
          Back
        </Link>
      </div>
    </main>
  )
}