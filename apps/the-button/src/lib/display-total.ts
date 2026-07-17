// The displayed global count must never decrease.
//
// `pending` and `serverTotal` are not synchronized: `pending` drops to zero the
// instant a submit succeeds, but `serverTotal` only reflects those clicks after
// the publisher's next 1s tick plus outbox lag. In that window
// `serverTotal + pending` is *lower* than what is already on screen, so a naive
// sum would count backward after every landed batch.
//
// The floor is not a patch over that race — it is semantically true. The global
// counter is a cumulative total of clicks ever made; it only rises. A display
// that refuses to go backward renders that quantity faithfully.
//
// Consequence, on a quiet page: after a batch lands the display holds still for
// up to ~1s rather than dipping. While the user is actively clicking this never
// surfaces, because new clicks keep pushing the value up.
//
// `floor` is the previously displayed value. A null `serverTotal` means nothing
// has arrived yet and passes through as null (the "—" state).
export function mergeDisplayTotal(
  serverTotal: number | null,
  pending: number,
  floor: number,
): number | null {
  if (serverTotal === null) return null
  return Math.max(floor, serverTotal + pending)
}
