import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

// USERS TABLE
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull(), // 'REQUESTER' | 'SUPPORT_AGENT' | 'ADMIN'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_role_idx').on(table.role),
  ]
);

// TICKETS TABLE
export const tickets = pgTable(
  'tickets',
  {
    id: serial('id').primaryKey(),
    ticketNumber: text('ticket_number').notNull().unique(),
    requesterId: integer('requester_id')
      .references(() => users.id)
      .notNull(),
    assigneeId: integer('assignee_id').references(() => users.id),
    subject: text('subject').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    priority: text('priority').notNull(), // 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    status: text('status').notNull().default('OPEN'), // 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_REQUESTER' | 'RESOLVED' | CLOSED'
    tryingToDo: text('trying_to_do'),
    expectedResult: text('expected_result'),
    actualResult: text('actual_result'),
    errorMessage: text('error_message'),
    affectedModule: text('affected_module'),
    attemptedSolution: text('attempted_solution'),
    aiSummary: text('ai_summary'),
    aiGeneratedAt: timestamp('ai_generated_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
    closedAt: timestamp('closed_at'),
  },
  (table) => [
    index('tickets_ticket_number_idx').on(table.ticketNumber),
    index('tickets_requester_id_idx').on(table.requesterId),
    index('tickets_assignee_id_idx').on(table.assigneeId),
    index('tickets_status_idx').on(table.status),
    index('tickets_priority_idx').on(table.priority),
    index('tickets_category_idx').on(table.category),
    index('tickets_created_at_idx').on(table.createdAt),
  ]
);

// COMMENTS TABLE
export const comments = pgTable(
  'comments',
  {
    id: serial('id').primaryKey(),
    ticketId: integer('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('comments_ticket_id_idx').on(table.ticketId),
    index('comments_user_id_idx').on(table.userId),
  ]
);

// ATTACHMENTS TABLE
export const attachments = pgTable(
  'attachments',
  {
    id: serial('id').primaryKey(),
    ticketId: integer('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    uploadedBy: integer('uploaded_by')
      .references(() => users.id)
      .notNull(),
    originalName: text('original_name').notNull(),
    storedName: text('stored_name').notNull(),
    filePath: text('file_path').notNull(),
    fileType: text('file_type').notNull(),
    fileSize: integer('file_size').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('attachments_ticket_id_idx').on(table.ticketId),
    index('attachments_uploaded_by_idx').on(table.uploadedBy),
  ]
);

// TICKET EVENTS (HISTORY AUDIT) TABLE
export const ticketEvents = pgTable(
  'ticket_events',
  {
    id: serial('id').primaryKey(),
    ticketId: integer('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    eventType: text('event_type').notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('ticket_events_ticket_id_idx').on(table.ticketId),
    index('ticket_events_created_at_idx').on(table.createdAt),
  ]
);

// RELATIONS
export const usersRelations = relations(users, ({ many }) => ({
  requestedTickets: many(tickets, { relationName: 'requester' }),
  assignedTickets: many(tickets, { relationName: 'assignee' }),
  comments: many(comments),
  attachments: many(attachments),
  events: many(ticketEvents),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  requester: one(users, {
    fields: [tickets.requesterId],
    references: [users.id],
    relationName: 'requester',
  }),
  assignee: one(users, {
    fields: [tickets.assigneeId],
    references: [users.id],
    relationName: 'assignee',
  }),
  comments: many(comments),
  attachments: many(attachments),
  events: many(ticketEvents),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [comments.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [attachments.ticketId],
    references: [tickets.id],
  }),
  uploader: one(users, {
    fields: [attachments.uploadedBy],
    references: [users.id],
  }),
}));

export const ticketEventsRelations = relations(ticketEvents, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketEvents.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [ticketEvents.userId],
    references: [users.id],
  }),
}));
