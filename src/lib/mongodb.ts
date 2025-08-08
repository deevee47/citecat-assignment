import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string | undefined;

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI is not set. Please add it to your environment (e.g., .env.local)"
  );
}

// eslint-disable-next-line no-console
console.log("[DB] MONGODB_URI present:", Boolean(MONGODB_URI));

declare global {
  // eslint-disable-next-line no-var
  var _mongoose:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cached = (global._mongoose ??= { conn: null, promise: null });

export async function connectToDatabase(): Promise<typeof mongoose> {
  // eslint-disable-next-line no-console
  console.log("[DB] connectToDatabase called");
  if (cached.conn) {
    // eslint-disable-next-line no-console
    console.log("[DB] Using cached MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    // eslint-disable-next-line no-console
    console.log("[DB] Creating new MongoDB connection");
    cached.promise = mongoose.connect(MONGODB_URI!).then((m) => m);
  } else {
    // eslint-disable-next-line no-console
    console.log("[DB] Awaiting existing MongoDB connection promise");
  }

  try {
    cached.conn = await cached.promise;
    // eslint-disable-next-line no-console
    console.log("[DB] MongoDB connected");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[DB] MongoDB connection error", err);
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
