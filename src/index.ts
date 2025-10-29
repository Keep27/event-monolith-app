import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { authMiddleware } from './middleware/auth.middleware';
import { authController } from './controllers/auth.controller';
import { eventController } from './controllers/event.controller';
import { rsvpController } from './controllers/rsvp.controller';
import { wsService } from './services/websocket.service';

const app = new Elysia()
  .use(cors({
    origin: true,
    credentials: true
  }))
  .use(staticPlugin({
    assets: 'public',
    prefix: '/',
    alwaysStatic: false
  }))
  .use(swagger({
    documentation: {
      info: {
        title: 'Event Management API',
        version: '1.0.0',
        description: 'A simple monolith event management application with authentication, user roles, and realtime features'
      },
      tags: [
        { name: 'Authentication', description: 'User authentication endpoints' },
        { name: 'Events', description: 'Event management endpoints' },
        { name: 'RSVP', description: 'RSVP management endpoints' },
        { name: 'WebSocket', description: 'Realtime WebSocket connection' }
      ],
      servers: [
        {
          url: process.env.NODE_ENV === 'production' 
            ? 'https://event-monolith-app.onrender.com' 
            : 'http://localhost:3000',
          description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
        }
      ]
    }
  }))
  .use(authMiddleware)
  .use(authController)
  .use(eventController)
  .use(rsvpController)
  .ws('/ws', {
    message(ws, message) {
      try {
        const data = JSON.parse(message as string);
        
        // Handle different message types
        switch (data.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;
          case 'subscribe':
            ws.send(JSON.stringify({ 
              type: 'subscribed', 
              channels: data.channels || ['events', 'rsvps'],
              timestamp: new Date().toISOString()
            }));
            break;
          default:
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Unknown message type',
              timestamp: new Date().toISOString()
            }));
        }
      } catch (error) {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid JSON message',
          timestamp: new Date().toISOString()
        }));
      }
    },
    open(ws) {
      wsService.addConnection(ws);
      ws.send(JSON.stringify({ 
        type: 'connected', 
        message: 'WebSocket connected successfully',
        timestamp: new Date().toISOString()
      }));
    },
    close(ws) {
      wsService.removeConnection(ws);
    }
  })
  .get('/api', () => ({
    message: 'Event Management API',
    version: '1.0.0',
    documentation: '/swagger',
    websocket: '/ws'
  }))
  .get('/health', () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }))
  .get('/', () => {
    return Bun.file('public/index.html');
  })
  .onError(({ error, set }) => {
    console.error('Server error:', error);
    set.status = 500;
    return { error: 'Internal server error' };
  })
  .listen(process.env.PORT || 3000);

console.log(`🚀 Event Management API is running at http://localhost:${app.server?.port}`);
console.log(`📚 Swagger documentation available at http://localhost:${app.server?.port}/swagger`);
console.log(`🔌 WebSocket endpoint available at ws://localhost:${app.server?.port}/ws`);

export default app;
