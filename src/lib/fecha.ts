const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha YYYY-MM-DD en America/Santiago (para fechas de negocio; no usar toISOString). */
export const fechaChile = (d: Date | string = new Date()) => fmt.format(new Date(d));
