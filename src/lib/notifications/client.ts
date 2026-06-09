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
  await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  // register() resolve assim que o SW é descoberto, ainda em "installing". Mas
  // pushManager.subscribe exige um worker já em "active" — senão estoura
  // AbortError: "no active Service Worker". serviceWorker.ready só resolve
  // quando há um registration com worker ativo controlando o escopo.
  return navigator.serviceWorker.ready;
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
  | {
      ok: false;
      reason:
        | "permission-denied"
        | "permission-dismissed"
        | "unsupported"
        | "no-device-id"
        | "network";
    };

export async function subscribeToPush(input: SubscribeInput): Promise<SubscribeResult> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  if (!input.deviceId && !input.authToken) {
    // Sem identidade não dá pra remover depois (AC-07 / cleanup 410).
    return { ok: false, reason: "no-device-id" };
  }

  // O browser devolve três estados — `granted`, `denied`, `default`. Tratar
  // `default` (usuário fechou o prompt sem decidir) como denied esconde o
  // botão pelo resto da sessão. Distinguimos pra que o card volte a oferecer
  // a opção de tentar de novo.
  const permission = await Notification.requestPermission();
  if (permission === "denied") return { ok: false, reason: "permission-denied" };
  if (permission !== "granted") return { ok: false, reason: "permission-dismissed" };

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

export type UnsubscribeInput = {
  deviceId: string | null;
  authToken?: string | null;
};

/**
 * Cancela a inscrição no backend e no browser. Retorna `false` quando o
 * backend rejeita ou cai (rede/4xx/5xx) — nesse caso preservamos a sub local
 * pra que o card mantenha "ativado" e o usuário possa tentar de novo, em vez
 * de ficar dessincronizado (sem sub local + linha viva no banco recebendo
 * pushes que nunca chegam).
 */
export async function unsubscribeFromPush(input: UnsubscribeInput): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return true;

  // Remoção em duas etapas: backend primeiro (para que um disparo concorrente
  // não tente entregar para um endpoint já cancelado), browser depois.
  // Mandamos a identidade: o servidor escopa o WHERE por dono (deviceId/
  // userId) e devolve 401 sem ela. fetch() não joga em 4xx, então checamos
  // res.ok explicitamente — antes, opt-out anônimo virava 401 silencioso e
  // a linha ficava órfã até a auto-cura por 410.
  const res = await fetch(SUBSCRIBE_ENDPOINT, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(input.authToken ? { Authorization: `Bearer ${input.authToken}` } : {}),
    },
    body: JSON.stringify({ endpoint: sub.endpoint, deviceId: input.deviceId }),
  }).catch(() => null);

  if (!res || !res.ok) return false;

  await sub.unsubscribe().catch(() => undefined);
  return true;
}

/**
 * Checa se há subscription ativa no PushManager. Necessário para decidir o
 * estado do card de permissão — confiar só em `Notification.permission` é
 * insuficiente: permissão concedida + sub purgada (410) ou sub apagada via
 * "clear site data" mostraria "Alertas ativados" sem entrega real.
 */
export async function hasActiveSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return sub !== null;
}
