import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/game')({
  component: GamePage,
})

function GamePage() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black text-white">
      <div className="flex h-full items-center justify-center">
        <h1 className="text-3xl font-bold">
          Game Canvas Coming Soon
        </h1>
      </div>
    </main>
  )
}