const express = require("express");
const { MongoClient } = require("mongodb");
const uri =
  "mongodb+srv://maikcyph:warcraft30@cluster0.npoocag.mongodb.net/?retryWrites=true&w=majority";
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcrypt");

const PORT = process.env.PORT || 8080;

const APP = express();
APP.use(cors());
APP.use(express.json());

APP.post("/signup", async (req, res) => {
  const client = new MongoClient(uri, { useNewUrlParser: true });

  const { email, password } = req.body;
  const GenerateUserId = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");

    const FindUser = await users.findOne({ email });
    if (FindUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const SanitizedEmail = email.toLowerCase();
    const NewUser = {
      user_id: GenerateUserId,
      email: SanitizedEmail,
      hashed_password: hashedPassword,
    };
    const InsertedUser = await users.insertOne(NewUser);

    const token = jwt.sign(InsertedUser, SanitizedEmail, {
      expiresIn: 60 * 168,
    });

    return res
      .status(201)
      .json({ token, userId: GenerateUserId, email: SanitizedEmail });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  } finally {
    await client.close();
  }
});

APP.post("/login", async (req, res) => {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  const { email, password } = req.body;
  try {
    await client.connect();

    const database = client.db("app-data");
    const users = database.collection("users");
    const user = await users.findOne({ email });
    const passwordVerified = await bcrypt.compare(
      password,
      user.hashed_password
    );
    if (user && passwordVerified) {
      const token = jwt.sign(user, email, {
        expiresIn: 60 * 168,
      });
      res.status(201).json({ token, userId: user.user_id, email });
    }else{
        res
      .status(400)
      .json({ message: "Invalid Credentials, please Check the information" });
    }
    
  } catch (error) {
      
    return res.status(400).json({ message: error.message });
  } finally {
    await client.close();
  }
});

APP.get("/users", async (req, res) => {
  const client = new MongoClient(uri, { useNewUrlParser: true });

  try {
    await client.connect();

    const database = client.db("app-data");
    const users = database.collection("users");

    const returnedUsers = await users.find().toArray();
    res.send(returnedUsers);
  } finally {
    await client.close();
  }
});

APP.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
