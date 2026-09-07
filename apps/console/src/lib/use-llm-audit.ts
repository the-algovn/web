import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { labCall } from "./api"
import { type LLMCall, type LLMStat, type ListResp, PAGE_SIZE, type StatsResp } from "./llm-audit"

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function useLLMAudit(token: string | null, correlationId = "") {
  const [calls, setCalls] = useState<LLMCall[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [label, setLabelState] = useState("")
  const [errorsOnly, setErrorsOnlyState] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<LLMStat[]>([])
  const [totalUsd, setTotalUsd] = useState(0)
  const [windowDays, setWindowDaysState] = useState(30)
  const reqId = useRef(0)

  const fetchPage = useCallback(
    async (p: number, lbl: string, errs: boolean) => {
      if (!token) return
      const id = ++reqId.current
      setLoading(true)
      try {
        const r = await labCall<ListResp>(token, "/llm-calls/list", {
          label: lbl,
          errorsOnly: errs,
          correlationId,
          limit: PAGE_SIZE,
          offset: p * PAGE_SIZE,
        })
        if (id !== reqId.current) return
        setCalls(r.calls ?? [])
        setTotal(Number(r.total ?? 0))
      } catch (e) {
        if (id !== reqId.current) return
        toast.error(msg(e))
      } finally {
        if (id === reqId.current) setLoading(false)
      }
    },
    [token, correlationId],
  )

  const fetchStats = useCallback(
    async (days: number) => {
      if (!token) return
      try {
        const r = await labCall<StatsResp>(token, "/llm-calls/stats", { windowDays: days })
        setStats(r.stats ?? [])
        setTotalUsd(r.totalUsd ?? 0)
      } catch (e) {
        toast.error(msg(e))
      }
    },
    [token],
  )

  useEffect(() => {
    void fetchPage(page, label, errorsOnly)
  }, [fetchPage, page, label, errorsOnly])

  useEffect(() => {
    void fetchStats(windowDays)
  }, [fetchStats, windowDays])

  // Filter changes reset to page 0.
  const setLabel = useCallback((l: string) => {
    setLabelState(l)
    setPage(0)
  }, [])
  const setErrorsOnly = useCallback((v: boolean) => {
    setErrorsOnlyState(v)
    setPage(0)
  }, [])
  const setWindowDays = useCallback((d: number) => setWindowDaysState(d), [])
  const refresh = useCallback(() => {
    void fetchPage(page, label, errorsOnly)
    void fetchStats(windowDays)
  }, [fetchPage, fetchStats, page, label, errorsOnly, windowDays])

  return {
    calls, total, page, setPage,
    label, setLabel, errorsOnly, setErrorsOnly,
    loading, refresh,
    stats, totalUsd, windowDays, setWindowDays,
  }
}
