import type { MessageItem } from "./messages";

/**
 * Real-time события чата, приходящие по WebSocket с бэкенда. Сокет — только для
 * доставки: отправка/правка/удаление по-прежнему идут обычным HTTP, сюда прилетает
 * серверное эхо. peer — username собеседника (диалог, к которому относится
 * событие) с точки зрения ТЕКУЩЕГО пользователя.
 */
export type MessageEvent =
    | { type: "message.new"; peer: string | null; message: MessageItem }
    | { type: "message.edit"; peer: string | null; message: MessageItem }
    | { type: "message.delete"; peer: string | null; id: string }
    | { type: "message.read"; peer: string | null };

type Listener = (event: MessageEvent) => void;

/** Абсолютный ws(s)-URL канала из baseURL API (dev — same-origin, прод — VITE_API_URL). */
function socketUrl(): string {
    const base = import.meta.env.VITE_API_URL ?? "/api.v1";
    // Относительный base (dev через Vite-прокси) → тот же origin.
    const httpUrl = base.startsWith("http")
        ? base
        : `${window.location.origin}${base}`;
    const wsUrl = httpUrl.replace(/^http/, "ws");
    return `${wsUrl.replace(/\/$/, "")}/messages/ws`;
}

/**
 * Одно WebSocket-соединение на приложение с авто-reconnect. Страница чата и
 * бейдж непрочитанного подписываются на один сокет — так канал открыт, только
 * пока есть слушатели. Соединение поднимается лениво при первой подписке и
 * закрывается, когда слушателей не осталось.
 */
class MessagesSocket {
    private ws: WebSocket | null = null;
    private listeners = new Set<Listener>();
    private reconnectAttempts = 0;
    private reconnectTimer: number | null = null;
    private manualClose = false;

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        this.ensureOpen();
        return () => {
            this.listeners.delete(listener);
            if (this.listeners.size === 0) this.close();
        };
    }

    private ensureOpen() {
        if (
            this.ws &&
            (this.ws.readyState === WebSocket.OPEN ||
                this.ws.readyState === WebSocket.CONNECTING)
        ) {
            return;
        }
        this.manualClose = false;
        try {
            this.ws = new WebSocket(socketUrl());
        } catch {
            this.scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
        };
        this.ws.onmessage = (e) => {
            let event: MessageEvent | null = null;
            try {
                event = JSON.parse(e.data) as MessageEvent;
            } catch {
                return;
            }
            // Копия набора: слушатель может отписаться в обработчике.
            for (const l of [...this.listeners]) {
                try {
                    l(event);
                } catch {
                    /* один падёж слушателя не должен рушить остальных */
                }
            }
        };
        this.ws.onclose = () => {
            this.ws = null;
            if (!this.manualClose && this.listeners.size > 0) {
                this.scheduleReconnect();
            }
        };
        this.ws.onerror = () => {
            // onclose последует сам и запустит reconnect.
            this.ws?.close();
        };
    }

    private scheduleReconnect() {
        if (this.reconnectTimer !== null) return;
        // Экспоненциальный backoff с потолком 15с и небольшим джиттером.
        const base = Math.min(1000 * 2 ** this.reconnectAttempts, 15_000);
        const delay = base + Math.random() * 500;
        this.reconnectAttempts += 1;
        this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            if (this.listeners.size > 0) this.ensureOpen();
        }, delay);
    }

    private close() {
        this.manualClose = true;
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.ws?.close();
        this.ws = null;
        this.reconnectAttempts = 0;
    }
}

export const messagesSocket = new MessagesSocket();
