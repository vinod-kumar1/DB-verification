import express from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { type } from "os";
dotenv.config();

let app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

let connectionString = `mongodb+srv://${process.env.mongodb_username}:${process.env.mongodb_password}@vinod-cluster.wknk7.mongodb.net/users`;

function hash(email, password) {
  console.log(email, password);
  return crypto
    .createHmac("sha256", `${email}`)
    .update(`${password}`)
    .digest("hex");
}

async function connectDb() {
  await mongoose.connect(connectionString);

  // Access the collection without defining a model
  const db = mongoose.connection.db;
  const collection = db.collection("lists");
  return collection;
}

async function searchDb(email, password) {
  let hashkey = hash(email, password);
  console.log(hashkey, "hashkey");
  let res = null;
  try {
    // Connect to the MongoDB database
    let collection = await connectDb();

    // Fetch the document based on the hashed sessionkey
    res = await collection.findOne({ sessionkey: hashkey });
    console.log("rest", res);
  } catch (err) {
    console.error("Error connecting to the database or fetching data:", err);
    throw new Error("Database error");
  } finally {
  }

  return res;
}

app.get("/", (req, res) => {
  res.send("Done");
});

app.get("/verifyuser", async (req, res) => {
  try {
    const email = req.headers["email"];
    const password = req.headers["password"];

    const user = await searchDb(String(email), String(password));

    if (user) {
      res.status(200).json(user); // Found the user, return the data
      res.redirect("/home");
    } else {
      res.status(404).json({ message: "Session key is invalid" }); // No user found for the given session key
    }
  } catch (err) {
    console.error("Error processing the request:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/createuser", async (req, res) => {
  let email = req.headers["email"];
  let password = req.headers["password"];
  await connectDb();
  let userSchema = new mongoose.Schema({
    sessionkey: { type: String, required: true, unique: true },
    email: { type: String, required: false, unique: false },
  });
  try {
    let hashKey = hash(email, password);
    let user = mongoose.model("lists", userSchema);
    await new user({ sessionkey: hashKey, email: email }).save();
    res.status(201).send("New user created");
  } catch (err) {
    res.status(500).send("Please try again, the issue is", err);
  }
});

export default app;
