require('dotenv').config();
const express = require('express');
const cors = require('cors');
const redis = require('redis');
const bodyParser = require('body-parser');
const { nanoid } = require('nanoid');
const { isWebUri } = require('valid-url');
const { promisify } = require('util');

const app = express();

const db = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
});

const getAsync = promisify(db.get).bind(db);
const setAsync = promisify(db.set).bind(db);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors({ optionsSuccessStatus: 200 }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/shorturl/new', async function (req, res) {
  const { url: original_url } = req.body || {};

  if (!isWebUri(original_url)) return res.json({ error: 'invalid url' });

  let short_url = nanoid(8);

  while (await getAsync(short_url)) {
    short_url = nanoid(8);
  }

  const ret = await setAsync(short_url, original_url);

  if (!ret) return res.json({ error: "couldn't generate short url" });

  return res.json({ short_url, original_url });
});

app.get('/api/shorturl/:short_url', async function (req, res) {
  const { short_url } = req.params || {};

  const original_url = await getAsync(short_url);

  if (!original_url) return res.json({ error: `couldn't get an url for short url: ${short_url}` });

  return res.redirect(original_url);
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
