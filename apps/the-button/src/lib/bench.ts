import { createWorkerSolver } from "./solverClient"

// Calibration hook: open /the-button/?bench and read the console. T20 runs
// this on real devices to pick POW_W0 — never tune assuming WebCrypto speeds.
export async function runBench(durationMs = 4_000): Promise<number> {
  console.log(`[bench] measuring worker SHA-256 throughput for ${durationMs}ms…`)
  const solver = createWorkerSolver()
  try {
    const hps = await solver.bench(durationMs)
    console.log(`[bench] ${hps.toLocaleString("en-US")} H/s — calibration input for POW_W0`)
    return hps
  } finally {
    solver.terminate()
  }
}
