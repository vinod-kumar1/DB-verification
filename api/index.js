import express from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

let app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

let connectionString = `mongodb+srv://${process.env.mongodb_username}:${process.env.mongodb_password}@vinod-cluster.wknk7.mongodb.net/users`;

function hash(email, password) {
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
  let res = null;
  try {
    // Connect to the MongoDB database
    let collection = await connectDb();

    // Fetch the document based on the hashed sessionkey
    res = await collection.findOne({ sessionkey: hashkey });
  } catch (err) {
    throw new Error("Database error", err);
  } finally {
  }

  return res;
}

app.get("/", (req, res) => {
  res.status(200).send("Done");
});

app.get("/verifyuser", async (req, res) => {
  try {
    const email = req.headers["email"];
    const password = req.headers["password"];

    const user = await searchDb(String(email), String(password));

    if (user) {
      res.status(200).json(user); // Found the user, return the data
    } else {
      res.status(404).json({ message: "Session key is invalid" }); // No user found for the given session key
    }
  } catch (err) {
    res.status(500).json({ message: `Internal server error : ${err}` });
  }
});

let userSchema = new mongoose.Schema({
  sessionkey: { type: String, required: true, unique: true },
  email: {
    type: String,
    required: [true, "Email is required"], // Field is mandatory
    unique: true, // Ensure email is unique
    trim: true, // Removes leading/trailing whitespace
    lowercase: true, // Converts email to lowercase
    match: [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Please enter a valid email address",
    ], // Regular expression for email validation
  },
});
let user = mongoose.model("lists", userSchema);

app.post("/createuser", async (req, res) => {
  let email = req.headers["email"];
  let password = req.headers["password"];
  await connectDb();
  try {
    let hashKey = hash(email, password);
    let data = await new user({ sessionkey: hashKey, email: email }).save();
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json(`Please try again, the issue is : ${err}`);
  }
});

export default app;
