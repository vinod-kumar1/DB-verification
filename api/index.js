import express from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import bodyParser from "body-parser";
import cors from "cors";
import "dotenv";

let app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

let connectionString = `mongodb+srv://${process.env.mongodb_username}:${process.env.mongodb_password}@vinod-cluster.wknk7.mongodb.net/users`;

function hash(sessionkey) {
  return crypto
    .createHmac("sha256", sessionkey)
    .update("musicapp")
    .digest("hex");
}

async function searchDb(sessionkey) {
  let hashkey = hash(sessionkey);
  let res = null;
  try {
    // Connect to the MongoDB database
    await mongoose.connect(connectionString);

    // Access the collection without defining a model
    const db = mongoose.connection.db;
    const collection = db.collection("list");

    // Fetch the document based on the hashed sessionkey
    res = await collection.findOne({ sessionkey: hashkey });
  } catch (err) {
    console.error("Error connecting to the database or fetching data:", err);
    throw new Error("Database error");
  } finally {
    // Close the MongoDB connection after completing the operation
    mongoose.connection.close();
  }

  return res;
}

app.get("/", (req, res) => {
  res.send("Done");
});

app.get("/verifyuser", async (req, res) => {
  try {
    const sessionkey = req.headers["sessionkey"];
    if (!sessionkey) {
      return res.status(400).json({ message: "Session key is required" });
    }

    const user = await searchDb(sessionkey);

    if (user) {
      res.status(200).json(user); // Found the user, return the data
    } else {
      res.status(404).json({ message: "Session key is not found" }); // No user found for the given session key
    }
  } catch (err) {
    console.error("Error processing the request:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default app;
