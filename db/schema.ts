import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const events=sqliteTable('events',{id:text('id').primaryKey(),created:integer('created').notNull(),kind:text('kind').notNull(),title:text('title').notNull(),detail:text('detail').notNull(),mode:text('mode').notNull(),state:text('state').notNull(),notification:text('notification').notNull()});
export const configs=sqliteTable('configs',{key:text('key').primaryKey(),value:text('value').notNull()});
export const readings=sqliteTable('readings',{id:text('id').primaryKey(),created:integer('created').notNull(),payload:text('payload').notNull()});
