var compose = require('101/compose')
var exists = require('101/exists')
var indexBy = require('101/index-by')
var pluck = require('101/pluck')

var jsonValidator = require('./json-validator.js')
var topicPatternTest = require('./topic-pattern-test')

var directExchangeSchema = require('./json-schemas/direct-exchange.js')
var fanoutExchangeSchema = require('./json-schemas/fanout-exchange.js')
var topicExchangeSchema = require('./json-schemas/topic-exchange.js')
var topologySchema = require('./json-schemas/topology.js')
var queueSchema = require('./json-schemas/queue.js')

var isExchange = compose(exists, pluck('exchange'))
var isQueue = compose(exists, pluck('queue'))
var values = function (obj) {
  return Object.keys(obj).map(function (key) {
    return obj[key]
  })
}

module.exports = Schema

/**
 * create a rabbitmq messaging schema
 * @constructor
 * @param  {Object} json json representation of a schema
 * @return {RabbitSchema} new rabbitmq schema instance
 */
function Schema (json) {
  this.json = Schema.validate(json)
}
/**
 * validate rabbitmq topology json
 * @param  {Object} json json representation of a schema
 * @throws {SchemaValidationError} validationErr If value does not pass schema validation
 */
Schema.validate = function (json) {
  jsonValidator(topologySchema, json)

  return json
}

/**
 * validate a rabbitmq queue json
 * @param  {Object} json json representation of a schema
 * @throws {SchemaValidationError} validationErr If value does not pass schema validation
 */
Schema._validateQueue = function (json, _parentPath) {
  jsonValidator(queueSchema, json, _parentPath)

  return json
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

  return json
}

/**
 * get all exchanges in the schema
 * @return {Array} array of exchange schemas
 */
Schema.prototype.getExchanges = function () {
  if (this._exchanges) {
    // cache hit
    return this._exchanges
  }
  var exchanges = this._getElements().filter(isExchange)
  // cache
  this._exchangesByName = indexBy(exchanges, 'exchange')
  this._exchanges = values(this._exchangesByName)

  return this._exchanges
}
/**
 * get all queues in the schema
 * @return {Array} array of queue schemas
 */
Schema.prototype.getQueues = function () {
  if (this._queues) {
    // cache hit
    return this._queues
  }
  var queues = this._getElements().filter(isQueue)
  // cache
  this._queuesByName = indexBy(queues, 'queue')
  this._queues = values(this._queuesByName)

  return this._queues
}

/**
 * get an exchange in the topology by name
 * @return {Object} exchange json w/ name or undefined
 */
Schema.prototype.getExchangeByName = function (name) {
  // cache and index exchanges
  this.getExchanges()

  return this._exchangesByName[name]
}

/**
 * get a queue in the topology by name
 * @return {Object} exchange json w/ name or undefined
 */
Schema.prototype.getQueueByName = function (name) {
  // cache and index queues
  this.getQueues()

  return this._queuesByName[name]
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
    var bindingMatch = (exchange.type === 'direct' && binding.routingKey === routingKey) ||
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
 * get all elements ( exchanges and queues) in the schema
 * @return {Array} array of exchange schemas
 */
Schema.prototype._getElements = function () {
  var self = this
  if (this._elements) {
    // cache hit
    return this._elements
  }
  this._elements = []
  pushElement(this.json)
  function pushElement (element) {
    self._elements.push(element)
    if (element.bindings) {
      element.bindings.forEach(compose(pushElement, pluck('destination')))
    }
  }

  return this._elements
}
