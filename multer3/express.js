const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const ejs = require("ejs");
const AWS = require("aws-sdk");

const S3 = new AWS.S3({ region: "us-east-1" });
const DynamoDB = new AWS.DynamoDB.DocumentClient({ region: "us-east-1" }); // modified

const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true })); // to parse form data

app.use(express.static(path.join(__dirname, "Images"))); // serve the Images directory as a static folder

const flicks = [];

const { v4: uuidv4 } = require("uuid");

app.get("/", (req, res) => {
  res.render("index", { flicks: flicks });
});

app.post("/", upload.single("image"), (req, res) => {
  const { title, description, tags } = req.body;

  const imageBuffer = req.file.buffer;
  const imageFileName = Date.now() + path.extname(req.file.originalname);

  console.log("Title:", title);
  console.log("Description:", description);
  console.log("Tags:", tags);
  console.log("Image Filename:", imageFileName);

  const id = uuidv4();

  const params = {
    Bucket: "assigment-media-sharing-website-0506",
    Key: id + "/" + imageFileName,
    Body: imageBuffer,
  };

  S3.upload(params, function (err, data) {
    if (err) {
      console.log(err);
      return res.sendStatus(500);
    }
    console.log("S3 URL:", data.Location);

    // modified code
    const item = {
      id: id,
      title: title,
      description: description,
      tags: tags,
      image: imageFileName,
    };

    const params = {
      TableName: "imagemetadata",
      Item: item,
    };

    DynamoDB.put(params, (err, data) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error adding item to database");
      } else {
        console.log("Item added to database:", item);
        flicks.push(item);
        res.render("index", { flicks: flicks });
      }
    });
  });
});

app.listen(3001, () => {
  console.log("Server started on port 3001");
});
