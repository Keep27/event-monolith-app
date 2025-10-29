import { Elysia, t } from 'elysia';
import { PrismaClient } from '@prisma/client';
import { wsService } from '../services/websocket.service';
import { emailService } from '../services/email.service';

type UserRole = 'ADMIN' | 'ORGANIZER' | 'ATTENDEE';

const prisma = new PrismaClient();

export const eventController = new Elysia({ prefix: '/events' })
  .get('/', async ({ user, isAuthenticated, set }) => {
    try {
      if (!isAuthenticated || !user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const events = await prisma.event.findMany({
        where: { approved: true },
        include: {
          organizer: {
            select: {
              id: true,
              email: true
            }
          },
          rsvps: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { date: 'asc' }
      });

      return { events };
    } catch (error) {
      console.error('Get events error:', error);
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    detail: {
      summary: 'Get all approved events',
      description: 'Retrieves all approved events with organizer and RSVP information',
      tags: ['Events']
    }
  })

  .post('/', async ({ body, user, isAuthenticated, set }) => {
    try {
      if (!isAuthenticated || !user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      if (user.role !== 'ORGANIZER' && user.role !== 'ADMIN') {
        set.status = 403;
        return { error: 'Only organizers and admins can create events' };
      }

      const { title, description, date, location } = body as {
        title: string;
        description: string;
        date: string;
        location: string;
      };

      // Validate date
      const eventDate = new Date(date);
      if (isNaN(eventDate.getTime())) {
        set.status = 400;
        return { error: 'Invalid date format' };
      }

      if (eventDate < new Date()) {
        set.status = 400;
        return { error: 'Event date cannot be in the past' };
      }

      const event = await prisma.event.create({
        data: {
          title,
          description,
          date: eventDate,
          location,
          organizerId: user.userId,
          approved: user.role === 'ADMIN' // Auto-approve if admin
        },
        include: {
          organizer: {
            select: {
              id: true,
              email: true
            }
          }
        }
      });

      // Broadcast event creation
      wsService.broadcastEventCreated(event);

      // Send notification email to organizer
      try {
        await emailService.sendEventNotificationEmail(
          user.email,
          title,
          'created successfully'
        );
      } catch (emailError) {
        console.error('Failed to send event creation email:', emailError);
      }

      set.status = 201;
      return { event };
    } catch (error) {
      console.error('Create event error:', error);
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    body: t.Object({
      title: t.String({ minLength: 1 }),
      description: t.String({ minLength: 1 }),
      date: t.String({ format: 'date-time' }),
      location: t.String({ minLength: 1 })
    }),
    detail: {
      summary: 'Create a new event',
      description: 'Creates a new event (Organizer+ role required)',
      tags: ['Events']
    }
  })

  .put('/:id', async ({ params, body, user, isAuthenticated, set }) => {
    try {
      if (!isAuthenticated || !user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const { id } = params as { id: string };
      const { title, description, date, location } = body as {
        title: string;
        description: string;
        date: string;
        location: string;
      };

      // Find event
      const existingEvent = await prisma.event.findUnique({
        where: { id }
      });

      if (!existingEvent) {
        set.status = 404;
        return { error: 'Event not found' };
      }

      // Check permissions
      if (user.role !== 'ADMIN' && existingEvent.organizerId !== user.userId) {
        set.status = 403;
        return { error: 'You can only update your own events' };
      }

      // Validate date
      const eventDate = new Date(date);
      if (isNaN(eventDate.getTime())) {
        set.status = 400;
        return { error: 'Invalid date format' };
      }

      const event = await prisma.event.update({
        where: { id },
        data: {
          title,
          description,
          date: eventDate,
          location
        },
        include: {
          organizer: {
            select: {
              id: true,
              email: true
            }
          },
          rsvps: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true
                }
              }
            }
          }
        }
      });

      // Broadcast event update
      wsService.broadcastEventUpdated(event);

      set.status = 200;
      return { event };
    } catch (error) {
      console.error('Update event error:', error);
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      title: t.String({ minLength: 1 }),
      description: t.String({ minLength: 1 }),
      date: t.String({ format: 'date-time' }),
      location: t.String({ minLength: 1 })
    }),
    detail: {
      summary: 'Update an event',
      description: 'Updates an event (Organizer+ role required, can only update own events)',
      tags: ['Events']
    }
  })

  .delete('/:id', async ({ params, user, isAuthenticated, set }) => {
    try {
      if (!isAuthenticated || !user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const { id } = params as { id: string };

      // Find event
      const existingEvent = await prisma.event.findUnique({
        where: { id }
      });

      if (!existingEvent) {
        set.status = 404;
        return { error: 'Event not found' };
      }

      // Check permissions
      if (user.role !== 'ADMIN' && existingEvent.organizerId !== user.userId) {
        set.status = 403;
        return { error: 'You can only delete your own events' };
      }

      await prisma.event.delete({
        where: { id }
      });

      // Broadcast event deletion
      wsService.broadcastEventDeleted(id);

      set.status = 200;
      return { message: 'Event deleted successfully' };
    } catch (error) {
      console.error('Delete event error:', error);
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      summary: 'Delete an event',
      description: 'Deletes an event (Organizer+ role required, can only delete own events)',
      tags: ['Events']
    }
  })

  .put('/:id/approve', async ({ params, user, isAuthenticated, set }) => {
    try {
      if (!isAuthenticated || !user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      if (user.role !== 'ADMIN') {
        set.status = 403;
        return { error: 'Only admins can approve events' };
      }

      const { id } = params as { id: string };

      const event = await prisma.event.update({
        where: { id },
        data: { approved: true },
        include: {
          organizer: {
            select: {
              id: true,
              email: true
            }
          },
          rsvps: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true
                }
              }
            }
          }
        }
      });

      // Broadcast event approval
      wsService.broadcastEventApproved(event);

      // Send notification email to organizer
      try {
        await emailService.sendEventNotificationEmail(
          event.organizer.email,
          event.title,
          'approved'
        );
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }

      set.status = 200;
      return { event };
    } catch (error) {
      console.error('Approve event error:', error);
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      summary: 'Approve an event',
      description: 'Approves an event (Admin role required)',
      tags: ['Events']
    }
  });

