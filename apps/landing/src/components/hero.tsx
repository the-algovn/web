"use client"

import { useEffect } from "react"
import { profile } from "@/config/profile"
import { MatrixRain } from "./terminal/matrix"
import { useTerminal } from "./terminal/use-terminal"

let consoleHinted = false

export function Hero() {
  const term = useTerminal()

  useEffect(() => {
    if (consoleHinted) return
    consoleHinted = true
    console.log(
      "%c▄▀█ █░░ █▀▀ █▀█ █░█ █▄░█\n█▀█ █▄▄ █▄█ █▄█ ▀▄▀ █░▀█\n\n> the cursor is not decoration. type.",
      "color:#00ff88;font-family:monospace",
    )
  }, [])

  return (
    <section className="border-b pb-10">
      <p className="text-sm text-muted-foreground">~ $ whoami</p>
      <h1 className="mt-4 text-[clamp(2.5rem,10vw,4rem)] leading-none font-bold tracking-tight">
        {profile.name}
        <span
          aria-hidden
          onClick={term.focusCursor}
          className={`ml-2 inline-block text-primary ${
            term.active ? "" : "[animation:blink_1s_step-end_infinite]"
          }`}
        >
          ▊
        </span>
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">{profile.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{profile.bio}</p>

      {term.active && (
        <>
          <div role="log" aria-live="polite" className="mt-6 text-sm">
            {term.lines.map((line, i) =>
              line.kind === "input" ? (
                <p key={i} className="mt-2 whitespace-pre-wrap">
                  <span className="text-muted-foreground">~ $ </span>
                  {line.text}
                </p>
              ) : (
                <p key={i} className="whitespace-pre-wrap text-muted-foreground">
                  {line.text}
                </p>
              ),
            )}
          </div>
          {!term.busy && (
            <p className="mt-2 whitespace-pre-wrap text-sm" onClick={term.focusCursor}>
              <span className="text-muted-foreground">~ $ </span>
              {term.buffer}
              <span
                aria-hidden
                className="inline-block text-primary [animation:blink_1s_step-end_infinite]"
              >
                ▊
              </span>
            </p>
          )}
        </>
      )}

      <input
        {...term.hiddenInputProps}
        aria-label="terminal input"
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="sr-only"
      />

      {term.matrixOn && <MatrixRain onDismiss={term.stopMatrix} />}
    </section>
  )
}
