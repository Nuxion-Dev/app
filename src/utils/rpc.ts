const rpc: Record<string, object> = {
    home: {

    }
}

export function setRPC(name: string) {
    // @ts-ignore
    const invoke = window.__TAURI__.invoke;

    const selected = rpc[name];
    if (!selected) {
        throw new Error(`RPC ${name} not found`);
    }

    
}