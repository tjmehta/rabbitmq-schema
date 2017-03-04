# rabbitmq-schema [![Build Status](https://travis-ci.org/tjmehta/rabbitmq-schema.svg?branch=master)](https://travis-ci.org/tjmehta/rabbitmq-schema) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
A schema definition module for RabbitMQ topologies

# Installation
```bash
npm install rabbitmq-schema
```

# Usage Summary
```js
var RabbitSchema = require('rabbitmq-schema')
// Validate your rabbit topology by instantiating a RabbitSchema
var schema = new RabbitSchema({
  exchange: 'exchange0', // exchange name
  type: 'direct',        // exchange type
  options: {}            // optional, assert or check exchange options
  bindings: {
    routingPattern: 'foo.bar.key', // required for direct and topic exchanges
    destination: {
      queue: 'queue0',         // queue name
      messageSchema: {}        // json-schema to validate messages w/, http://json-schema.org
    },
    args: {}                   // optional, binding args
  }
})
// Get all exchanges in the topology,
//   returned exchanges are RabbitSchema instances
var exchanges = schema.getExchanges()
var exchange = exchange[0]
exchange.exchange // name
exchange.options  // exchange options (for assert or check)
exchange.getDirectBindings() // direct child bindings, explained below
exchange.getQueues() // child queues
exchanges.getExchanges() // self and child exchanges
// Get all queues in the topology,
//   returned queues are RabbitSchema instances
var queues = schema.getQueues()
var queue = queues[0]
queue.queue   // name
queue.options // queue options
queue.messageSchema // queue message "json-schema", http://json-schema.org
// Get all bindings in the topology,
//   returned bindings contain `source` and `destination` RabbitSchema instances
var bindings = schema.getBindings()
var binding = bindings[0]
binding.source // source exchange, RabbitSchema
binding.destination // destination exchange or queue, RabbitSchema
binding.routingPattern // routing pattern for direct or topic queue
// Get direct bindings in the topology,
//   returned bindings contain `source` and `destination` RabbitSchema instances
var directBindings = schema.getDirectBindings() // [ /* queue0 */ ]
// Get a queue by name (in entire topology),
//   returns queue RabbitSchema
var queue = schema.getQueueByName('queue0')
// Get an exchange by name (in entire topology),
//   returns exchange RabbitSchema
var queue = schema.getExchangeByName('exchange0')
// Validate a message by exchange and routingKey
//   will find all queues the message makes it to
//   and validate the message against all the `messageSchema`s
schema.validateMessage('exchange0', 'foo.bar.key', { foo: 1 })
// Also works with direct queues, by providing queue name
schema.validateMessage('queue0', { foo: 1 })
```

# Usage
## Validate RabbitMQ Elements
### Validate a Queue
* Requires queue name and messageSchema
```js
var RabbitSchema = require('rabbitmq-schema')

var queueSchema = new RabbitSchema({
  queue: 'queue-name', // queue name, required
  messageSchema: { // "json-schema" for validating queue messages
    type: 'object'
    // ...other properties supported by json-schema draft-04...
    // http://json-schema.org
  },
  options: {} // queue options, optional
})
```

### Validate a Direct Exchange
* Requires exchange name, type, and atleast one binding
* Requires all bindings have `routingPattern`
```js
var RabbitSchema = require('rabbitmq-schema')

var directExchangeSchema = new RabbitSchema({
  exchange: 'direct-exchange-name', // exchange name, required
  type: 'direct',  // required to be direct, topic, or fanout
  bindings: [{     // atleast 1 binding is required for every exchange
    routingPattern: 'foo.bar', // direct exchanges require bindings w/ a routingPattern
    destination: queueSchema,  // all bindings require a destination (queue or exchange schema)
    args: {}                   // binding args, optional
  }],
  options: {} // exchange options, optional
})
```

### Validate a Topic Exchange
* Requires exchange name, type, and atleast one binding
* Requires all bindings have `routingPattern`
* Also works with arrays of parallel, nested, connected topologies (see `altSchema` in example below)
```js
var RabbitSchema = require('rabbitmq-schema')

// validate a direct exchange topology
var topicExchangeSchema = new RabbitSchema({
  exchange: 'topic-exchange-name', // exchange name, required
  type: 'topic',  // required to be direct, topic, or fanout
  bindings: [{     // atleast 1 binding is required for every exchange
    routingPattern: 'foo.*', // topic exchanges require bindings w/ a routingPattern
    destination: queueSchema // all bindings require a destination (queue or exchange schema)
    args: {}                 // binding args, optional
  }],
  options: {} // exchange options, optional
})
```

### Validate a Fanout Exchange
* Requires exchange name, type, and atleast one binding
```js
var RabbitSchema = require('rabbitmq-schema')

var fanoutExchangeSchema = new RabbitSchema({
  exchange: 'fanout-exchange-name', // exchange name, required
  type: 'fanout',  // required to be direct, topic, or fanout
  bindings: [{     // atleast 1 binding is required for every exchange
    destination: queueSchema, // all bindings require a destination (queue or exchange schema)
    args: {}                  // binding args, optional
  }],
  options: {} // exchange options, optional
})
```

## Validate full RabbitMQ Topology
* Validates all elements for required properties and types
* Validates topology to not be circular
* Validates topology for duplicates

### Validate a full Topology
```js
var RabbitSchema = require('rabbitmq-schema')

var foobarQueue = {
  queue: 'foobar-name', // queue name, required
  messageSchema: { // "json-schema" for validating queue messages
    type: 'object',
    properties: {
      foo: { type: 'string' }
    },
    required: ['foo']
    // ...other properties supported by json-schema draft-04...
    // http://json-schema.org
  }
}

var fooquxQueue = {
  queue: 'fooqux-name', // queue name, required
  messageSchema: { // "json-schema" for validating queue messages
    type: 'string'
    // ...other properties supported by json-schema draft-04...
    // http://json-schema.org
  },
  options: {} // queue options, optional
}

var foobarExchange = {
  exchange: 'foobar-direct-exchange', // exchange name, required
  type: 'direct',  // required to be direct, topic, or fanout
  bindings: [{     // atleast 1 binding is required for every exchange
    routingPattern: 'foo.bar', // direct exchanges require bindings w/ a routingPattern
    destination: foobarQueue,  // all bindings require a destination (queue or exchange schema)
    args: {}                   // binding args, optional
  }],
  options: {} // exchange options, optional
}

var fooquxExchange = {
  exchange: 'fooqux-direct-exchange', // exchange name, required
  type: 'direct',  // required to be direct, topic, or fanout
  bindings: [{     // atleast 1 binding is required for every exchange
    routingPattern: 'foo.qux', // direct exchanges require bindings w/ a routingPattern
    destination: fooquxQueue,  // all bindings require a destination (queue or exchange schema)
    args: {}                   // binding args, optional
  }],
  options: {} // exchange options, optional
}

var foostarExchange = {
  exchange: 'foostar-topic-exchange', // exchange name, required
  type: 'topic',  // required to be direct, topic, or fanout
  bindings: [{     // atleast 1 binding is required for every exchange
    routingPattern: 'foo.*',    // topic exchanges require bindings w/ a routingPattern
    destination: foobarExchange,// all bindings require a destination (queue or exchange schema)
    args: {}                    // binding args, optional
  }],
  options: {} // exchange options, optional
}

var fullSchema = new RabbitSchema(foostarExchange) // full nested, connected topology

// also works with parallel, nested, disconnected topologies

var altSchema = new RabbitSchema([
  {
    exchange: 'some-exchange',
    type: 'direct',
    bindings: [{
      routingPattern: 'foo.bar',
      destination: foobarQueue
    }]
  },
  {
    exchange: 'some-exchange3',
    type: 'topic',
    bindings: [{
      routingPattern: 'foo.*',
      destination: fooquxQueue
    }]
  }
])
```

### Validate a message (by traversing topology or direct queue)
Traverse topology to destination queue(s) example
```js
// uses `fullSchema` from full topology snippet above
var exchangeName = 'foostar-topic-exchange'
var routingKey = 'foo.bar'
var message = {}
fullSchema.validateMessage(exchangeName, routingKey, message)
// foostarExchange -> foobarExchange -> foobarQueue (requires an object w/ property `foo`)
// throws SchemaValidationError "'json' should have required property 'foo'"
```
Throw an error if the message does not reach any destination queues
```js
Traverse exchange to correct queue example1
// uses `fullSchema` from full topology snippet above
var exchangeName = 'foostar-topic-exchange'
var routingKey = 'no.way.out'
var message = {}
fullSchema.validateMessage(exchangeName, routingKey, message)
// foostarExchange -> _nowhere_
// throws Error "message did not reach any queues"
```
Direct queue example
```js
// uses `fullSchema` from full topology snippet above
var queueName = 'fooqux-queue'
var message = {}
fullSchema.validateMessage(queueName, message)
// fooquxQueue (requires an object w/ property `foo`)
// throws SchemaValidationError "'json' should be a 'string'"
```
Throws an error if the queue/exchange does not exist
```js
// uses `fullSchema` from full topology snippet above
var queueName = 'nonexistant-queue'
var message = {}
fullSchema.validateMessage(queueName, message)
// throws Error "queue with name 'nonexistant-queue' does not exist"
var exchangeName = 'nonexistant-exchange'
var routingKey = 'foo.bar'
fullSchema.validateMessage(exchangeName, routingKey, message)
// throws Error "exchange with name 'nonexistant-exchange' does not exist"
```

### List Exchanges (w/ bindings) and Queues
* `rabbitSchema.getExchanges()` returns all exchanges found in schema
* `rabbitSchema.getQueues()` returns all queues in schema
* `rabbitSchema.getBindings()` returns all exchange bindings in schema (including an added source property)
* Each item in the lists are schemas themselves
* Easily list all exchanges and queues for assertions or checks
```js
var amqplib = require('amqplib')
var callbackCount = require('callback-count')

amqplib.connect('amqp://192.168.99.100:32771', function (err, conn) {
  conn.createChannel(function (channel) {
    // connected to rabbitmq, assert all the things
    assertExchanges(channel, fullSchema, function (err) {
      if (err) { throw err }
      assertQueues(channel, fullSchema, function (err) {
        if (err) { throw err }
        assertBindings(channel, fullSchema, function (err) {
          if (err) { throw err }
        })
      })
    })
  })
})
// assert all exchanges in the schema
function assertExchanges (channel, fullSchema, cb) {
  var count = callbackCount(exchanges.length, cb)
  var exchanges = fullSchema.getExchanges()

  exchanges.forEach(function (exchange) {
    var name = exchange.exchange
    var type = exchange.type
    var opts = exchange.options
    channel.assertExchange(name, type, opts, count.next)
  })
}
// assert all queues in the schema
function assertQueues (channel, fullSchema, cb) {
  var count = callbackCount(queues.length, cb)
  var queues = fullSchema.getQueues()

  queues.forEach(function (queue) {
    var name = queue.queue
    var opts = exchange.options
    channel.assertQueue(name, opts, count.next)
  })
}
// assert all bindings in the schema
function assertBindings (channel, fullSchema, cb) {
  var count = callbackCount(exchanges.length, cb)
  var bindings = fullSchema.getBindings()

  bindings.forEach(function (binding) {
    // source is always an exchange
    var srcName = bindings.source.exchange
    var destName

    if (bindings.destination.exchange) {
      // destination is an exchange
      destName = binding.destination.exchange
      channel.bindQueue(destName, srcName, binding.args)
    } else {
      // destination is a queue
      destName = binding.destination.queue
      channel.bindQueue(destName, srcName, binding.args)
    }
  })
}
```

### Get a Queue or Exchange by Name
```js
// uses `fullSchema` from full topology snippet above
var foobarQueue = fullSchema.getQueueByName('foobar-name')
var foobarExchange = fullSchema.getExchangeByName('foobar-name')
```

# License
MIT
