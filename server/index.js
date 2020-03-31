// all the logic we need to communicate between redis,
// postgres and the front-end

const keys = require("./keys");

// Express app setup

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

app.use(cors());
// parses incoming requests from front-end,
// turns them into express-readable json
app.use(bodyParser.json());

// Postgres Client Setup

const { Pool } = require("pg");
const pgClient = new Pool({
	user: keys.pgUser,
	host: keys.pgHost,
	database: keys.pgDatabase,
	password: keys.pgPassword,
	port: keys.pgPort
});

pgClient.on("error", () => {
	console.log("lost pg connection");
});

pgClient.query("CREATE TABLE IF NOT EXISTS values (number INT)").catch(err => {
	console.log(err);
});

// Redis Client Setup
const redis = require("redis");
const redisClient = redis.createClient({
	host: keys.redisHost,
	port: keys.redisPort,
	retry_strategy: () => 1000
});
// why are we making duplicate connections? if we ever have a client that is
// listening or publishing information on redis, we have to make a duplicate connection
// because when a connection is used to do publishing/listening it cannot be used for
// other purposes
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get("/", (req, res) => {
	res.send("Hi");
});
// will return all values ever submitted to our application
app.get("/values/all", async (req, res) => {
	const values = await pgClient.query("SELECT * from values");
	// makes sure we only return the values we're looking for
	// not extraneous information about the query
	res.send(values.rows);
});

app.get("/values/current", async (req, res) => {
	// redis doesn't have out of the box support for promises
	// which is why we're not using 'await'
	redisClient.hgetall("values", (err, values) => {
		res.send(values);
	});
});

app.post("/values", (req, res) => {
	const index = req.body.index;
	if (parseInt(index) > 40) {
		return res.status(422).send("Index too high");
	}
	// set value at index inside 'values' colleciton in redis to 'nothing yet'
	redisClient.hset("values", index, "Nothing Yet!");
	// publish a new insert even of that index - tells worker that it's time to
	// pull the new index value out of redis and calculate the fibonacci value for it
	redisPublisher.publish("insert", index);
	// add in new index to postgres database (stores a permanent record of all indices )
	pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);
	// send something in response to the post request just saying 'it's working'
	res.send({ working: true, index: index });
});

app.listen(5000, err => {
	console.log("listening on 5000");
});
