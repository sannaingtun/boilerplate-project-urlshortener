require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
  
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// add bodyparder middleware for every post request
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

// create connection to DB
let mongoose;
try {
  mongoose = require("mongoose");
  mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
} catch (e) {
  console.log(e);
}

// create shortURL model
let ShortURL;

const Schema = mongoose.Schema;
const shortURLSchema = new Schema({
  original_url: String,
  short_url: Number
})
ShortURL = mongoose.model("ShortURL", shortURLSchema);

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

// find one by original url
const findOneByOriginalUrl = async (url, done) => {
  ShortURL.find({ original_url: url }, async (err, result) => {
    if (err) return done(err);
    done(null, result);
  })
}

// find one by short url
const findOneByShortUrl = async (url, done) => {
  ShortURL.find({ short_url: url }, async (err, result) => {
    if (err) return done(err);
    done(null, result);
  })
}

// You can POST a URL to /api/shorturl/new and 
const CreateAndSaveURL = async (url, done) => {
  // count doc to generate shorturl
  ShortURL.count(async (err, docsLen) => {
    if (err) return done(err);
    // if docsLen is zero
    if (docsLen == 0) {
      new ShortURL({ original_url: url, short_url: 0 })
        .save(async (err, doc) => {
          if (err) return done(err);
          done(null, { original_url: doc.original_url, short_url: doc.short_url });
        })
    } else {
      new ShortURL({ original_url: url, short_url: docsLen })
        .save(async (err, doc) => {
          if (err) return done(err);
          done(null, { original_url: doc.original_url, short_url: doc.short_url });
        })
    }
  })
}

// test valid url
function isValidHttpUrl(string) {
  let url;  
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }

  return url.protocol === "http:" || url.protocol === "https:";
}


// get a JSON response with original_url and short_url properties. 
// Here's an example: { original_url : 'https://freeCodeCamp.org', short_url : 1}
app.post('/api/shorturl/new', async (req, res) => {
  // validate url
  console.log("req.body.url :" + req.body.url)
  if (isValidHttpUrl(req.body.url)){
    // check existing url
    findOneByOriginalUrl(req.body.url, async (err, result) => {
      if (err) return res.json(err);
      // if url is already exist
      //console.log(result.short_url, result.original_url)
      if (result != "") {
        //console.log("result :" + result)
        res.json({ original_url: result.original_url, short_url: result.short_url });
      } else {
        // create new url
        CreateAndSaveURL(req.body.url, (err, data) => {
          //console.log("CreateAndSaveURL err :" + err)
          if (err) return res.json(err);
          //console.log(data)
          res.json(data);
        })
      }
    })
  } else {
    return res.json({ error: 'invalid URL' });
  }
});

// When you visit /api/shorturl/<short_url>, you will be redirected to the original URL.
app.get('/api/shorturl/:shorturl', async (req, res) => {
  let shortUrl = req.params.shorturl;
  console.log("shortUrl :" + shortUrl)
  // fine by short url
  findOneByShortUrl(shortUrl, (err, doc) => {
    if (err) return res.json(err);
    console.log("shorturl err :" + err)
    // if found
    
    if (doc == null) {
      return res.json({ error: "Invalid short url" });
    } else {
      return res.redirect(doc[0].original_url);
    }
  })
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
