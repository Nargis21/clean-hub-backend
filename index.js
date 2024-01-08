const express = require('express');
const cors = require('cors');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

const uri = "mongodb+srv://project_admin:rFdf0XjWZL64E1Ar@cluster0.1faki4g.mongodb.net/?retryWrites=true&w=majority"
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded
        next()
    });
}

async function run() {
    try {
        client.connect()
        console.log('DB Connected!')
        const serviceCollection = client.db('clean-hub').collection('services')
        const bookingCollection = client.db('clean-hub').collection('bookings')
        const userCollection = client.db('clean-hub').collection('users')
        const reviewCollection = client.db('clean-hub').collection('reviews')
        const paymentCollection = client.db('clean-hub').collection('payments')


        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email
            const requesterAccount = await userCollection.findOne({ email: requester })
            if (requesterAccount.role === 'admin') {
                next()
            }
            else {
                res.status(403).send({ message: 'Forbidden' })
            }
        }

        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email
            const filter = { email: email }
            const updateDoc = {
                $set: { role: 'admin' }
            }
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)
        })

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email
            const user = await userCollection.findOne({ email: email })
            const isAdmin = user.role === 'Admin'
            res.send({ admin: isAdmin })
        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })

            res.send({ result, token })

        })
        app.put('/user/update/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result)

        })

        app.get('/users', async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })

        app.get('/user/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const user = await userCollection.findOne(query)
            res.send(user)
        })

        app.delete('/user/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)

        })

        app.post('/services', verifyJWT, async (req, res) => {
            const service = req.body
            const result = await serviceCollection.insertOne(service)
            res.send(result)
        })

        app.get('/services', async (req, res) => {
            const services = await serviceCollection.find().toArray()
            res.send(services)
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const service = await serviceCollection.findOne(query)
            res.send(service)
        })

        app.delete('/services/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await serviceCollection.deleteOne(query)
            res.send(result)

        })

        app.post('/bookings', verifyJWT, async (req, res) => {
            const booking = req.body
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
        })

        app.get('/bookings', async (req, res) => {
            const bookings = await bookingCollection.find().toArray()
            res.send(bookings)
        })

        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const order = await orderCollection.findOne(query)
            res.send(order)
        })

        app.get('/booking/:email', async (req, res) => {
            const userEmail = req.params.email
            const query = { email: userEmail }
            const bookings = await bookingCollection.find(query).toArray()
            res.send(bookings)
        })

        app.patch('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const payment = req.body
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    status: 'Pending',
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment)
            const updatedOrder = await orderCollection.updateOne(filter, updatedDoc)
            res.send(updatedOrder)
        })

        app.patch('/bookings/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    status: 'Approved',
                }
            }
            const updatedBooking = await bookingCollection.updateOne(filter, updatedDoc)
            res.send(updatedBooking)
        })

        app.delete('/bookings/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        })

        app.post('/review', verifyJWT, async (req, res) => {
            const review = req.body
            const result = await reviewCollection.insertOne(review)
            res.send(result)
        })

        app.get('/reviews', async (req, res) => {
            const reviews = await reviewCollection.find().toArray()
            res.send(reviews)
        })

        app.get('/review/:email', async (req, res) => {
            const userEmail = req.params.email
            const query = { email: userEmail }
            const reviews = await reviewCollection.find(query).toArray()
            res.send(reviews)
        })

        // app.patch('/review/:id', verifyJWT, async (req, res) => {
        //     const id = req.params.id
        //     const filter = { _id: ObjectId(id) }
        //     const existingReview = await reviewCollection.findOne(filter);
        //     const updatedStatus = !existingReview?.status;
        //     const updatedDoc = {
        //         $set: {
        //             status: updatedStatus,
        //         }
        //     }
        //     const updatedReview = await reviewCollection.updateOne(filter, updatedDoc)
        //     res.send(updatedReview)
        // })

        app.delete('/review/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await reviewCollection.deleteOne(query)
            res.send(result)
        })

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body
            const price = service.totalPrice
            const amount = price * 100
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })
    }
    finally {
    }
}

run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello From Paint Pro!')
})

app.listen(port, () => {
    console.log('Clean Hub, Listening to port:', port)
})



