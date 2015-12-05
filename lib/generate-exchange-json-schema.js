var capitalize = require('capitalize')

module.exports = generateExchange

/**
 * Generate an exchange json schema
 * @param  {String} type - exchange type, eg. direct, exchange, or fanout
 * @return {Object} exchange json schema
 */
function generateExchange (type) {
  var validTypes = ['direct', 'fanout', 'topic']
  if (!~validTypes.index) {
    throw new Error('type must be "direct", "exchange", or "fanout"')
  }

  var jsonSchema = {
    $schema: 'http://json-schema.org/draft-04/schema#',
    id: type + 'Exchange',
    type: 'object',
    title: ('RabbitMQ ' + capitalize(type) + ' Exchange'),
    description: ('A RabbitMQ ' + type + ' exchange'),
    // expected properties
    properties: {
      exchange: {
        description: 'Exchange name, unique identifier',
        type: 'string',
        pattern: '^[0-9A-Za-z-_.:]*$'
      },
      type: {
        description: 'Exchange type, eg. direct, fanout, or topic',
        type: 'string',
        pattern: ('^' + type + '$')
      },
      options: {
        description: 'Exchange options',
        type: 'object'
      },
      bindings: {
        description: 'Exchange bindings (destinations)',
        type: 'array',
        minItems: 1,
        items: [
          generateBinding(type)
        ]
      }
    },
    // required properties
    required: ['exchange', 'type', 'bindings']
  }

  return jsonSchema
}

/**
 * Generate an exchange-binding json schema
 * @param  {String} type - binding's exchange type, eg. direct, exchange, or fanout
 * @return {Object} exchange json schema
 */
function generateBinding (type) {
  var validTypes = ['direct', 'fanout', 'topic']
  if (!~validTypes.index) {
    throw new Error('type must be "direct", "exchange", or "fanout"')
  }

  var jsonSchema = {
    $schema: 'http://json-schema.org/draft-04/schema#',
    title: ('RabbitMQ ' + capitalize(type) + ' Exchange Binding'),
    description: ('A RabbitMQ ' + type + ' exchange binding'),
    type: 'object',
    // expected properties
    properties: {
      destination: { $ref: 'topology' },
      args: {
        description: 'Binding args',
        type: 'object'
      }
    },
    // required properties, more below
    required: ['destination']
  }

  // direct-exchange binding
  if (type === 'direct') {
    // direct-exchange bindings have a 'routing key'
    // ex: foo, foo.bar, foo.bar.qux, etc
    jsonSchema.properties.routingKey = {
      description: 'Direct binding routing key',
      type: 'string',
      pattern: '^[a-zA-Z]+(.[a-zA-Z]+)*$'
    }
    // additional required properties
    jsonSchema.required.push('routingKey')
  }

  // topic-exchange binding
  if (type === 'topic') {
    // topic-exchange bindings have a 'routing pattern'
    // ex: foo, foo.bar, *, *.*, #, foo.*, foo.#, *.foo, *.#, foo.*.#, etc
    jsonSchema.properties.routingPattern = {
      description: 'Direct binding routing key',
      type: 'string',
      pattern: '^(([a-zA-Z]+|[*])\.)*([a-zA-Z]+|[*#])(\.([a-zA-Z]+|[*]))*$'
    }
    // additional required properties
    jsonSchema.required.push('routingPattern')
  }

  return jsonSchema
}
