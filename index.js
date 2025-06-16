
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const verifyToken = require("./verifyToken"); // 🛡 Import token middleware

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri); // ← no options



async function run() {
  try {
    await client.connect();
    const db = client.db("VolunteerDB");
    const postCollection = db.collection("posts");
    const requestCollection = db.collection("volunteerRequests");

    console.log("✅ Connected to MongoDB");

    // 🔒 Create a new post (Protected)
    app.post("/posts", verifyToken, async (req, res) => {
      try {
        const post = req.body;

        if (req.user.email !== post.organizerEmail) {
          return res.status(403).send({ message: "Forbidden - Email mismatch" });
        }

        const result = await postCollection.insertOne(post);
        res.send({ insertedId: result.insertedId });
      } catch (error) {
        console.error("POST /posts error:", error);
        res.status(500).send({ error: "Failed to create post" });
      }
    });

    // 🟢 Get all posts (public)
    app.get("/posts", async (req, res) => {
      const posts = await postCollection.find().sort({ deadline: 1 }).toArray();
      res.send(posts);
    });

    // 🟢 Get all volunteer posts (public)
    app.get("/volunteer-posts", async (req, res) => {
      try {
        const posts = await postCollection.find().sort({ deadline: 1 }).toArray();
        res.send(posts);
      } catch (error) {
        console.error("GET /volunteer-posts error:", error);
        res.status(500).send({ error: "Failed to fetch posts" });
      }
    });

    // 🟢 Get post by ID (public)
    app.get("/posts/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const post = await postCollection.findOne({ _id: new ObjectId(id) });

        if (!post) return res.status(404).send({ error: "Post not found" });

        res.send(post);
      } catch (error) {
        console.error("GET /posts/:id error:", error);
        res.status(500).send({ error: "Failed to fetch post" });
      }
    });

    // 🔒 Get my posts by organizer email
    app.get("/my-posts", verifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        if (email !== req.user.email) {
          return res.status(403).send({ message: "Forbidden - Unauthorized access" });
        }

        const posts = await postCollection.find({ organizerEmail: email }).toArray();
        res.send(posts);
      } catch (error) {
        console.error("GET /my-posts error:", error);
        res.status(500).send({ error: "Failed to fetch user's posts" });
      }
    });

    // 🔒 Submit a volunteer request
    app.post("/requests", verifyToken, async (req, res) => {
      try {
        const request = req.body;

        if (req.user.email !== request.volunteerEmail) {
          return res.status(403).send({ message: "Forbidden - Email mismatch" });
        }

        const post = await postCollection.findOne({ _id: new ObjectId(request.postId) });
        if (!post || post.volunteersNeeded <= 0) {
          return res.status(400).send({ success: false, message: "No volunteers needed or post not found." });
        }

        const existing = await requestCollection.findOne({
          postId: request.postId,
          volunteerEmail: request.volunteerEmail
        });

        if (existing) {
          return res.status(409).send({ success: false, message: "You already requested this post." });
        }

        await requestCollection.insertOne(request);

        const result = await postCollection.updateOne(
          { _id: new ObjectId(request.postId) },
          { $inc: { volunteersNeeded: -1 } }
        );

        res.send({ success: true, update: result });
      } catch (error) {
        console.error("POST /requests error:", error);
        res.status(500).send({ success: false, error: "Failed to submit request" });
      }
    });

    // 🔒 Get volunteer requests by email
    app.get("/my-requests", verifyToken, async (req, res) => {
      try {
        const email = req.query.email;
        if (email !== req.user.email) {
          return res.status(403).send({ message: "Forbidden - Unauthorized access" });
        }

        const requests = await requestCollection.find({ volunteerEmail: email }).toArray();
        res.send(requests);
      } catch (error) {
        console.error("GET /my-requests error:", error);
        res.status(500).send({ error: "Failed to fetch requests" });
      }
    });

    // 🔒 Cancel a volunteer request
    app.delete("/requests/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await requestCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        console.error("DELETE /requests/:id error:", error);
        res.status(500).send({ error: "Failed to cancel request" });
      }
    });

    // 🔒 Delete a post
    app.delete("/posts/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await postCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        console.error("DELETE /posts/:id error:", error);
        res.status(500).send({ error: "Failed to delete post" });
      }
    });

    // 🔒 Update a post
    app.put("/posts/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;

        if (req.user.email !== updatedData.organizerEmail) {
          return res.status(403).send({ message: "Forbidden - Email mismatch" });
        }

        const result = await postCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );

        res.send(result);
      } catch (error) {
        console.error("PUT /posts/:id error:", error);
        res.status(500).send({ error: "Failed to update post" });
      }
    });

  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}

run();

app.get("/", (req, res) => {
  res.send("Volunteer Management Server Running ✅");
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
