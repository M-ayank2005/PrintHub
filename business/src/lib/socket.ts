import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';

let socket: Socket | null = null;
let heartbeatInterval: any = null;

export function getSocket(): Socket | null {
  return socket;
}

export function initBusinessSocket(
  onJobNew?: (job: any) => void,
  onJobUpdated?: (update: any) => void,
  onJobPurged?: (data: any) => void
): Socket | null {
  const token = getAuthToken();
  if (!token) return null;

  if (socket) {
    socket.disconnect();
  }

  socket = io('http://localhost:4000', {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('Business WebSocket connected:', socket?.id);

    // Start 20s heartbeat
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      socket?.emit('agent.heartbeat', {});
    }, 20000);
  });

  socket.on('disconnect', () => {
    console.log('Business WebSocket disconnected');
    if (heartbeatInterval) clearInterval(heartbeatInterval);
  });

  if (onJobNew) {
    socket.on('job.new', (event: any) => {
      onJobNew(event.job);
    });
  }

  if (onJobUpdated) {
    socket.on('job.updated', (event: any) => {
      onJobUpdated(event);
    });
  }

  if (onJobPurged) {
    socket.on('job.purged', (event: any) => {
      onJobPurged(event);
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
