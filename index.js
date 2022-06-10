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
    } else {
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

// Update a User in the Database
APP.put("/user", async (req, res) => {
  const client = new MongoClient(uri);
  const { formData } = req.body;

  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");

    const query = { user_id: formData.user_id };

    const updateDocument = {
      $set: {
        first_name: formData.first_name,
        dob_day: formData.dob_day,
        dob_month: formData.dob_month,
        dob_year: formData.dob_year,
        show_gender: formData.show_gender,
        gender_identity: formData.gender_identity,
        gender_interest: formData.gender_interest,
        url: formData.url,
        about: formData.about,
        matches: formData.matches,
      },
    };

    const insertedUser = await users.updateOne(query, updateDocument);

    res.json(insertedUser);
  } finally {
    await client.close();
  }
});

APP.get("/user", async (req, res) => {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  const userId = req.query.userId;

  // console.log(userId);
  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");
    const query = { user_id: userId };
    // console.log("query", query);
    const user = await users.findOne(query);
    // console.log(user);
    res.json(user);
  } finally {
    await client.close();
  }
});

APP.get("/gendered-users", async (req, res) => {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  const { gender } = req.query;
  try {
    await client.connect();

    const database = client.db("app-data");
    const users = database.collection("users");
    const query = { gender_identity: { $eq: "man" } };

    const foundUsers = await users.find(query).toArray();
    res.send(foundUsers);
  } finally {
    await client.close();
  }
});

APP.put("/addmatch", async (req, res) => {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  const { UserId, matchedUserId } = req.body;
  try {
    await client.connect();
    const database = client.db("app-data");
    const users = database.collection("users");

    const query = { user_id: UserId };

    
    const updateDocument = {
      $push: { matches: { user_id: matchedUserId } },
    };
    const user = await users.updateOne(query,updateDocument);
    res.send(user)
  } catch (error) {
    console.error(error);
  } finally {
    await client.close()
  }
});

APP.get('/users', async (req,res) => {
  const client = new MongoClient(uri, { useNewUrlParser: true });
  const UserIds = JSON.parse(req.query.userIds)
  console.log(UserIds);

  try {
    await client.connect()
    const database = client.db('app-data')
    const users  =  database.collection('users')

    const pipeline = [
      {
        $match:{
          'user_id':{
            '$in': UserIds
          }
        }
      }
    ]

    const foundUsers = await users.aggregate(pipeline).toArray();
    res.send(foundUsers)

  } catch (error) {
    console.error(error);
  }finally {
    await client.close()
  }
})

APP.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
