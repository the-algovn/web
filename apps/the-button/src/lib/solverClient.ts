// The Web Worker behind a promise interface. The batcher depends only on
// `Solver`, so tests inject a fake and never touch a real worker.
import type {
  BenchResult,
  SolverRequest,
  SolverResponse,
  SolverResult,
} from "../worker/solver"

export interface SolveInput {
  challenge: string
  clickCount: number
  workFactor: string
}

export interface Solver {
  solve(input: SolveInput): Promise<SolverResult>
}

export interface WorkerSolver extends Solver {
  bench(durationMs: number): Promise<number>
  terminate(): void
}

export function createWorkerSolver(): WorkerSolver {
  const worker = new Worker(new URL("../worker/solver.ts", import.meta.url), { type: "module" })
  let nextJobId = 1
  const pending = new Map<
    number,
    { resolve: (msg: SolverResponse) => void; reject: (err: Error) => void }
  >()

  worker.onmessage = (e: MessageEvent<SolverResponse>) => {
    const msg = e.data
    if (msg.type === "progress") return
    const job = pending.get(msg.jobId)
    if (!job) return
    pending.delete(msg.jobId)
    if (msg.type === "error") job.reject(new Error(msg.message))
    else job.resolve(msg)
  }

  const request = (req: SolverRequest): Promise<SolverResponse> =>
    new Promise((resolve, reject) => {
      pending.set(req.jobId, { resolve, reject })
      worker.postMessage(req)
    })

  return {
    async solve(input: SolveInput): Promise<SolverResult> {
      return (await request({ type: "solve", jobId: nextJobId++, ...input })) as SolverResult
    },
    async bench(durationMs: number): Promise<number> {
      const msg = (await request({ type: "bench", jobId: nextJobId++, durationMs })) as BenchResult
      return msg.hashesPerSecond
    },
    terminate(): void {
      worker.terminate()
    },
  }
}
