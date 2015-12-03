var compose = require('101/compose')
var exists = require('101/exists')
var Joi = require('joi')
var pluck = require('101/pluck')

Joi = require('./lib/joi-rabbit.js')(Joi)

var isExchange = compose(exists, pluck('exchange'))
var isQueue = compose(exists, pluck('queue'))

module.exports = Schema

class Schema {
  /**
   * create a rabbitmq messaging schema
   * @param  {Object} json json representation of a schema
   * @return {RabbitSchema} new rabbitmq schema instance
   */
  constructor(json) {
    this.json = Schema.validate(json)
  }
  /**
   * validate rabbitmq json messaging schema
   * @param  {Object} json json representation of a schema
   * @throws {JoiSchema} validationErr If value does not pass schema validation
   */
  static validate(json) {
    json = Joi.assert(json, Joi.rabbitElement().required())

    if (json.exchange) {
      json = Joi.assert(json, Joi.rabbitExchange().required())
    } else { // json.queue === true
      json = Joi.assert(json, Joi.rabbitQueue().required())
    }

    return json
  }
  /**
   * get all exchanges in the schema
   * @return {Array} array of exchange schemas
   */
  getExchanges() {
    if (this._exchanges) {
      // cache hit
      return this._exchanges
    }
    var exchanges =
    this._exchanges = // cache
      this._getElements.filter(isExchange)

    return exchanges
  }
  /**
   * get all queues in the schema
   * @return {Array} array of queue schemas
   */
  getQueues() {
    if (this._queues) {
      // cache hit
      return this._queues
    }
    var queues =
    this._queues = // cache
      this._getElements.filter(isQueue)

    return queues
  }
  /**
   * get all elements ( exchanges and queues) in the schema
   * @return {Array} array of exchange schemas
   */
  _getElements() {
    if (this._elements) {
      // cache hit
      return this._elements
    }
    this._elements = []
    pushElement(this.json)
    function pushElement (element) {
      this._elements.push(element)
      if (element.bindings) {
        element.bindings.forEach(pushElement)
      }
    }
  }
}
