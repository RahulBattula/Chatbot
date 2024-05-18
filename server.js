const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const TOKEN = process.env.TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;
const COLLECTION_NAME = process.env.COLLECTION_NAME;

const bot = new TelegramBot(TOKEN, { polling: true });

const app = express();
const PORT = process.env.PORT || 3000;

const client = new MongoClient(MONGODB_URI, {
  serverApi: ServerApiVersion.v1,
  tls: true,
});

let collection;

client.connect()
  .then(() => {
    const db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);
    console.log('Connected to MongoDB Atlas');
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB Atlas:', err);
  });

const states = { EMAIL: 'EMAIL', PASSWORD: 'PASSWORD' };
const userStates = {};

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Thanks for chatting with me! If you want to login, type 'I want to login'.");
});

bot.onText(/I want to login/, (msg) => {
  userStates[msg.chat.id] = { state: states.EMAIL };
  bot.sendMessage(msg.chat.id, 'Please enter your email:');
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  if (userStates[chatId]) {
    const userState = userStates[chatId];

    if (userState.state === states.EMAIL) {
      userState.email = msg.text;
      userState.state = states.PASSWORD;
      await bot.sendMessage(chatId, 'Please enter your password:');
    } else if (userState.state === states.PASSWORD) {
      userState.password = msg.text;

      try {
        await collection.insertOne({ email: userState.email, password: userState.password });
        await bot.sendMessage(chatId, 'Your details were stored in the database successfully.');
      } catch (err) {
        await bot.sendMessage(chatId, 'Failed to store your details. Please try again.');
        console.error('Failed to insert document into MongoDB Atlas:', err);
      }

      delete userStates[chatId];
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
