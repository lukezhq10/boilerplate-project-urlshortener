require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const shortid = require('shortid');
const dns = require("dns");
const { userInfo } = require('os');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/public', express.static(`${process.cwd()}/public`));
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// connect to mongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// set up URL Schema
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: String
});

const Url = mongoose.model('Url', urlSchema);

// post data to the server
// request the URL
app.post('/api/shorturl', async (req, res) => {
  const originalUrl = req.body.url;
  const urlObject = new URL(originalUrl);

  // check if valid URL - if yes, send URL object to DB, if no return invalid url json
  dns.lookup(urlObject.hostname, async (err, address, family) => {
    if (err) {
      res.json({ error: 'invalid url' });
    } else {
      let shortenedUrl = shortid.generate(); // generate a short ID code

      // create url object and save it to DB
      let urlData = new Url({
        original_url: originalUrl,
        short_url: shortenedUrl
      });

      try {
        await urlData.save();

        // respond with json object
        res.json({
          original_url: originalUrl,
          short_url: shortenedUrl
        });
      } catch (err) {
        console.log(err);
        res.status(500).json("Server error");
      }
    }});
  });

// redirect to url if short_url exists in DB and is provided
app.get('/api/shorturl/:short_url', async (req, res) => {
  let shortenedUrl = req.params.short_url;
  try {
    const url = await Url.findOne({ short_url: shortenedUrl });

    if (!url) {
      return res.json({ error: 'no url found' });
    }
    
    res.redirect(301, url.original_url);
  } catch (err) {
    console.log(err);
    res.status(500).json("Server error");
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
