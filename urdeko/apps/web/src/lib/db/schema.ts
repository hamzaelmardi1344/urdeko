import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ===== Enums ========================================================

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "photo_ok",
  "elements_chosen",
  "products_chosen",
  "rendering",
  "completed",
  "failed",
]);

export const roomTypeEnum = pgEnum("room_type", [
  "salon",
  "chambre",
  "salle_a_manger",
  "bureau",
  "espace_jardin",
]);

export const styleEnum = pgEnum("style", [
  "moderne",
  "contemporain",
  "minimaliste",
  "japandi",
  "chaleureux",
  "elegant",
]);

export const elementCategoryEnum = pgEnum("element_category", [
  "canape",
  "table_basse",
  "tapis",
  "luminaire",
  "decoration",
  "meuble_tv",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
]);

// ===== Auth tables (Auth.js / Drizzle adapter) ======================

export const users = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "account",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  }),
);

export const sessions = pgTable("session", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

// ===== Core business tables =========================================

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    guestId: text("guest_id"), // pour le parcours pré-auth
    name: text("name").notNull(),
    roomType: roomTypeEnum("room_type"),
    style: styleEnum("style"),
    palette: text("palette"), // id palette ou "harmonie_urdeko"
    budgetMad: integer("budget_mad").notNull().default(15000),
    flexibility: integer("flexibility").notNull().default(10), // pourcentage
    status: projectStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: uniqueIndex("projects_user_created_idx").on(table.userId, table.createdAt),
  }),
);

export const projectPhotos = pgTable("project_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  originalUrl: text("original_url").notNull(),
  emptiedUrl: text("emptied_url"),
  analysisJson: jsonb("analysis_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectElements = pgTable(
  "project_elements",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    category: elementCategoryEnum("category").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.category] }),
  }),
);

export const projectSelections = pgTable("project_selections", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  category: elementCategoryEnum("category").notNull(),
  productId: text("product_id").notNull(), // ref Sanity document _id
  priceMad: integer("price_mad").notNull(),
  chosenAt: timestamp("chosen_at").defaultNow().notNull(),
});

export const projectRenders = pgTable("project_renders", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  imageUrl: text("image_url").notNull(),
  advice: text("advice"), // texte "Le conseil UrdeKo"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  city: text("city").notNull(),
  phone: text("phone"),
  wantsEmail: boolean("wants_email").notNull().default(true),
  wantsCallback: boolean("wants_callback").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Clé/valeur libre, éditable depuis /admin/parametres. Sert aux feature flags,
// quotas IA, seuils de prix, etc. La valeur est en JSONB pour rester typée
// côté applicatif (boolean, number, string, objet).
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // analyze_photo | empty_room | select_products | render | advice
  status: jobStatusEnum("status").notNull().default("queued"),
  progress: integer("progress").notNull().default(0), // 0..100
  error: text("error"),
  resultJson: jsonb("result_json"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== Relations ====================================================

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  photos: many(projectPhotos),
  elements: many(projectElements),
  selections: many(projectSelections),
  renders: many(projectRenders),
  contact: one(contacts, { fields: [projects.id], references: [contacts.projectId] }),
  jobs: many(jobs),
}));

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

// Type helpers
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectPhoto = typeof projectPhotos.$inferSelect;
export type ProjectElement = typeof projectElements.$inferSelect;
export type ProjectSelection = typeof projectSelections.$inferSelect;
export type ProjectRender = typeof projectRenders.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;
