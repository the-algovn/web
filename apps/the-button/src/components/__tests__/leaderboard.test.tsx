import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Leaderboard } from "../leaderboard"

const allTime = [
  { rank: 1, name: "Minh", clicks: 1000 },
  { rank: 2, name: "Ann", clicks: 500 },
]
const thisWeek = [{ rank: 1, name: "Ann", clicks: 90 }]

describe("Leaderboard", () => {
  it("shows the all-time board by default and switches to weekly", () => {
    render(<Leaderboard allTime={allTime} thisWeek={thisWeek} myRank={{}} myName={null} />)
    expect(screen.getByText("Minh")).toBeInTheDocument()
    expect(screen.getByText("1,000")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /this week/i }))
    expect(screen.getByText("90")).toBeInTheDocument()
    expect(screen.queryByText("1,000")).not.toBeInTheDocument()
  })

  it("pins your row when you are outside the visible board", () => {
    render(
      <Leaderboard allTime={allTime} thisWeek={thisWeek} myRank={{ allTime: 42 }} myName="You" />,
    )
    // rank 42 is not in the 2-row board, so a pinned "you" row shows the rank
    expect(screen.getByText(/#42/)).toBeInTheDocument()
    expect(screen.getByText("You")).toBeInTheDocument()
  })

  it("does not pin a duplicate you-row when you are already in the visible board", () => {
    render(
      <Leaderboard allTime={allTime} thisWeek={thisWeek} myRank={{ allTime: 1 }} myName="Minh" />,
    )
    // "Minh" is already row 1; a wrongly-pinned row would make it appear twice.
    expect(screen.getAllByText("Minh")).toHaveLength(1)
  })
})
