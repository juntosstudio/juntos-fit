export function getBrowserTimeZone() {
  try {
    return (
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone || 'UTC'
    )
  } catch {
    return 'UTC'
  }
}

// Returns YYYY-MM-DD for the requested IANA time zone.
export function getDateKeyForTimeZone(timeZone) {
  const formatter = new Intl.DateTimeFormat(
    'en-US',
    {
      timeZone: timeZone || getBrowserTimeZone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  )

  const parts = formatter.formatToParts(
    new Date(),
  )
  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ]),
  )

  return [
    values.year,
    values.month,
    values.day,
  ].join('-')
}
