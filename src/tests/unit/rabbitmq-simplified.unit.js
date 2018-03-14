'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

beforeEach(function() {
  global.timeout = sinon.spy();

  global.FakeAmqp = sinon.stub();
  FakeAmqp.prototype.create = sinon.stub();
  FakeAmqp.connect = sinon.stub();

  global.RabbitMQ = proxyquire('./../../rabbitmq-simplified.js', {
    'synchronous-timeout': timeout,
    amqplib: FakeAmqp,
  });
});

describe('Elasticsearch connector', async function() {
  describe('#Connector.connectToElasticsearch', function() {
    it('Should not wait if not specified', async function() {
      FakeAmqp.connect = sinon.stub();
      FakeAmqp.connect = sinon.stub().returns(Promise.resolve());

      const Connector = new RabbitMQ();
      await Connector.connectToRabbit();

      assert.isFalse(timeout.called);
    });

    it('Should wait for specified amount if specified', async function() {
      FakeAmqp.connect = sinon.stub();
      FakeAmqp.connect = sinon.stub().returns(Promise.resolve());

      const Connector = new RabbitMQ();
      await Connector.connectToRabbit(5000);

      assert.isTrue(timeout.called);
      assert.isTrue(timeout.calledWith(5000));
    });

    it('Should double the wait time for subsequent calls', async function() {
      FakeAmqp.connect = sinon.stub();
      FakeAmqp.connect.onCall(0).returns(Promise.reject({stack: ''}));
      FakeAmqp.connect.onCall(1).returns(Promise.reject({stack: ''}));
      FakeAmqp.connect.returns(Promise.resolve());

      const Connector = new RabbitMQ();
      await Connector.connectToRabbit();

      let firstTimeout = timeout.withArgs(5000);
      let secondTimeout = timeout.withArgs(10000);

      assert.isTrue(firstTimeout.calledOnce);
      assert.isTrue(secondTimeout.calledOnce);
      assert.isTrue(secondTimeout.calledAfter(firstTimeout));
    });

    it('Should try to reconnect if connection failed', async function() {
      let FakeAmqpConnection = {connection: true};

      FakeAmqp.connect = sinon.stub();
      FakeAmqp.connect.onCall(0).returns(Promise.reject({stack: ''}));
      FakeAmqp.connect.returns(Promise.resolve(FakeAmqpConnection));

      const Connector = new RabbitMQ();
      const result = await Connector.connectToRabbit();

      assert.equal(Connector.getConnectionRetryCount(), 1);
      assert.isObject(result);
      assert.equal(FakeAmqpConnection, result);
    });

    it('Should return null if connection retry limit was reached', async function() {
      FakeAmqp.connect = sinon.stub();
      FakeAmqp.connect.onCall(0).returns(Promise.reject({stack: ''}));
      FakeAmqp.connect.returns(Promise.resolve());

      const Connector = new RabbitMQ({maxRabbitConnectionRetries: 0});
      const result = await Connector.connectToRabbit();

      assert.equal(Connector.getConnectionRetryCount(), 0);
      assert.isNull(result);
    });
  });
  describe('#Connector.createChannel', function() {
    it('Should return channel if creation was successful', async function() {
      let FakeRabbitChannel = {channel: true};

      let FakeAmqpConnection = {};
      FakeAmqpConnection.createChannel = sinon.stub().returns(Promise.resolve(FakeRabbitChannel));

      const Connector = new RabbitMQ();
      const result = await Connector.createChannel(FakeAmqpConnection);

      assert.isObject(result);
      assert.equal(FakeRabbitChannel, result);
    });

    it('Should return null if channel could not be created', async function() {
      let FakeAmqpConnection = {};
      FakeAmqpConnection.createChannel = sinon.stub().returns(Promise.reject({stack: ''}));

      const Connector = new RabbitMQ();
      const result = await Connector.createChannel(FakeAmqpConnection);

      assert.isNull(result);
    });
  });
  describe('#Connector.assertExchange', function() {
    it('Should return channel if exchange was successfully asserted', async function() {
      let FakeRabbitChannel = {};
      FakeRabbitChannel.assertExchange = sinon.stub().returns(Promise.resolve(FakeRabbitChannel));

      const Connector = new RabbitMQ();
      const result = await Connector.assertExchange(FakeRabbitChannel, 'exchange');

      assert.isObject(result);
      assert.equal(FakeRabbitChannel, result);
    });

    it('Exchange should be created with given name, direct type and durable option by default', async function() {
      let exchangeName = 'exchange';

      let FakeRabbitChannel = {};
      FakeRabbitChannel.assertExchange = sinon.mock()
        .withArgs(exchangeName, 'direct', {durable: true})
        .returns(Promise.resolve(FakeRabbitChannel));

      const Connector = new RabbitMQ();
      const result = await Connector.assertExchange(FakeRabbitChannel, exchangeName);

      assert.isObject(result);
      assert.equal(FakeRabbitChannel, result);
    });

    it('Exchange should be created with given name, as well as options and type if provided', async function() {
      let exchangeName = 'exchange';
      let exchangeType = 'fanout';
      let exchangeOptions = {durable: false};

      let FakeRabbitChannel = {};
      FakeRabbitChannel.assertExchange = sinon.mock()
        .withArgs(exchangeName, exchangeType, exchangeOptions)
        .returns(Promise.resolve(FakeRabbitChannel));

      const Connector = new RabbitMQ();
      const result = await Connector.assertExchange(FakeRabbitChannel, exchangeName, exchangeType, exchangeOptions);

      assert.isObject(result);
      assert.equal(FakeRabbitChannel, result);
    });

    it('Should return null if exchange couldn\'t be asserted', async function() {
      let FakeRabbitChannel = {};
      FakeRabbitChannel.assertExchange = sinon.stub().returns(Promise.reject({stack: ''}));

      const Connector = new RabbitMQ();
      const result = await Connector.assertExchange(FakeRabbitChannel, 'exchange');

      assert.isNull(result);
    });
  });
  describe('#Connector.assertQueue', function() {
    it('Should return channel if queue was successfully asserted', async function() {
      let FakeRabbitChannel = {};
      FakeRabbitChannel.assertQueue = sinon.stub().returns(Promise.resolve(FakeRabbitChannel));

      const Connector = new RabbitMQ();
      const result = await Connector.assertQueue(FakeRabbitChannel, 'queue');

      assert.isObject(result);
      assert.equal(FakeRabbitChannel, result);
    });

    it('Queue should be created with given name and option to be durable by default', async function() {
      let queueName = 'queue';

      let FakeRabbitChannel = {};
      FakeRabbitChannel.assertQueue = sinon.mock()
        .withArgs(queueName, {durable: true})
        .returns(Promise.resolve(FakeRabbitChannel));

      const Connector = new RabbitMQ();
      const result = await Connector.assertQueue(FakeRabbitChannel, queueName);

      assert.isObject(result);
      assert.equal(FakeRabbitChannel, result);
    });

    it('Queue should be created with given name, as well as options if provided', async function() {
      let queueName = 'exchange';
      let queueOptions = {durable: false};

      let FakeRabbitChannel = {};
      FakeRabbitChannel.assertQueue = sinon.mock()
        .withArgs(queueName, queueOptions)
        .returns(Promise.resolve(FakeRabbitChannel));

      const Connector = new RabbitMQ();
      const result = await Connector.assertQueue(FakeRabbitChannel, queueName, queueOptions);

      assert.isObject(result);
      assert.equal(FakeRabbitChannel, result);
    });

    it('Should return null if queue couldn\'t be asserted', async function() {
      let FakeRabbitChannel = {};
      FakeRabbitChannel.assertQueue = sinon.stub().returns(Promise.reject({stack: ''}));

      const Connector = new RabbitMQ();
      const result = await Connector.assertQueue(FakeRabbitChannel, 'queue');

      assert.isNull(result);
    });
  });
  describe('#Connector.bindQueueToExchange', function() {
    it('Should return channel if queue was successfully bound to exchange', async function() {
      let FakeRabbitChannel = {};
      FakeRabbitChannel.bindQueue = sinon.stub().returns(Promise.resolve(FakeRabbitChannel));

      const Connector = new RabbitMQ();
      const result = await Connector.bindQueueToExchange(FakeRabbitChannel, 'queue', 'exchange');

      assert.isObject(result);
      assert.equal(FakeRabbitChannel, result);
    });

    it('Queue should be bound to exchange with empty routing key by default', async function() {
      let queueName = 'queue';
      let exchangeName = 'exchange';

      let FakeRabbitChannel = {};
      FakeRabbitChannel.bindQueue = sinon.mock()
        .withArgs(queueName, exchangeName, '')
        .returns(Promise.resolve(FakeRabbitChannel));

      const Connector = new RabbitMQ();
      const result = await Connector.bindQueueToExchange(FakeRabbitChannel, queueName, exchangeName);

      assert.isObject(result);
      assert.equal(FakeRabbitChannel, result);
    });

    it('Queue should be bound to exchange with given routing key if given', async function() {
      let queueName = 'queue';
      let exchangeName = 'exchange';
      let routingKey = 'routing';

      let FakeRabbitChannel = {};
      FakeRabbitChannel.bindQueue = sinon.mock()
        .withArgs(queueName, exchangeName, routingKey)
        .returns(Promise.resolve(FakeRabbitChannel));

      const Connector = new RabbitMQ();
      const result = await Connector.bindQueueToExchange(FakeRabbitChannel, queueName, exchangeName, routingKey);

      assert.isObject(result);
      assert.equal(FakeRabbitChannel, result);
    });

    it('Should return null if queue couldn\'t be bound to exchange', async function() {
      let FakeRabbitChannel = {};
      FakeRabbitChannel.bindQueue = sinon.stub().returns(Promise.reject({stack: ''}));

      const Connector = new RabbitMQ();
      const result = await Connector.bindQueueToExchange(FakeRabbitChannel, 'queue', 'exchange');

      assert.isNull(result);
    });
  });
  describe('#Connector.assertAndConsumeQueue', function() {
    it('Should prefetch one message by default', async function() {
      let queueName = 'queue';

      let FakeRabbitChannel = {};
      FakeRabbitChannel.assertQueue = sinon.stub().returns(Promise.resolve(FakeRabbitChannel));
      FakeRabbitChannel.consume = sinon.stub().returns(Promise.resolve(FakeRabbitChannel));
      FakeRabbitChannel.prefetch = sinon.spy().withArgs(1);

      const Connector = new RabbitMQ();
      await Connector.assertAndConsumeQueue(FakeRabbitChannel, queueName, function() {});
    });

    it('Should prefetch given number of message if provided', async function() {
      let queueName = 'queue';

      let FakeRabbitChannel = {};
      FakeRabbitChannel.assertQueue = sinon.stub().returns(Promise.resolve(FakeRabbitChannel));
      FakeRabbitChannel.consume = sinon.stub().returns(Promise.resolve(FakeRabbitChannel));
      FakeRabbitChannel.prefetch = sinon.spy().withArgs(5);

      const Connector = new RabbitMQ();
      await Connector.assertAndConsumeQueue(FakeRabbitChannel, queueName, function() {}, 5);
    });
  });
});
