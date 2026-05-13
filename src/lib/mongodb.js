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
    // Connection options optimized for MongoDB Atlas
    let connectionOptions = {
      bufferCommands: false,
    };

    // Add Atlas-specific options if using Atlas
    if (mongodbUri.includes('mongodb+srv://') || mongodbUri.includes('mongodb.net')) {
      connectionOptions = {
        ...connectionOptions,
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        family: 4, // Use IPv4, skip trying IPv6
      };
    }

    // Reuse a single connection across hot reloads during local development.
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
