const keys = require("./keys");
const redis = require("redis");

const redisClient = redis.createClient({
	host: keys.redisHost,
	port: keys.redisPort,
	retry_strategy: () => 1000
});

const sub = redisClient.duplicate();

function fib(index) {
	if (index < 2) return 1;
	return fib(index - 1) + fib(index - 2);
}

// when redis receives a message, set the 'values' hash, at index
// 'message' (our inputted index value) to the return value of fib(+message)
// would results in something like '7': '21'
sub.on("message", (channel, message) => {
	console.log(message);
	redisClient.hset("values", message, fib(parseInt(message)));
});

// listen for anything being inserted into redis
sub.subscribe("insert");
