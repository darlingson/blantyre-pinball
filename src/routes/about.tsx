import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-black">
        About Blantyre Pinball
      </h1>

      <p className="mt-6">
        Blantyre Pinball is a modern pinball game inspired by the landmarks,
        streets and culture of Blantyre, Malawi.
      </p>

      <p className="mt-4">
        Built using React, Vite, React Three Fiber and Rapier Physics.
      </p>

      <div className="mt-10">
        <Link
          to="/"
          className="rounded border px-5 py-3"
        >
          Back Home
        </Link>
      </div>
    </main>
  )
}