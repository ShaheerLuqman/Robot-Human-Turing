import { Pool } from "pg";
import dns from "dns";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required for API routes.");
}

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

export const db =
  global.__dbPool ||
  new Pool({
    connectionString,
    family: 4,
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { ...options, family: 4, all: false }, callback);
    },
    ssl: connectionString.includes("localhost")
      ? false
      : {
          rejectUnauthorized: false
        }
  });

if (process.env.NODE_ENV !== "production") {
  global.__dbPool = db;
}
