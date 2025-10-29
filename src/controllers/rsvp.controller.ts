import { Elysia, t } from 'elysia';
import { PrismaClient } from '@prisma/client';
import { wsService } from '../services/websocket.service';

type RSVPStatus = 'GOING' | 'MAYBE' | 'NOT_GOING';

const prisma = new PrismaClient();

export const rsvpController = new Elysia({ prefix: '/events' })
  .post('/:id/rsvp', async ({ params, body, user, isAuthenticated, set }) => {
    try {
      if (!isAuthenticated || !user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const { id: eventId } = params as { id: string };
      const { status } = body as { status: RSVPStatus };

      // Find event
      const event = await prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        set.status = 404;
        return { error: 'Event not found' };
      }

      if (!event.approved) {
        set.status = 400;
        return { error: 'Cannot RSVP to unapproved events' };
      }

      // Check if RSVP already exists
      const existingRSVP = await prisma.rSVP.findUnique({
        where: {
          userId_eventId: {
            userId: user.userId,
            eventId: eventId
          }
        }
      });

      if (existingRSVP) {
        set.status = 409;
        return { error: 'RSVP already exists for this event' };
      }

      // Create RSVP
      const rsvp = await prisma.rSVP.create({
        data: {
          userId: user.userId,
          eventId: eventId,
          status
        },
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          },
          event: {
            select: {
              id: true,
              title: true,
              date: true,
              location: true
            }
          }
        }
      });

      // Broadcast RSVP creation
      wsService.broadcastRSVPCreated(rsvp);

      set.status = 201;
      return { rsvp };
    } catch (error) {
      console.error('Create RSVP error:', error);
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      status: t.Union([
        t.Literal('GOING'),
        t.Literal('MAYBE'),
        t.Literal('NOT_GOING')
      ])
    }),
    detail: {
      summary: 'RSVP to an event',
      description: 'Creates an RSVP for the specified event',
      tags: ['RSVP']
    }
  })

  .put('/:id/rsvp', async ({ params, body, user, isAuthenticated, set }) => {
    try {
      if (!isAuthenticated || !user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const { id: eventId } = params as { id: string };
      const { status } = body as { status: RSVPStatus };

      // Find existing RSVP
      const existingRSVP = await prisma.rSVP.findUnique({
        where: {
          userId_eventId: {
            userId: user.userId,
            eventId: eventId
          }
        }
      });

      if (!existingRSVP) {
        set.status = 404;
        return { error: 'RSVP not found' };
      }

      // Update RSVP
      const rsvp = await prisma.rSVP.update({
        where: {
          userId_eventId: {
            userId: user.userId,
            eventId: eventId
          }
        },
        data: { status },
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          },
          event: {
            select: {
              id: true,
              title: true,
              date: true,
              location: true
            }
          }
        }
      });

      // Broadcast RSVP update
      wsService.broadcastRSVPUpdated(rsvp);

      set.status = 200;
      return { rsvp };
    } catch (error) {
      console.error('Update RSVP error:', error);
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      status: t.Union([
        t.Literal('GOING'),
        t.Literal('MAYBE'),
        t.Literal('NOT_GOING')
      ])
    }),
    detail: {
      summary: 'Update RSVP status',
      description: 'Updates the RSVP status for the specified event',
      tags: ['RSVP']
    }
  })

  .delete('/:id/rsvp', async ({ params, user, isAuthenticated, set }) => {
    try {
      if (!isAuthenticated || !user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const { id: eventId } = params as { id: string };

      // Find existing RSVP
      const existingRSVP = await prisma.rSVP.findUnique({
        where: {
          userId_eventId: {
            userId: user.userId,
            eventId: eventId
          }
        }
      });

      if (!existingRSVP) {
        set.status = 404;
        return { error: 'RSVP not found' };
      }

      // Delete RSVP
      await prisma.rSVP.delete({
        where: {
          userId_eventId: {
            userId: user.userId,
            eventId: eventId
          }
        }
      });

      set.status = 200;
      return { message: 'RSVP removed successfully' };
    } catch (error) {
      console.error('Delete RSVP error:', error);
      set.status = 500;
      return { error: 'Internal server error' };
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    detail: {
      summary: 'Remove RSVP',
      description: 'Removes the RSVP for the specified event',
      tags: ['RSVP']
    }
  });

