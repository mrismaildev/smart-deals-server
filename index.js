const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { verify } = require('crypto');

const app = express();
const port = process.env.PORT || 3000;
const uri = process.env.URI;

//firebase admin SDK

// const { initializeApp, cert } = require('firebase-admin/app');
// const { getAuth } = require('firebase-admin/auth');
// const serviceAccount = require('./smart-deals-firebase-adminsdk.json');

// initializeApp({
//   credential: cert(serviceAccount),
// });

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
var serviceAccount = require('./smart-deals-firebase-adminsdk.json');
initializeApp({
  credential: cert(serviceAccount),
});

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//middleware
app.use(cors());
app.use(express.json());

const logger = (req, res, next) => {
  console.log('your login information');
  next();
};
//verify firebasetoken

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
  console.log('in middleware', req.headers);
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }
  const token = authorization.split(' ')[1];
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }

  //verify

  jwt.verify(token, process.env.RANDOM_KEY, (err, decoded) => {
    if (err) {
      err = {
        name: 'TokenExpiredError',
        message: 'jwt expired',
        expiredAt: 1408621000,
      };
    }
    req.decoded = decoded;
    next();
  });
};

//firebase verify token here

// const verifyFireBaseToken = async (req, res, next) => {
//   if (!req.headers.authorization) {
//     return res.status(401).send({ message: 'Unauthorized access' });
//   }
//   const token = req.headers.authorization.split(' ')[1];
//   if (!token) {
//     return res.status(401).send({ message: 'Unathorized Access' });
//   }

//    verify
//   try {
//     const userInfo = await getAuth().verifyIdToken(token);
//     req.token_email = userInfo.email;
//     console.log(userInfo);
//     next();
//   } catch {
//     console.log('invalid token');
//   }

// };

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db('smart_db');
    const productsCollection = db.collection('products');
    const bidsCollection = db.collection('bids');
    const usersCollection = db.collection('users');

    app.post('/users', async (req, res) => {
      const newUsers = req.body;
      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        res.send({ message: 'user already exits' });
      } else {
        const result = await usersCollection.insertOne(newUsers);
        res.send(result);
      }
    });

    app.get('/products', async (req, res) => {
      // const cursor = productsCollection
      //   .find()
      //   .sort({ price_min: -1 })
      //   .limit(5)
      //   .skip(2);
      console.log(req.query);
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
      const cursor = productsCollection
        .find()
        .sort({ created_at: -1 })
        .limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
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
        $set: {
          name: name,
          price: price,
        },
      };
      const option = {};
      const result = await productsCollection.updateOne(query, update, option);
    });

    app.delete('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    //JWT reledet API
    // require('crypto').randomBytes(64).toString('hex'); genaret a random key by node

    app.post('/jwt-token', async (req, res) => {
      const user = req.body;
      const secret = process.env.RANDOM_KEY;
      const token = jwt.sign(user, secret, { expiresIn: '1h' });
      res.send({ token: token });
    });

    //jwt token verifacation

    app.get('/bids', verifyFireBaseToken, async (req, res) => {
      const email = req.query.email;

      console.log(email);
      const query = {};
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden Access' });
      }
      query.buyer_email = email;
      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    //bids
    // app.get('/bids', logger, verifyFireBaseToken, async (req, res) => {
    //   console.log('your req', req);
    //   const email = req.query.email;
    //   let query = {};

    //   if (email) {
    //     if (email !== req.token_email) {
    //       return res.status(401).send('Forbidden access');
    //     }
    //     query.buyer_email = email;
    //   }
    //   const cursor = bidsCollection.find(query);
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });

    app.delete('/bids/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bidsCollection.deleteOne(query);
      res.send(result);
    });

    // verifyJwtToken

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

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!',
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('smart server is running');
});
app.listen(port, () => {
  console.log(`Samrt server is runnig on port:${port}`);
});
