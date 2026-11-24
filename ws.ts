import type { Server as HttpServer } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { verifyToken, type AuthPayload } from './auth.ts';
import { handleLiveVoiceConnection } from './services/liveVoice.ts';

interface ClientMeta {
  ws: WebSocket;
  auth: AuthPayload | null;
}

const clients = new Set<ClientMeta>();

export function setupWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });
  const liveWss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const token = url.searchParams.get('token');
    const auth = token ? verifyToken(token) : null;
    const meta: ClientMeta = { ws, auth };
    clients.add(meta);

    ws.send(
      JSON.stringify({
        event: 'connected',
        payload: { role: auth?.role || 'GUEST', userId: auth?.userId || null },
      })
    );

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type?: string; token?: string };
        if (msg.type === 'auth' && msg.token) {
          meta.auth = verifyToken(msg.token);
        }
      } catch {
        // Ignore malformed client frames
      }
    });

    ws.on('close', () => {
      clients.delete(meta);
    });
  });

  liveWss.on('connection', (ws, req) => {
    handleLiveVoiceConnection(ws, req);
  });

  server.on('upgrade', (req, socket, head) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
      return;
    }
    if (pathname === '/ws/live') {
      liveWss.handleUpgrade(req, socket, head, (ws) => {
        liveWss.emit('connection', ws, req);
      });
      return;
    }
    socket.destroy();
  });

  return wss;
}

export function broadcastEvent(
  event: string,
  payload: unknown,
  targetUserIds?: number[]
) {
  const frame = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  const targetSet = targetUserIds ? new Set(targetUserIds) : null;

  for (const client of clients) {
    if (client.ws.readyState !== WebSocket.OPEN) continue;
    if (!targetSet) {
      client.ws.send(frame);
      continue;
    }
    if (client.auth && targetSet.has(client.auth.userId)) {
      client.ws.send(frame);
    }
  }
}
