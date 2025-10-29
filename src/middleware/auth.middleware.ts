import { Elysia } from 'elysia';
import { jwtUtils, JWTPayload } from '../utils/jwt.utils';

type UserRole = 'ADMIN' | 'ORGANIZER' | 'ATTENDEE';

export const authMiddleware = new Elysia({ name: 'auth' })
  .derive({ as: 'scoped' }, ({ headers }) => {
    const authorization = headers.authorization;
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return {
        user: null,
        isAuthenticated: false
      };
    }

    const token = authorization.substring(7);
    
    try {
      const payload = jwtUtils.verify(token);
      return {
        user: payload,
        isAuthenticated: true
      };
    } catch {
      return {
        user: null,
        isAuthenticated: false
      };
    }
  })
  .macro('requireAuth', () => ({
    beforeHandle({ user, isAuthenticated, set }) {
      if (!isAuthenticated || !user) {
        set.status = 401;
        return { error: 'Unauthorized - Valid JWT token required' };
      }
    }
  }))
  .macro('requireRole', (roles: UserRole[]) => ({
    beforeHandle({ user, isAuthenticated, set }) {
      if (!isAuthenticated || !user) {
        set.status = 401;
        return { error: 'Unauthorized - Valid JWT token required' };
      }
      
      if (!roles.includes(user.role)) {
        set.status = 403;
        return { error: 'Forbidden - Insufficient permissions' };
      }
    }
  }));

export type AuthContext = {
  user: JWTPayload | null;
  isAuthenticated: boolean;
};

