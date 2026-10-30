const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Shows a YYYY-MM-DD calendar day the Turkish way (30.10.2026); other text passes through. */
export const formatDayTr = (value: string): string => {
  const match = DAY_RE.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
};
