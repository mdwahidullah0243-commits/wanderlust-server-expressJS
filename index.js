const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dotenv.config();

const app = express();
const port = 8000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.CONNECTION_URI_USER_NAME}:${process.env.CONNECTION_URI_USER_PASSWORD}@cluster0.cjigwjn.mongodb.net/?appName=Cluster0`

const client = new MongoClient(uri);

const verifyToken = async (req, res, next) => {
    const authHeaders = req.headers.authorization;

    if (!authHeaders) {
        res.status(401).json({ message: 'Unauthorized' });
    };

    const token = authHeaders.split(' ')[1];

    if (!token) {
        res.status(401).json({ message: 'Unauthorized' });
    };

    try {
        const JWKS = createRemoteJWKSet(
            new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
        );

        const { payload } = await jwtVerify(token, JWKS);
        console.log('payload:', payload);

        next();

    } catch (error) {
        return res.status(403).json({ message: 'Token validation failed' });
    };
};

const connectToMongoDB = async () => {
    try {
        // await client.connect();
        console.log('You successfully connected to MongoDB');

        const database = client.db('wanderlust');
        const destinationCollection = database.collection('destinations');
        const bookingsCollection = database.collection('bookings');

        app.get('/features', async (req, res) => {
            const cursor = destinationCollection.find({}).limit(6);
            const result = await cursor.toArray();

            res.send(result);
        });

        app.get('/destinations', async (req, res) => {
            const cursor = destinationCollection.find({});
            const result = await cursor.toArray();

            res.send(result);
        });

        app.get('/destination-details/:detailsId', verifyToken, async (req, res) => {
            const { detailsId } = req.params;
            const query = {
                _id: new ObjectId(detailsId)
            };
            const result = await destinationCollection.findOne(query);

            res.send(result);
        }
        );

        app.get('/my-bookings/user/:userId', verifyToken, async (req, res) => {
            const { userId } = req.params;

            const cursor = bookingsCollection.find({
                userId: userId
            });
            const result = await cursor.toArray();

            res.send(result);
        });

        app.post('/admin/add-new-travel-package', async (req, res) => {
            const packageData = req.body;
            const result = await destinationCollection.insertOne(packageData);

            res.send(result);
        });

        app.post('/destination-details/:bookingId', async (req, res) => {
            const bookingData = req.body;
            const result = await bookingsCollection.insertOne(bookingData);

            res.send(result);
        });

        app.patch('/destination-details/:detailsId', verifyToken, async (req, res) => {
            const { detailsId } = req.params;
            const updatedPackage = req.body;

            const filter = {
                _id: new ObjectId(detailsId)
            };

            const updateDoc = {
                $set: {
                    name: updatedPackage.name,
                    ratings: updatedPackage.ratings,
                    reviews: updatedPackage.reviews,
                    duration: updatedPackage.duration,
                    amount: updatedPackage.amount
                }
            };

            const result = await destinationCollection.updateOne(filter, updateDoc);

            res.send(result);
        });

        app.delete('/destination-details/:detailsId', verifyToken, async (req, res) => {
            const { detailsId } = req.params;

            const filter = {
                _id: new ObjectId(detailsId)
            };
            const result = destinationCollection.deleteOne(filter);

            res.send(result);
        });

        app.delete('/my-bookings/user/:userId/booking/:bookingId', verifyToken, async (req, res) => {
            const { userId, bookingId } = req.params;

            const filter = {
                userId: userId,
                _id: new ObjectId(bookingId)
            };

            const result = bookingsCollection.deleteOne(filter);

            res.send(result);
        });

        return client;

    } catch (err) {
        console.dir(err)
    }
};

connectToMongoDB();

const disconnectFromMongoDB = async () => {
    await client.close();
};


app.get('/', (req, res) => {
    res.send('Wanderlust is comming!');
});


app.listen(port, () => {
    console.log(`Wanderlust server listening on the port: ${port}`)
});