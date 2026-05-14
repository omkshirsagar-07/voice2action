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
    let connectionOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 15000,
      family: 4,
    };

    if (mongodbUri.includes("mongodb+srv://") || mongodbUri.includes("mongodb.net")) {
      connectionOptions = {
        ...connectionOptions,
        maxPoolSize: 10,
      };
    }

    cached.promise = mongoose.connect(mongodbUri, connectionOptions);
  }

  try {
    cached.connection = await cached.promise;
    console.log("Connected to MongoDB successfully");
    return cached.connection;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}
