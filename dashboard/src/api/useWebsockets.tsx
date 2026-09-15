import { useEffect, useRef, useState, useCallback } from "react";


export interface ConnectionStatus {
  ok: boolean;
  message: string;
}

const useWebsockets = () => {
    const wsRef = useRef<WebSocket | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>({ok: false, message: 'Initalise'});
    const [lastMessage, setLastMessage] = useState<any | undefined>(undefined);
    const [initial, setInitial] = useState<any | undefined>(undefined);

    const sendMessage = useCallback((msg: string) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(msg);
            }
        }, []);

    useEffect(() => {
        fetch(`http://${window.location.hostname}:8080/state`)
            .then((r) => r.json() as Promise<any>)
            .then((data) => setInitial(data));

        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const socket = new WebSocket(`${protocol}://${window.location.hostname}:8080/ws/live/`);
        wsRef.current = socket;

        socket.onmessage = (event: MessageEvent<string>) => {
            const parsedData = JSON.parse(event.data);
            setLastMessage(parsedData);
        }

        socket.onopen = () => console.log('WS connected, readyState:', socket.readyState);
        socket.onerror = (err) => console.log('WS error:', err);
        socket.onclose = () => setStatus({ok: false, message: 'Disconnected'})
            
        return () => socket.close();
    }, [])

    return { status, lastMessage, sendMessage, initial}
}

export default useWebsockets