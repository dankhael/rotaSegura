// RS-TK04 — helpers de cliente para Web Push.
// Toda interação com SW/PushManager passa por aqui para que o componente fique
// declarativo. Server-side seguro: cada função protege contra `window` ausente.

const SW_URL = "/sw.js";
const SUBSCRIBE_ENDPOINT = "/api/notifications/subscribe";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  return navigator.serviceWorker.register(SW_URL, { scope: "/" });
}

// VAPID public key precisa ser convertida de base64url → Uint8Array antes de
// passar para PushManager.subscribe. Esse é o ritual padrão; sem ele o browser
// rejeita com InvalidAccessError.
function urlBase64ToBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  // ArrayBuffer (não Uint8Array com buffer genérico) é o tipo aceito pelo
  // PushManager.subscribe — TS estreitou o BufferSource em lib.dom mais recentes.
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export type SubscribeInput = {
  vapidPublicKey: string;
  deviceId: string | null;
  latitude: number;
  longitude: number;
  authToken?: string | null;
};

export type SubscribeResult =
  | { ok: true; subscription: PushSubscription }
  | { ok: false; reason: "permission-denied" | "unsupported" | "no-device-id" | "network" };

export async function subscribeToPush(input: SubscribeInput): Promise<SubscribeResult> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  if (!input.deviceId && !input.authToken) {
    // Sem identidade não dá pra remover depois (AC-07 / cleanup 410).
    return { ok: false, reason: "no-device-id" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "permission-denied" };

  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, reason: "unsupported" };

  // Reutiliza subscription existente se já houver — evita criar duplicatas
  // quando o usuário recarrega a página. UPSERT no backend cobre o resto.
  const existing = await reg.pushManager.getSubscription();
  const subscription =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBuffer(input.vapidPublicKey),
    }));

  const res = await fetch(SUBSCRIBE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(input.authToken ? { Authorization: `Bearer ${input.authToken}` } : {}),
    },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      deviceId: input.deviceId,
      latitude: input.latitude,
      longitude: input.longitude,
    }),
  });

  if (!res.ok) return { ok: false, reason: "network" };
  return { ok: true, subscription };
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return true;

  // Remoção em duas etapas: backend primeiro (para que um disparo concorrente
  // não tente entregar para um endpoint já cancelado), browser depois.
  await fetch(SUBSCRIBE_ENDPOINT, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => undefined);

  await sub.unsubscribe().catch(() => undefined);
  return true;
}
