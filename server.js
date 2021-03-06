var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");


// Scraping tools
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 2511;
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines"

mongoose.connect(MONGODB_URI);
// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
app.use(express.urlencoded({
  extended: true
}));
app.use(express.json());

// app.engine("handlebars", exphbs({
//   defaultLayout: "main"
// }));
// app.set("view engine", "handlebars");

app.use(express.static("public"));

// Connect to the Mongo DB
mongoose.connect("mongodb://localhost/gamesFeed", {
  useNewUrlParser: true
});


// Routes

// A GET route for scraping the IGN website
app.get("/scrape", function (req, res) {
  axios.get("https://au.ign.com/")
    .then(function (response) {
      var $ = cheerio.load(response.data);

      $(".content-item").each(function (i, element) {
        var result = {};

        // Add the text and href of every link, and save them as properties of the result object
        result.title = $(this)
          .children("div")
          .children(".item-details")
          .children("a")
          .children("h3")
          .children("div")
          .children("span")
          .text();
        result.link = $(this)
          .children("div")
          .children(".item-details")
          .children("a")
          .attr("href");
    
        // Create a new Article using the `result` object built from scraping
        db.Article.create(result)
          .then(function (dbArticle) {
            console.log(dbArticle);
          })
          .catch(function (err) {
            console.log(err);
          });
        });
        res.send("Scrape Complete");

    });
});

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  db.Article.find()
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  db.Article.findOne({
      _id: req.params.id
    }).populate("note")
    .then(function (dbArticle) {

      res.json(dbArticle);
    })
    .catch(function (err) {

      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
  db.Note.create(req.body)
    .then(function (newNote) {
      console.log(newNote);
      return db.Article.findOneAndUpdate({
          _id: req.params.id
        }, {
          note: newNote._id
        }, {
          new: true
        }).then(function (dbArticle) {
          res.json(dbArticle);
        })
        .catch(function (err) {
          console.log(err.message);
        });
    })
});

app.get("/clear", function (req, res) {
  db.Article.remove({})
    .then(function () {
      db.Note.deleteMany({})
        .then(function () {
          res.send("Clear Complete");
        })
    })
    .catch(function (err) {
      console.log(err.message);
    });
});

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});