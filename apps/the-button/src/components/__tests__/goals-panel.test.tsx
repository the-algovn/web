import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { GoalsPanel } from "../goals-panel"
import type { QuestProgress } from "../../lib/api"

const quests: QuestProgress[] = [
  {
    id: "warmup",
    title: "Warm Up",
    description: "click 100 times today",
    kind: "daily",
    target: 100,
    progress: 40,
    done: false,
    reward: "+50 XP",
  },
  {
    id: "streak-keeper",
    title: "Streak Keeper",
    description: "show up 3 days running",
    kind: "daily",
    target: 3,
    progress: 3,
    done: true,
    reward: "+100 XP",
  },
  {
    id: "century",
    title: "Century Club",
    description: "click 1000 times this week",
    kind: "weekly",
    target: 1000,
    progress: 250,
    done: false,
    reward: "+500 XP",
  },
]

const streak = { current: 5, best: 12, lastDay: "2026-07-18" }

describe("GoalsPanel", () => {
  it("renders daily and weekly quest titles with progress and reward", () => {
    render(<GoalsPanel quests={quests} streak={streak} signedIn />)
    expect(screen.getByText("Warm Up")).toBeInTheDocument()
    expect(screen.getByText("Century Club")).toBeInTheDocument()
    expect(screen.getByText("40/100")).toBeInTheDocument()
    expect(screen.getByText("+500 XP")).toBeInTheDocument()
  })

  it("shows a done quest's completed state", () => {
    render(<GoalsPanel quests={quests} streak={streak} signedIn />)
    expect(screen.getByText("Streak Keeper")).toBeInTheDocument()
    expect(screen.getByText("✓ complete")).toBeInTheDocument()
    // the not-yet-done quests still read as in progress
    expect(screen.getAllByText("in progress")).toHaveLength(2)
  })

  it("renders the current and best streak counts", () => {
    render(<GoalsPanel quests={quests} streak={streak} signedIn />)
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("best 12d")).toBeInTheDocument()
  })

  it("shows a quiet loading line when signed in with no quests yet", () => {
    render(<GoalsPanel quests={[]} streak={{ current: 0, best: 0, lastDay: "" }} signedIn />)
    expect(screen.getByText(/loading your goals/i)).toBeInTheDocument()
    expect(screen.queryByText("Warm Up")).not.toBeInTheDocument()
  })

  it("shows a sign-in prompt instead of a perpetual loading line when signed out", () => {
    render(<GoalsPanel quests={[]} streak={{ current: 0, best: 0, lastDay: "" }} signedIn={false} />)
    expect(screen.getByText(/sign in to track your goals/i)).toBeInTheDocument()
    expect(screen.queryByText(/loading your goals/i)).not.toBeInTheDocument()
  })
})
