'use strict';

const timeout = require('@clearcodehq/synchronous-timeout');

const amqp = require('amqplib');

function Connector(userConfig) {
  let rabbitConnectionRetries = 0;

  let config = {
    hostname: process.env.RABBITMQ_HOST,
    username: process.env.RABBITMQ_USER,
    password: process.env.RABBITMQ_PASS,
    port: process.env.RABBITMQ_PORT,
    maxRabbitConnectionRetries: 10,
    retryAfter: 5000,
    retryAfterMultiplier: 2,
  };

  if (userConfig) {
    Object.assign(config, userConfig);
  }

  let retryAfterBase = config.retryAfter;

  async function connectToRabbit(retryAfter) {
    console.log('Connecting to RabbitMQ');

    if (retryAfter) {
      await timeout(retryAfter);
      retryAfterBase *= config.retryAfterMultiplier;
    }

    return amqp.connect({
      hostname: config.hostname,
      username: config.username,
      password: config.password,
      port: config.port,
    })
      .then(function(connection) {
        console.log('Connected to RabbitMQ');

        rabbitConnectionRetries = 0;
        retryAfterBase = config.retryAfter;

        return connection;
      })
      .catch(function(exception) {
        console.warn('RabbitMQ connection error', exception.stack);
        if (rabbitConnectionRetries === config.maxRabbitConnectionRetries) {
          console.error(
            `Maximum connection retries of ${config.maxRabbitConnectionRetries} to RabbitMQ reached, dying.`
          );
          return null;
        } else {
          console.warn(`Retrying connection to RabbitMQ after delay of ${retryAfterBase} ms`);
          rabbitConnectionRetries++;
          return connectToRabbit(retryAfterBase);
        }
      });
  }

  async function createChannel(rabbit) {
    return await rabbit.createChannel()
      .then(function(channel) {
        console.log('Channel created');
        return channel;
      })
      .catch(function(exception) {
        console.error('Could not create a channel to RabbitMQ', exception.stack);
        return null;
      });
  }

  async function assertExchange(channel, exchange, exchangeType, exchangeOptions) {
    return channel.assertExchange(exchange, exchangeType || 'direct', exchangeOptions || {durable: true})
      .then(function() {
        console.log(`Exchange ${exchange} obtained`);
        return channel;
      })
      .catch(function(exception) {
        console.error(`Could not obtain an exchange named ${exchange} from RabbitMQ`, exception.stack);
        return null;
      });
  }

  async function assertQueue(channel, queue, queueOptions) {
    return channel.assertQueue(queue, queueOptions || {durable: true})
      .then(function() {
        console.log(`Queue ${queue} obtained`);
        return channel;
      })
      .catch(function(exception) {
        console.error(`Could not obtain a queue named ${queue} from RabbitMQ`, exception.stack);
        return null;
      });
  }

  async function bindQueueToExchange(channel, queue, exchange, routingKey) {
    return channel.bindQueue(queue, exchange, routingKey || '')
      .then(function() {
        console.log(`Queue ${queue} bound to exchange ${exchange}`);
        return channel;
      })
      .catch(function(exception) {
        console.error(`Could not bind queue ${queue} to exchange ${exchange} in RabbitMQ`, exception.stack);
        return null;
      });
  }

  async function assertAndConsumeQueue(channel, queue, callback, prefetch, queueOptions) {
    channel = await assertQueue(channel, queue, queueOptions);
    if (channel === null) {
      return false;
    }
    await channel.prefetch(prefetch || 1);
    await channel.consume(queue, callback);
    return true;
  }

  function publishMessage(channel, exchange, message, routingKey, options) {
    return channel.publish(
      exchange,
      routingKey || '',
      Buffer.from(message),
      options || {persistent:true,mandatory:true}
    );
  }

  function getConnectionRetryCount() {
    return rabbitConnectionRetries;
  }

  function getActiveRetryAfterValue() {
    return retryAfterBase;
  }

  this.connectToRabbit = connectToRabbit;
  this.createChannel = createChannel;
  this.assertExchange = assertExchange;
  this.assertQueue = assertQueue;
  this.bindQueueToExchange = bindQueueToExchange;
  this.assertAndConsumeQueue = assertAndConsumeQueue;
  this.getConnectionRetryCount = getConnectionRetryCount;
  this.publishMessage = publishMessage;
  this.getActiveRetryAfterValue = getActiveRetryAfterValue;
}

module.exports = Connector;
