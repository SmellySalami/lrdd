/*jshint esversion: 8 */
/*jshint laxcomma: true*/

const express = require('express');
const app = express();
app.set('trust proxy', 1); //trust first proxy

const mongoose = require('mongoose');

let {graphqlHTTP} = require('express-graphql');
let {buildSchema} = require('graphql');

app.use(express.json());

const cors = require('cors');
app.use(cors({
  origin:'https://lrdd.me',
  credentials: true,
  optionsSuccessStatus: 200,
}));

const unirest = require('unirest');
const {blacklist, escape, unescape} = require('validator');

const http = require('http');
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';
const options = {
  cors: {
    origin:'https://lrdd.me',
  },
  transports: ['websocket'],
};
const io = require('socket.io')(server, options);

const dbURI = process.env.MONGO_URI;
mongoose
  .connect(dbURI, {useNewUrlParser: true, useUnifiedTopology: true})
  .then((result) =>
    console.log('MongoDB database connection established successfully')
  )
  .catch((err) => console.log(err));
const conn = mongoose.connection;

const session = require('express-session');
const MongoStore = require('connect-mongo');

const crypto = require('crypto');
const cookie = require('cookie');

app.use(
  session({
    secret: process.env.SESSION_KEY || 'every villain is lemons',
    resave: true,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: 3600000,
      sameSite: "none",
    },
    store: MongoStore.create({
      mongoUrl: dbURI,
    }),
  })
);

// debug
app.use(function (req, res, next) {
  const { url } = req;
  const isCookieSent = req.headers.cookie;
  next();
});

app.get('/', function (req, res, next) {
  return res.send('Visit https://lrdd.me for a cool app!');
});

let schema = buildSchema(`
    type Query {
      getRooms(input: GetRoomInput): [RoomDetails]
      getRoomContent(roomId: String): RoomContent
      joinRoom(roomId: String, pass: String): String
      signOut: String
      signIn(tokenId: String): Boolean
    }

    type Job {
      source_code: String!
      language: Lang!
      stdout: String
      stderr: String
    }

    input RoomInput {
      email: String!
      name: String!
      pass: String
    }

    type Room {
      _id: ID
      hostEmail: String!
      name: String!
      passProtected: Boolean!
      pass: String
      salt: String
      numMembers: Int
      editorContent: String
      messages: [Message]
    }
    
    type Message {
      senderName: String!
      content: String!
    }

    type RoomDetails {
      roomId: String!
      name: String!
      passProtected: Boolean!
      owned: Boolean!
    }

    type RoomContent {
      editorContent: String!
      messages: [Message]
    }

    input RoomContentInput {
      roomId: String!
      editorContent: String!
      messages: [MessageInput]
    }

    input GetRoomInput {
      email: String!
      filter: String!
    }

    input MessageInput {
      senderName: String!
      content: String!
    }

    enum Lang{
      PYTHON3
      JAVA
    }

    input JobInput {
      source_code: String!
      language: Lang!
    }

    type Mutation {
      createRoom(input: RoomInput): String
      setRoomContent(input: RoomContentInput): Boolean
      deleteRoom(roomId: String): Boolean
      runJob(input: JobInput): Job
    }
`);

function saltHash(pass, salt = '') {
  return new Promise(function (resolve, reject) {
    if (salt === '') {
      salt = crypto.randomBytes(16).toString('base64');
    }
    let hash = crypto.createHmac('sha512', salt);
    hash.update(pass);
    let saltedHash = hash.digest('base64');
    return resolve([saltedHash, salt]);
  });
}

let blacklistChars = '\\$\'";{}/';
let root = {
  // Queries
  getRooms: async ({input}, context) => {
    /*
      Returns all rooms against a given filter
    */
    if(!context.session.authenticated) throw new Error ("Invalid credentials");

    let query = {};
    switch (input.filter) {
      case 'Mine':
        query = {hostEmail: input.email};
        break;
      case 'Public':
        query = {passProtected: false};
        break;
      case 'Private':
        query = {passProtected: true};
        break;
      default:
        query = {};
    }

    let result = await conn
      .collection('rooms')
      .find(query, {_id: 1, name: 1, passProtected: 1})
      .map((room) => {
        let owned = input.email === room.hostEmail;
        return {
          roomId: room._id.toString(),
          name: unescape(room.name),
          passProtected: room.passProtected,
          owned: owned,
        };
      })
      .toArray();
    
    return result;
  },
  getRoomContent: async (input, context) => {
    /*
      Returns content for a given room
    */
    if(!context.session.authenticated) throw new Error ("Invalid credentials");

    let roomId = blacklist(input.roomId, blacklistChars);
    let result = await conn
      .collection('rooms')
      .findOne({_id: mongoose.Types.ObjectId(roomId)});
    let roomContent = {
      editorContent: result.editorContent,
      messages: result.messages,
    };
    return roomContent;
  },
  joinRoom: async (input, context) => {
    /*
      Validate a user joining a room
    */
    if(!context.session.authenticated) throw new Error ("Unauthorized");

    let roomId = blacklist(input.roomId, blacklistChars);
    let room = await conn
      .collection('rooms')
      .findOne({_id: mongoose.Types.ObjectId(roomId)});
    let pass = room.pass;
    let salt = room.salt;
    let [passAttempt] = await saltHash(input.pass, salt);

    if (passAttempt === pass) {
      return 'Authorized: Entering Room';
    } else {
      throw new Error('Unauthorized');
    }
  },
  signOut: (_, context) => {
    /*
      Signs out an existing user
    */
    if(!context.session.authenticated) throw new Error ("Unauthorized");
    context.session.destroy();
    return 'Sign out successful';
  },
  signIn: (input, context) => {
    /*
      Signs in a user
    */
    let tokenId = input.tokenId;
    let req = unirest('GET', 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token='+tokenId);
    return req.then((res) => {
      context.session.authenticated = res.ok;
      return res.ok;
    });
  },

  // Mutations
  createRoom: async ({input}, context) => {
    /*
      Returns id of newly created room
    */
    if(!context.session.authenticated) throw new Error ("Invalid credentials");

    let pass = input.pass;
    let salt = '';
    let name = escape(input.name);
    let email = blacklist(input.email, blacklistChars);
    if (input.pass !== '') {
      [pass, salt] = await saltHash(input.pass);
    }

    let defaultEditorContent = 'print("Hello world!")';
    let result = await conn.collection('rooms').insertOne({
      hostEmail: email,
      name: name,
      passProtected: pass !== '' ? true : false,
      pass: pass,
      salt: salt,
      numMembers: 0,
      editorContent: defaultEditorContent,
      messages: [],
    });
    return result.insertedId;
  },
  setRoomContent: async ({input}, context) => {
    /*
      Returns whether contents were set for a given room
    */
    if(!context.session.authenticated) throw new Error ("Invalid credentials");

    let result = await conn
      .collection('rooms')
      .updateOne(
        {_id: mongoose.Types.ObjectId(input.roomId)},
        {$set: {editorContent: input.editorContent, messages: input.messages}}
      );
    return result.modifiedCount === 1;
  },
  deleteRoom: async (input, context) => {
    /*
      Returns whether a given room was deleted
    */
    if(!context.session.authenticated) throw new Error ("Invalid credentials");

    let result = await conn
      .collection('rooms')
      .deleteOne({_id: mongoose.Types.ObjectId(input.roomId)});
    return result.deletedCount === 1;
  },
  runJob: ({input}, context) => {
    /*
      Returns stdout and stderr of after execution
    */
    if(!context.session.authenticated) throw new Error ("Invalid credentials");

    let encodedData = input.source_code;
    let req = unirest('POST', 'https://judge0.lrdd.me/submissions/');
    req.query({
      base64_encoded: 'true',
      fields: '*',
      wait: 'true',
    });
    req.headers({
      'content-type': 'application/json',
      'x-auth-token': process.env.JUDGE0_API_KEY,
      useQueryString: true,
    });
    req.type('json');
    req.send({
      language_id: 71,
      source_code: encodedData,
    });
    let result = '';
    return req.then((res) => {
      let stdout = null;
      let stderr = null;
      if (res.body.stdout) {
        stdout = res.body.stdout;
      }
      if (res.body.stderr) {
        stderr = res.body.stderr.replace(/(\r\n|\n|\r)/gm, '');
      }
      return {stdout: stdout, stderr: stderr};
    });
  },
};

app.use(
  '/graphql',
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
  })
);

io.on('connection', (socket) => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });
});

server.listen(PORT, function (err) {
  if (err) console.log(err);
  else console.log('HTTPS server on port %s', PORT);
});
