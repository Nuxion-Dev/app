let webSocket: WebSocket | null = null;
const data = ref<string | null>(null);

export default async function() {
    const user = (await useAuth()).user;
    if (!user) {
        if (webSocket) {
            webSocket.close();
            webSocket = null;
        }
        
        return;
    }
    
    if (!webSocket || webSocket == null) {
        await (new Promise(async (resolve, reject) => {
            webSocket = new WebSocket("ws://127.0.0.1:9389/ws?userId=" + user?.id);
    
            webSocket.onopen = () => {
                console.log("WebSocket connection established");
                resolve(webSocket);
            }
    
            webSocket.onmessage = (event) => {
                data.value = event.data;
            }
    
            webSocket.onclose = () => {
                console.log("WebSocket connection closed");
                webSocket = null;
            }
        }))
    }

    type Message = {
        type: string,
        [key: string]: any
    }
    const send = (message: string | Message) => {
        let msg: Message = typeof message == 'string' ? JSON.parse(message) : message;
        msg['from'] = user?.id;
        webSocket?.send(JSON.stringify(message));
    }

    return {
        data,
        send
    }
    
}