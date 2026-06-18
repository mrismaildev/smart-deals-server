const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// শুধুমাত্র লোকাল পিসিতে dotenv লোড হবে, ভার্সেলে নয়
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const app = express();
const port = process.env.PORT || 3000;
const uri = process.env.URI;

// --- ১. Middleware ---
app.use(cors());
app.use(express.json());

// --- ২. Firebase Admin SDK Setup ---
try {
  const rawEnv = process.env.FIREBASE_SERVICE_KEY;
  if (rawEnv) {
    // Base64 ডিকোডিংয়ের কোনো প্রয়োজন নেই, সরাসরি JSON পার্স করুন
    const serviceAccount =
      typeof rawEnv === 'string' ? JSON.parse(rawEnv) : rawEnv;
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log('✅ Firebase Admin SDK initialized successfully.');
  } else {
    console.warn(
      '⚠️ FIREBASE_SERVICE_KEY is missing from environment variables.',
    );
  }
} catch (error) {
  console.error('❌ Firebase Init Error:', error.message);
}

// --- ৩. Firebase & JWT Verify Middleware ---
const verifyFireBaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization)
    return res.status(401).send({ message: 'Unauthorized access' });

  const token = authorization.split(' ')[1];
  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.decoded = decoded;
    next();
  } catch (err) {
    return res.status(401).send({ message: 'Invalid or expired token' });
  }
};

const verifyJwtToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization)
    return res.status(401).send({ message: 'Unauthorized access' });

  const token = authorization.split(' ')[1];
  if (!token) return res.status(401).send({ message: 'Unauthorized access' });

  jwt.verify(token, process.env.RANDOM_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'jwt expired or invalid' });
    }
    req.decoded = decoded;
    next();
  });
};

// --- ৪. MongoDB Connection Setup ---
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const db = client.db('smart_db');
const productsCollection = db.collection('products');
const bidsCollection = db.collection('bids');
const usersCollection = db.collection('users');

// MongoDB কানেক্ট করার ফাংশন (Serverless এ গ্লোবালি কল করা ভালো)
async function dbConnect() {
  try {
    // await client.connect(); // Vercel-এ এটি অনেক সময় অটোমেটিক হ্যান্ডেল হয়, তবে রেখে দেওয়া যায়
    console.log('✅ Successfully connected to MongoDB!');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
}
dbConnect();

// --- ৫. API Routes (অবশ্যই গ্লোবাল স্কোপে থাকতে হবে) ---

app.get('/', (req, res) => {
  res.send('Smart Deals API is running properly on Vercel!');
});

app.post('/users', async (req, res) => {
  const newUsers = req.body;
  const email = req.body.email;
  const query = { email: email };
  const existingUser = await usersCollection.findOne(query);

  if (existingUser) {
    res.send({ message: 'user already exists' });
  } else {
    const result = await usersCollection.insertOne(newUsers);
    res.send(result);
  }
});

app.get('/products', async (req, res) => {
  const email = req.query.email;
  let query = {};
  if (email) {
    query.email = email;
  }
  const cursor = await productsCollection.find(query);
  const result = await cursor.toArray();
  res.send(result);
});

app.get('/latest-products', async (req, res) => {
  const cursor = productsCollection.find().sort({ created_at: -1 }).limit(6);
  const result = await cursor.toArray();
  res.send(result);
});

app.get('/products/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await productsCollection.findOne(query);
  res.send(result);
});

app.post('/products', verifyFireBaseToken, async (req, res) => {
  const productData = req.body;
  const decodedEmail = req.decoded.email;

  if (productData.email !== decodedEmail) {
    return res.status(403).send({ message: 'Forbidden access' });
  }
  const result = await productsCollection.insertOne(productData);
  res.send(result);
});

app.patch('/products/:id', async (req, res) => {
  const id = req.params.id;
  const { name, price } = req.body;
  const query = { _id: new ObjectId(id) };
  const update = {
    $set: { name: name, price: price },
  };
  const result = await productsCollection.updateOne(query, update);
  res.send(result);
});

app.delete('/products/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await productsCollection.deleteOne(query);
  res.send(result);
});

// JWT Related API
app.post('/jwt-token', async (req, res) => {
  const user = req.body;
  const secret = process.env.RANDOM_KEY;
  const token = jwt.sign(user, secret, { expiresIn: '1h' });
  res.send({ token: token });
});

// Bids API
app.get('/bids', verifyFireBaseToken, async (req, res) => {
  const email = req.query.email;
  const query = {};

  if (email !== req.decoded.email) {
    return res.status(403).send({ message: 'Forbidden Access' });
  }
  query.buyer_email = email;
  const cursor = bidsCollection.find(query);
  const result = await cursor.toArray();
  res.send(result);
});

app.delete('/bids/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await bidsCollection.deleteOne(query);
  res.send(result);
});

app.get('/product/bid/:id', async (req, res) => {
  const productId = req.params.id;
  const query = { product: productId };
  const cursor = bidsCollection.find(query).sort({ bid_price: -1 });
  const result = await cursor.toArray();
  res.send(result);
});

app.post('/bids', async (req, res) => {
  const newProduct = req.body;
  const result = await bidsCollection.insertOne(newProduct);
  res.send(result);
});

// --- ৬. Server Listener ---
app.listen(port, () => {
  console.log(`🚀 Smart Deals server is running on port: ${port}`);
});

// --- ৭. Vercel Export (সবচেয়ে গুরুত্বপূর্ণ) ---
module.exports = app;
