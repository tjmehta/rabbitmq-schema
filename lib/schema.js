require('set-prototype-of') // polyfill

var assert = require('assert')
var util = require('util')

var assign = require('101/assign')
var compose = require('101/compose')
var clone = require('101/clone')
var deepFreeze = require('deep-freeze')
var exists = require('101/exists')
var forEach = require('object-loops/for-each')
var isObject = require('101/is-object')
var map = require('object-loops/map')
var noop = require('101/noop')
var pluck = require('101/pluck')
var pick = require('101/pick')

var jsonValidator = require('./json-validator.js')
var topicPatternTest = require('./topic-pattern-test')

var directExchangeSchema = require('./json-schemas/direct-exchange.js')
var fanoutExchangeSchema = require('./json-schemas/fanout-exchange.js')
var topicExchangeSchema = require('./json-schemas/topic-exchange.js')
var topologySchema = require('./json-schemas/topology.js')
var queueSchema = require('./json-schemas/queue.js')

var isExchange = compose(exists, pluck('exchange'))
var isQueue = compose(exists, pluck('queue'))
function staticProperty (obj, key, val) {
  Object.defineProperty(obj, key, {
    enumerable: false,
    configurable: false,
    writable: false,
    value: val
  })
}

module.exports = Schema

/**
 * create a rabbitmq topology schema
 * @constructor
 * @param  {Object} value json representation of a schema
 * @return {RabbitSchema} new rabbitmq schema instance
 */
function Schema (value) {
  var self = this

  if (!(this instanceof Schema)) {
    return new Schema(value)
  }
  if (value instanceof Schema) {
    return createCopy(value)
  }

  value = clone(value)
  Schema.validate(value)

  setProperties(value)

  function setProperties (value, children) {
    // set instance properties
    // set _isArray if value is an array
    if (Array.isArray(value)) {
      staticProperty(self, '_isArray', true)
      staticProperty(self, 'length', value.length)
      value = value.map(SubSchema)
    }
    // copy json properties
    assign(self, value)
    // all children queues and exchanges
    children = children || Schema._getChildren(self)
    staticProperty(self, '_queues', children.queues)
    staticProperty(self, '_exchanges', children.exchanges)
    // queues and exchanges indexed by name
    staticProperty(self, '_queuesByName', children.queuesByName)
    staticProperty(self, '_exchangesByName', children.exchangesByName)
    // freeze the object
    deepFreeze(self)
  }
  function createCopy (schema) {
    var children = {
      queues: schema._queues,
      exchanges: schema._exchanges,
      queuesByName: schema._queuesByName,
      exchangesByName: schema._exchangesByName
    }

    setProperties(schema.toJSON(), children)

    return self
  }
}
/**
 * validate rabbitmq topology json
 * @param  {Object} value json representation of a schema
 * @throws {SchemaValidationError} validationErr If value does not pass schema validation
 */
Schema.validate = function (value) {
  if (Array.isArray(value)) {
    // note(tj): I did not use a json-schema that handles array
    // bc it would use "oneOf:[..refs..]" which results in
    // error messages relative paths
    value.forEach(function (item, i) {
      jsonValidator(topologySchema, item, '[' + i + ']')
    })
  } else if (isObject(value)) {
    jsonValidator(topologySchema, value)
  } else {
    throw new TypeError("'value' must be an object or array")
  }
}
/**
 * validate a rabbitmq queue json
 * @param  {Object} json json representation of a schema
 * @throws {SchemaValidationError} validationErr If value does not pass schema validation
 */
Schema._validateQueue = function (value, _parentPath) {
  jsonValidator(queueSchema, value, _parentPath)
}

/**
 * validate a rabbitmq exchange json
 * @param  {Object} json json representation of a schema
 * @throws {SchemaValidationError} validationErr If value does not pass schema validation
 */
Schema._validateExchange = function (json, _parentPath) {
  var SchemaValidationError = require('./schema-validation-error')

  if (json.type === 'direct') {
    jsonValidator(directExchangeSchema, json, _parentPath)
  } else if (json.type === 'topic') {
    jsonValidator(topicExchangeSchema, json, _parentPath)
  } else if (json.type === 'fanout') {
    jsonValidator(fanoutExchangeSchema, json, _parentPath)
  } else {
    var currPath = _parentPath
      ? _parentPath + '.type'
      : 'type'

    var message = [
      "'", currPath, "' must be direct, topic, or fanout"
    ].join('')
    throw new SchemaValidationError(message)
  }
}
/**
 * get and cast children (bindings) elements to schema instances
 * @return {Object} children { queues, exchanges, bindings }
 */
Schema._getChildren = function (schema) {
  var children = {
    queues: [],
    exchanges: [],
    queuesByName: {},
    exchangesByName: {}
  }
  var schemas

  if (schema._isArray) {
    schemas = schema // schema is array of schemas
    forEach(schemas, function (schema) {
      schema._queues.forEach(pushQueue)
      schema._exchanges.forEach(pushExchange)
    })
  } else {
    indexChildren(schema)
  }
  // gets children from schema
  function indexChildren (schema) {
    if (isExchange(schema)) {
      schema.bindings.forEach(function (binding) {
        var dest = new SubSchema(binding.destination)

        if (isExchange(dest)) {
          // binding destination is an exchange
          dest._queues.forEach(pushQueue)
          dest._exchanges.forEach(pushExchange)
          pushExchange(dest)
        } else {
          // binding destination is a queue
          pushQueue(dest)
        }
      })
      // push self to validate options
      pushExchange(schema)
    } else { // isQueue(schema) === true
      pushQueue(schema)
    }
  }
  /**
   * push exchange to children exchanges and index by name
   * if a identical exchange is found verify the options and bindings match
   * @param  {Schema} exchange child exchange schema
   */
  function pushExchange (exchange) {
    var name = exchange.exchange
    var identical = children.exchangesByName[name]

    if (identical) {
      // identical exchange found, verify opts match
      assert.deepStrictEqual(
        identical.options || {},
        exchange.options || {},
        "'" + name + "' exchange is defined multiple times with mismatched options")
      // verify bindings match
      assert.deepStrictEqual(
        identical.bindings,
        exchange.bindings,
        "'" + name + "' exchange is defined multiple times with mismatched bindings")
    } else {
      // only push unique children
      children.exchanges.push(exchange)
      children.exchangesByName[name] = exchange
    }
  }
  /**
   * push queue to children queues and index by name
   * if a identical queue is found verify the options and bindings match
   * @param  {Schema} queue child queue schema
   */
  function pushQueue (queue) {
    var name = queue.queue
    var identical = children.queuesByName[name]

    if (identical) {
      // identical queue found, verify opts match
      assert.deepStrictEqual(
        identical.options || {},
        queue.options || {},
        "'" + name + "' queue is defined multiple times with mismatched options")
    } else {
      // only push unique children
      children.queues.push(queue)
      children.queuesByName[name] = queue
    }
  }

  return children
}
/**
 * get all exchanges in the schema
 * @return {Array} array of exchange schemas
 */
Schema.prototype.getExchanges = function () {
  return this._exchanges.map(Schema)
}
/**
 * get all queues in the schema
 * @return {Array} array of queue schemas
 */
Schema.prototype.getQueues = function () {
  return this._queues.map(Schema)
}
/**
 * get all exhcnage bindings in the schema
 *   returned array will include additional property "source"
 *   both "source" and "destination" will be casted to schemas
 * @return {Array} array of exchange bindings
 */
Schema.prototype.getBindings = function () {
  var self = this

  return this.getExchanges().reduce(function (bindings, exchange) {
    var newBindings = exchange.bindings.map(function (binding) {
      var dest = binding.destination

      dest = isExchange(dest)
        ? self.getExchangeByName(dest.exchange)
        : self.getQueueByName(dest.queue)

      return assign(pick(binding, ['args', 'routingPattern']), {
        source: new Schema(exchange),
        destination: dest
      })
    })

    return bindings.concat(newBindings)
  }, [])
}
/**
 * get direct bindings from root of the schema
 *   returned array will include additional property "source"
 *   both "source" and "destination" will be casted to schemas
 * @return {Array} array of root exchange bindings
 */
Schema.prototype.getDirectBindings = function () {
  var self = this
  var bindings = this.bindings || [] // json bindings

  return bindings.map(function (binding) {
    var dest = binding.destination
    dest = isExchange(dest)
      ? self.getExchangeByName(dest.exchange)
      : self.getQueueByName(dest.queue)

    return assign(pick(binding, ['args', 'routingPattern']), {
      source: new Schema(self),
      destination: dest
    })
  })
}
/**
 * get an exchange in the topology by name
 * @return {Object} exchange json w/ name or undefined
 */
Schema.prototype.getExchangeByName = function (name) {
  var exchange = (name === this.exchange)
    ? this
    : this._exchangesByName[name]

  if (exchange) {
    return new Schema(exchange)
  }
}
/**
 * get a queue in the topology by name
 * @return {Object} exchange json w/ name or undefined
 */
Schema.prototype.getQueueByName = function (name) {
  var queue = (name === this.queue)
    ? this
    : this._queuesByName[name]

  if (queue) {
    return new Schema(queue)
  }
}
/**
 * traverse topology and ensure message is valid w/ all destination queues
 * @param  {String} [exchangeName] exchange name (defaults as '', direct exchange)
 * @param  {String} routingKey   routingKey or queueName
 * @param  {*} message      message to be validated
 */
Schema.prototype.validateMessage = function (exchangeName, routingKey, message) {
  var queue
  var exchange

  if (arguments.length === 2) {
    // (routingKey, message)
    message = routingKey
    routingKey = exchangeName
    exchangeName = null
  }
  exchangeName = exchangeName || ''

  if (exchangeName === '') {
    // direct queue messaging
    queue = this.getQueueByName(routingKey)
    if (!queue) {
      throw new Error('queue with name "' + routingKey + '" does not exist')
    }
    this._queueValidateMessage(queue, message)
  } else {
    // traverse topology
    exchange = this.getExchangeByName(exchangeName)
    if (!exchange) {
      throw new Error('exchange with name "' + exchangeName + '" does not exist')
    }
    this._exchangeValidateMessage(exchange, routingKey, message)
  }

  return message
}
/**
 * traverse exchange and ensure message is valid w/ all destination queues
 * @param  {Object} exchange exchange json
 * @param  {String} routingKey   routingKey or queueName
 * @param  {*} message      message to be validated
 */
Schema.prototype._exchangeValidateMessage = function (exchange, routingKey, message, _parentPath, _state) {
  _state = _state || {
    noDestinationQueuesFound: true
  }

  var self = this
  var currPath = _parentPath
    ? (_parentPath + '.' + exchange.exchange)
    : exchange.exchange

  exchange.bindings.forEach(function (binding) {
    var dest = binding.destination
    var bindingMatch = (exchange.type === 'direct' && binding.routingPattern === routingKey) ||
      (exchange.type === 'topic' && topicPatternTest(binding.routingPattern, routingKey)) ||
      (exchange.type === 'fanout')

    if (!bindingMatch) { return }

    if (dest.exchange) {
      // dest is an exchange
      self._exchangeValidateMessage(dest, routingKey, message, currPath, _state)
    } else {
      // dest is a queue
      self._queueValidateMessage(dest, message, currPath, _state)
    }
  })

  if (!_parentPath && _state.noDestinationQueuesFound) {
    // _exchangeValidateMessage finished without finding destination queues
    throw new Error('message did not reach any queues')
  }

  return message
}
/**
 * ensure message is valid w/ queue
 * @param  {Object} queue queue json
 * @param  {*} message      message to be validated
 */
Schema.prototype._queueValidateMessage = function (queue, message, _parentPath, _state) {
  _state = _state || {
    noDestinationQueuesFound: true
  }

  var currPath = _parentPath
    ? (_parentPath + '.' + queue.queue)
    : queue.queue
  currPath += '.messageSchema'
  _state.noDestinationQueuesFound = false

  try {
    jsonValidator(queue.messageSchema, message)
  } catch (err) {
    // catch error to modify error.message
    err.message = err.message + ' (' + currPath + ')'
    throw err
  }
}
/**
 * return schema as original json value
 */
Schema.prototype.toJSON = function () {
  // iterate over enumerable and return an object
  return map(this, function (val) {
    return clone(val)
  })
}

/**
 * SubSchemas are schemas that do not validate their value
 * because the value is validated by parent schema
 */
function SubSchema (value) {
  if (!(this instanceof SubSchema)) {
    return new SubSchema(value)
  }
  Schema.apply(this, arguments)
}

util.inherits(SubSchema, Schema)

SubSchema.prototype.validate = noop
