export default function Once(fn?: (...args: any[]) => void) {
    const v = {
        call: (...args: any[]) => {
            if (v.called) return;
            v.called = true;
            fn?.(...args);
        },
        called: false,
        value: fn
    };
    
    return v;
}