export function EnvBadge() {
  // eslint-disable-next-line turbo/no-undeclared-env-vars -- DEV is Vite's own built-in mode flag, not a turbo.json build input
  const label = import.meta.env.DEV ? "LOCAL" : "PROD"
  return (
    <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded px-2 py-0.5 font-mono text-xs font-bold">
      {label}
    </span>
  )
}
