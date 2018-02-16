var ajv = require('ajv')()
var isCircular = require('is-circular')

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

function jsonValidator (schema, value, _parentPath) {
  var dataPath = _parentPath || 'value'

  if (typeof value === 'object' && isCircular(value)) {
    throw new Error("'" + dataPath + "' must not be circular")
  }

  var validate = ajv.compile(schema)

  validate(value)
  validate.value = value

  if (validate.errors) {
    throw new SchemaValidationError(validate, _parentPath)
  }
}
