require('dotenv').config();
const express = require('express');
const cors = require('cors');
const redis = require('redis');
const bodyParser = require('body-parser');
const { nanoid } = require('nanoid');
const { isUri } = require('valid-url');
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
const port = process.env.EXPRESS_PORT;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (_, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.post('/api/shorturl/new', async function (req, res) {
  const { url: original_url } = req.body || {};

  if (!isUri(original_url)) return res.json({ error: 'invalid url' });

  const short_url = nanoid(8);

  const ret = await setAsync(short_url, original_url);

  if (!ret) return res.json({ error: "couldn't generate short url" });

  return res.json({ short_url, original_url });
});

app.get('/api/shorturl/:short_url', async function (req, res) {
  const { short_url } = req.params || {};

  const original_url = await getAsync(short_url);

  if (!original_url || !isUri(original_url)) return res.json({ error: 'invalid url' });

  return res.redirect(original_url);
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
