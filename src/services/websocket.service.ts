interface WebSocketMessage {
  type: 'event_created' | 'event_updated' | 'event_deleted' | 'event_approved' | 'rsvp_created' | 'rsvp_updated';
  data: any;
  timestamp: string;
}

class WebSocketService {
  private connections: Set<WebSocket> = new Set();

  addConnection(ws: WebSocket) {
    this.connections.add(ws);
    console.log(`WebSocket connected. Total connections: ${this.connections.size}`);
  }

  removeConnection(ws: WebSocket) {
    this.connections.delete(ws);
    console.log(`WebSocket disconnected. Total connections: ${this.connections.size}`);
  }

  broadcast(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);
    const deadConnections: WebSocket[] = [];

    this.connections.forEach(ws => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        } else {
          deadConnections.push(ws);
        }
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        deadConnections.push(ws);
      }
    });

    // Clean up dead connections
    deadConnections.forEach(ws => this.removeConnection(ws));
  }

  broadcastEventCreated(event: any) {
    this.broadcast({
      type: 'event_created',
      data: event,
      timestamp: new Date().toISOString()
    });
  }

  broadcastEventUpdated(event: any) {
    this.broadcast({
      type: 'event_updated',
      data: event,
      timestamp: new Date().toISOString()
    });
  }

  broadcastEventDeleted(eventId: string) {
    this.broadcast({
      type: 'event_deleted',
      data: { eventId },
      timestamp: new Date().toISOString()
    });
  }

  broadcastEventApproved(event: any) {
    this.broadcast({
      type: 'event_approved',
      data: event,
      timestamp: new Date().toISOString()
    });
  }

  broadcastRSVPCreated(rsvp: any) {
    this.broadcast({
      type: 'rsvp_created',
      data: rsvp,
      timestamp: new Date().toISOString()
    });
  }

  broadcastRSVPUpdated(rsvp: any) {
    this.broadcast({
      type: 'rsvp_updated',
      data: rsvp,
      timestamp: new Date().toISOString()
    });
  }
}

export const wsService = new WebSocketService();

