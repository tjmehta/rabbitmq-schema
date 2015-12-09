var ajv = require('ajv')()
var isCircular = require('is-circular')
var isObject = require('101/is-object')

var SchemaValidationError = require('./schema-validation-error')

var directExchangeSchema = require('./json-schemas/direct-exchange.js')
var fanoutExchangeSchema = require('./json-schemas/fanout-exchange.js')
var queueSchema = require('./json-schemas/queue.js')
var topicExchangeSchema = require('./json-schemas/topic-exchange.js')
var topologySchema = require('./json-schemas/topology.js')

// resolves circular refs
ajv.addSchema([
  topologySchema,
  queueSchema,
  directExchangeSchema,
  fanoutExchangeSchema,
  topicExchangeSchema
])

module.exports = jsonValidator

function jsonValidator (schema, data, _parentPath) {
  var dataPath = _parentPath || 'json'

  if (!isObject(data)) {
    throw new TypeError("'" + dataPath + "' must be an object")
  }
  if (isCircular(data)) {
    throw new Error("'" + dataPath + "' must not be circular")
  }
  var validate = ajv.compile(schema)

  validate(data)
  validate.data = data

  if (validate.errors) {
    throw new SchemaValidationError(validate, _parentPath)
  }
}
