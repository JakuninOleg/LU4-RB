"use client";

import { useEffect, useState } from "react";
import { BellIcon, BellOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = (await response.json()) as { error?: string };
    return data.error || `Ошибка ${response.status}`;
  }
  const text = await response.text();
  if (response.status === 401 || response.redirected || text.includes("Вход")) {
    return "Нужно войти в аккаунт заново";
  }
  return `Ошибка ${response.status}`;
}

export function PushSubscribeButton() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      window.isSecureContext &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    setSupported(ok);
    if (!ok) return;

    void (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        setSubscribed(Boolean(existing));
      } catch (err) {
        console.error("SW register failed", err);
      }
    })();
  }, []);

  async function subscribe() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      toast.error("VAPID public key не настроен на сервере");
      return;
    }

    if (!window.isSecureContext) {
      toast.error("Push работает только по HTTPS или localhost");
      return;
    }

    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Разрешите уведомления в настройках браузера");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Браузер не вернул ключи подписки");
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setSubscribed(true);
      toast.success("Push-уведомления включены");
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Ошибка подписки на push";
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  async function unsubscribe() {
    setPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Push-уведомления выключены");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка отписки");
    } finally {
      setPending(false);
    }
  }

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (subscribed) void unsubscribe();
        else void subscribe();
      }}
    >
      {subscribed ? <BellOffIcon data-icon="inline-start" /> : <BellIcon data-icon="inline-start" />}
      {subscribed ? "Push выкл" : "Push вкл"}
    </Button>
  );
}
