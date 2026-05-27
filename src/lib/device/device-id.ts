const DEVICE_ID_KEY = "rs:deviceId";

/**
 * UUID persistente por dispositivo (localStorage), usado para idempotência do
 * clustering de relatos no POST /api/reports (US06). Relatos sem deviceId são
 * aceitos, mas não contam para o threshold de confirmação. Retorna null durante
 * SSR, quando localStorage não existe.
 *
 * @example body: JSON.stringify({ ...payload, deviceId: getDeviceId() })
 */
export function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;

  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
