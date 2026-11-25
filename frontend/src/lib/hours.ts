/** "2026-12-02" -> "Wed 2 Dec 2026" */
export const dayName = (day: string) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));

/** "14:30" -> "2:30 pm" */
export const clock = (time: string) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(`2000-01-01T${time}:00Z`));
