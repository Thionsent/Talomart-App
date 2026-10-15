export function parseAdminPage(raw: string) {
  const parsed = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : 1;
}

export function clampAdminPage(requested: number, total: number, pageSize: number) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(Math.max(requested, 1), lastPage);
}
