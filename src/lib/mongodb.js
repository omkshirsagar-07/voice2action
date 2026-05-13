import mongoose from "mongoose";

let defaultUri = "mongodb://127.0.0.1:27017/voice2action";
let mongodbUri = process.env.MONGODB_URI || defaultUri;

if (!global.mongooseConnection) {
  global.mongooseConnection = {
    connection: null,
    promise: null,
  };
}

let cached = global.mongooseConnection;

export default async function connectToDatabase() {
  if (cached.connection) {
    return cached.connection;
  }

  if (!cached.promise) {
    // Reuse a single connection across hot reloads during local development.
    cached.promise = mongoose.connect(mongodbUri, {
      bufferCommands: false,
    });
  }

  cached.connection = await cached.promise;
  return cached.connection;
}
