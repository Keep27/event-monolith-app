import { Elysia, t } from 'elysia';
import { PrismaClient } from '@prisma/client';
import { passwordUtils } from '../utils/password.utils';
import { jwtUtils } from '../utils/jwt.utils';
import { emailService } from '../services/email.service';

type UserRole = 'ADMIN' | 'ORGANIZER' | 'ATTENDEE';

const prisma = new PrismaClient();

export const authController = new Elysia({ prefix: '/auth' })
  .post('/signup', async ({ body, set }) => {
    try {
      const { email, password, role = 'ATTENDEE' } = body as {
        email: string;
        password: string;
        role?: UserRole;
      };

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        set.status = 400;
        return { error: 'Invalid email format' };
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        set.status = 409;
        return { error: 'User with this email already exists' };
      }

      // Hash password
      const hashedPassword = await passwordUtils.hash(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: role as UserRole
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true
        }
      });

      // Send welcome email
      try {
        const emailResult = await emailService.sendWelcomeEmail(email, role);
        console.log('Welcome email sent:', emailResult.previewUrl);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the signup if email fails
      }

      set.status = 201;
      return {
        message: 'User created successfully',
        user,
        emailSent: true
      };
    } catch (error) {
      console.error('Signup error:', error);
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 6 }),
      role: t.Optional(t.Union([
        t.Literal('ADMIN'),
        t.Literal('ORGANIZER'),
        t.Literal('ATTENDEE')
      ]))
    }),
    detail: {
      summary: 'Register a new user',
      description: 'Creates a new user account with the specified role (defaults to ATTENDEE)',
      tags: ['Authentication']
    }
  })

  .post('/login', async ({ body, set }) => {
    try {
      const { email, password } = body as {
        email: string;
        password: string;
      };

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        set.status = 401;
        return { error: 'Invalid credentials' };
      }

      // Verify password
      const isValidPassword = await passwordUtils.compare(password, user.password);

      if (!isValidPassword) {
        set.status = 401;
        return { error: 'Invalid credentials' };
      }

      // Generate JWT token
      const token = jwtUtils.sign({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      set.status = 200;
      return {
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String()
    }),
    detail: {
      summary: 'Login user',
      description: 'Authenticates user and returns JWT token',
      tags: ['Authentication']
    }
  });

