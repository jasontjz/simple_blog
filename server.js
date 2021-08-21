const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
// multer is a middleware to handle file uploads automatically
const multer = require("multer");
const app = express();

require("dotenv").config();

app.use(
  session({
    secret: process.env.SESSION_SECRET_BLA,
    resave: false,
    saveUnitialized: false,
  })
);

const mongoURI = "mongodb://localhost:27017/simpleblogdb";
const dbConnection = mongoose.connection;
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

dbConnection.on("connected", () => console.log("My database is connected"));
dbConnection.on("error", (err) => console.log(`Got error! ${err.message}`));
dbConnection.on("disconnected", () =>
  console.log("My database is disconnected")
);

// it allows you to choose different storages (disk or memory). Disk is basically on your local harddrive.
// It provides you a couple of functions, one is for choosing the destination, where you want to upload, the other one for defining the filename for the uploaded file

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/images/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

// after you setup multer to choose your disk storage, you can initialize a middleware to use for your routes
const uploadMiddleware = multer({ storage: diskStorage });

const postsModel = require("./models/posts");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
// POST http://localhost:3000/posts/1?_method=PUT -> PUT http://localhost:3000/posts/1
// POST http://localhost:3000/posts/1?_method=DELETE -> DELETE http://localhost:3000/posts/1
// this middleware is used to enable HTML forms to submit PUT/DELETE requests
app.use(methodOverride("_method"));

// in our case we are using multer in our all routes, this will automatically upload any file where the input name is featuredImage
app.use(uploadMiddleware.single("featuredImage"));

//for testing purposes only, do not expose this.
app.get("/seeds", async (req, res) => {
  await postsModel.insertMany([
    {
      headline: "great day today",
      author: "Jason",
      publishedDate: new Date("2021-08-12T06:02:52.570Z"),
      featuredImage: "",
      content: "Sunny weather, so nice",
    },
    {
      headline: "super day today",
      author: "Jason",
      publishedDate: new Date("2021-08-11T06:02:52.570Z"),
      featuredImage: "",
      content: "Rainy weather, so nice",
    },
    {
      headline: "hot day today",
      author: "Jason",
      publishedDate: new Date("2021-08-14T06:02:52.570Z"),
      featuredImage: "",
      content: "Rainy weather, so nice",
    },
    {
      headline: "warm day today",
      author: "Jason",
      publishedDate: new Date("2021-08-10T06:02:52.570Z"),
      featuredImage: "",
      content: "Rainy weather, so nice",
    },
    {
      headline: "snowy day today",
      author: "Jason",
      publishedDate: new Date("2021-08-09T06:02:52.570Z"),
      featuredImage: "",
      content: "Rainy weather, so nice",
    },
    {
      headline: "dry day today",
      author: "Jason",
      publishedDate: new Date("2021-08-14T06:02:52.570Z"),
      featuredImage: "",
      content: "Rainy weather, so nice",
    },
  ]);
});

app.get("/", async (req, res) => {
  // because posts by default are not sorted in chronological order
  // we should sort it first
  // the first post should be the most recent one
  const postsSortedByRecentDate = await postsModel
    .find()
    .sort({ publishedDate: "desc" })
    .limit(20)
    .exec();

  console.log(postsSortedByRecentDate);
  // get the most recent post which is located at the first index
  const mostRecentPost = postsSortedByRecentDate[0];
  // get the next 5 most recent posts
  const nextRecentPosts = postsSortedByRecentDate.slice(1, 20);

  // Get query parameters success and action
  // If have, we display alert banners
  // If not, no alert banners should be displayed
  const success = req.query.success;
  const action = req.query.action;

  res.render("homepage.ejs", {
    mostRecentPost,
    nextRecentPosts,
    success,
    action,
  });
});

app.get("/posts/new", (req, res) => {
  // render the UI to create a new post
  res.render("posts/new.ejs");
});

app.get("/posts/:id", async (req, res) => {
  // get the single post by post id
  const selectedPost = await postsModel.findById(req.params.id);
  console.log(selectedPost);

  // same as homepage, we display alert banners
  // if there are success and action query parameters
  // if not, don't display anything
  const success = req.query.success;
  const action = req.query.action;
  res.render("posts/show.ejs", {
    post: selectedPost,
    success,
    action,
  });
});

app.post("/posts", async (req, res) => {
  const inputs = {
    headline: req.body.headline,
    featuredImage: `images/${req.file.filename}`,
    author: req.body.author,
    publishedDate: new Date(req.body.publishedDate),
    content: req.body.content,
  };
  await postsModel.create(inputs);

  // Redirect user to the home page and provide the query parameters success and action
  res.redirect("/?success=true&action=create");
});

app.get("/posts/:id/edit", async (req, res) => {
  const selectedPost = await postsModel.findById(req.params.id);
  res.render("posts/edit.ejs", {
    post: selectedPost,
  });
});

app.put("/posts/:id", async (req, res) => {
  const inputs = {
    headline: req.body.headline,
    featuredImage: `images/${req.file.filename}`,
    author: req.body.author,
    publishedDate: new Date(req.body.publishedDate),
    content: req.body.content,
  };
  await postsModel.updateOne(
    {
      _id: req.params.id,
    },
    inputs
  );

  postsModel.update(Number(req.params.id), inputs);

  // Redirect user to the single post page and provide the query parameters success and action
  res.redirect(`/posts/${req.params.id}?success=true&action=update`);
});

app.delete("/posts/:id", async (req, res) => {
  await postsModel.deleteOne({ _id: req.params.id });

  // Redirect user to home page with success and action query parameters
  res.redirect("/?success=true&action=delete");
});

const server = app.listen(3000);

process.on("SIGINT", () => {
  console.log("my process is exiting");
  server.close(() => {
    dbConnection.close();
  });
});
