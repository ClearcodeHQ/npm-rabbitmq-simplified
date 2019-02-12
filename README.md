# RabbitMQ simplified

Simplifies asynchronous connection to RabbitMq with connection retrying, as well as providing promise-based helper methods for creating channels, exchanges and queues, binding queue with exchange and consuming with given prefetch, all with error handling.

If connection cannot be established, a new attempt will be made after a delay set in config (5 seconds by default). Every subsequent retry will occur after two times as long (so by default 10, 20, 40, 80 etc seconds). You can set how many times connection will be retried (10 by default).

## Installation

Add to your dependencies:

```
"dependencies": {
    "rabbitmq-simplified": "https://github.com/ClearcodeHQ/npm-rabbitmq-simplified"
}
```

## Usage

```
const RabbitMQ = require("rabbitmq-simplified");

// You can, but don't have to pass the config array or any of its values
const config = {
    hostname: 'rabbit', // by default process.env.RABBITMQ_HOST
    username: 'user',  // by default process.env.RABBITMQ_USER
    password: 'pass', // by default process.env.RABBITMQ_PASS
    port: 5959, // by default process.env.RABBITMQ_PORT
    maxRabbitConnectionRetries: 5, // by default 10
    retryAfter: 3000 // in miliseconds, by default 5000
    retryAfterMultiplier: 1 // by default 2
}

const Connector = new RabbitMQ(config);
```

### Obtaining connection and channel

```
let channel = await Connector.connectToRabbit().then(Connector.createChannel);
```

### Asserting exchange existence

If exchange with given name doesn't exist, it will be created with given options and channel returned back.
If exchange with given name exists with the same options and type, we're ok and channel will be returned back.
If exchange with given name exists with different options or type, an error will occur and null will be returned.

```
Connector.assertExchange(
    channel, // channel obtained from createChannel method on which the assertion should be sent to RabbitMQ
    exchangeName, // string with exchange name
    exchangeType, // string with exchange type; optional, direct by default
    exchangeOptions // object with exchange options; optional {durable:true} by default
);
```

Example:

```
if (Connector.assertExchange(channel, "exchange", "fanout")) {
    // Now you know that exchange is available, so you can send messages there
} else {
    // Something went wrong, try again or leave
}
```

### Asserting queue existence

If queue with given name doesn't exist, it will be created with given options and channel returned back.
If queue with given name exists with the same options, we're ok and channel will be returned back.
If queue with given name exists with different options, an error will occur and null will be returned.


```
Connector.assertQueue(
    channel, // channel obtained from createChannel method on which the assertion should be sent to RabbitMQ
    queueName, // string with queue name
    queueOptions // object with exchange options; optional {durable:true} by default
);
```

Example:

```
if (Connector.assertQueue(channel, "queue", {durable:false})) {
    // Queue is available, you can consume from it
} else {
    // Something went wrong, try again or leave
}
```

### Binding queue to exchange

```
Connector.bindQueueToExchange(
    channel, // channel obtained from createChannel method on which the assertion should be sent to RabbitMQ
    queueName, // string with queue name, must be asserted beforehand
    exchangeName, // string with exchange name, must be asserted beforehand
    routingKey // routing key on which the exchange and queue will be bound; empty by default
);
```

Example:

```
if (Connector.bindQueueToExchange(channel, "queue", "exchange", "key")) {
    // Queue is bound to exchange, messages with given routing key will be delivered there
} else {
    // Something went wrong, try again or leave
}
```

### Asserting and consuming queue

A shorthand for calling `assertQueue`, setting prefetch and starting consuming messages. Returns true if queue was asserted and consumption can start, false otherwise.

```
Connector.assertAndConsumeQueue(
    channel, // channel obtained from createChannel method on which the assertion should be sent to RabbitMQ
    queueName, // string with queue name, must be asserted beforehand
    callback, // a function that will manage the received messages (passed as the only parameter)
    prefetch, // how many messages should be prefetched, one by default
    queueOptions // optional queue options, defaults are the same as in assertQueue
);
```

### Publishing helper

Calls `channel.publish` with empty routing key by default and options that make the message persistent (which means it will be stored in case of RabbitMQ shutdown) and it's delivery mandatory (which means that exchange must have a way to route it to a queue, otherwise it will fail and return false).

It is a synchronous method and returns true on successful publish or false if something went wrong.

```
Connector.publishMessage(
    channel, // channel obtained from createChannel method on which the message should be sent to RabbitMQ
    exchange, // string with exchange name, must be asserted beforehand
    message, // string with the message to publish
    routingKey, // optional routing key, empty by default
    options // optional message options, by default the message is persistent and it's delivery is mandatory
);
```
