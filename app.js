import express, {json} from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import joi from 'joi';
dotenv.config();

const app = express();
app.use(json());
app.use(cors());


/*----------------Validations----------------*/

const participantSchema = joi.object({
    name: joi.string().required()
});

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message'),
});

/* ------------- POST/participants ------------ */

app.post('/participants', async (req, res) => {
    const participant = req.body;
    const validation = participantSchema.validate(participant);
    if (validation.error) {
        return res.sendStatus(422);
    }

    try {
        const mongoClient = new MongoClient(process.env.MONGO_URI)
        await mongoClient.connect()

        const participantsCollection = mongoClient.db('bate-papo-uol').collection('participants');
        const messagesCollection = mongoClient.db('bate-papo-uol').collection('messages');

        const registeredParticipant = await participantsCollection.findOne({name: participant.name});
        if (registeredParticipant){
            return res.sendStatus(409);
        }

        await participantsCollection.insertOne({name: participant.name, lastStatus: Date.now()});
        await messagesCollection.insertOne({
            from: participant.name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
    });
        mongoClient.close();
        res.sendStatus(201);
    } catch (error) {
        res.sendStatus(500);
    }
});

/* ------------- GET/participants ------------ */

app.get('/participants', async (req, res) => {
    try {
        const mongoClient = new MongoClient(process.env.MONGO_URI)
        await mongoClient.connect()

        const participantsCollection = mongoClient.db('bate-papo-uol').collection('participants');
        const participants = await participantsCollection.find({}).toArray();

        mongoClient.close();
        res.send(participants);
    } catch (error) {
        res.sendStatus(500);
    }
});

/* ------------- POST/messages ------------ */

app.post('/messages', async (req, res) => {
    const message = req.body;
    const from = req.headers.user;
    const validation = messageSchema.validate(message);
    if (validation.error) {
        return res.sendStatus(422);
    }

    try {
        const mongoClient = new MongoClient(process.env.MONGO_URI)
        await mongoClient.connect()

        const participantsCollection = mongoClient.db('bate-papo-uol').collection('participants');
        const messagesCollection = mongoClient.db('bate-papo-uol').collection('messages');

        const registeredParticipant = await participantsCollection.findOne({name: from});
        if (!registeredParticipant){
            return res.sendStatus(422);
        }

        await messagesCollection.insertOne({
            ...message,
            from,
            time: dayjs().format('HH:mm:ss')
        });


        mongoClient.close();
        res.sendStatus(201);
    } catch (error) {
        res.sendStatus(500);
    }
});

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});