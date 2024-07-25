import { useWebSocket } from "@vueuse/core";

let webSocket: WebSocket | null = null;

export default async function() {
    const data = ref<string | null>(null);
    if (!webSocket || webSocket == null) {
        const user = (await useAuth()).user;
        webSocket = new WebSocket("ws://127.0.0.1:9389/ws?userId=" + user?.id);

        webSocket.onopen = () => {
            console.log("WebSocket connection established");
        }

        webSocket.onmessage = (event) => {
            data.value = event.data;
        }

        webSocket.onclose = () => {
            console.log("WebSocket connection closed");
            webSocket = null;
        }
    }

    const send = (message: string) => {
        webSocket?.send(message);
    }

    return {
        data,
        send
    }
    
}