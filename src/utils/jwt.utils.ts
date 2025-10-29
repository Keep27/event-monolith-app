import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'ORGANIZER' | 'ATTENDEE';
}

export const jwtUtils = {
  sign: (payload: JWTPayload): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  },

  verify: (token: string): JWTPayload => {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  },

  decode: (token: string): JWTPayload | null => {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }
};

