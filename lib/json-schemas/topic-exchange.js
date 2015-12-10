var generateExchange = require('../generate-exchange-json-schema.js')

module.exports = generateExchange('topic')
/*
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "topicExchange",
  "type": "object",
  "title": "RabbitMQ Topic Exchange",
  "description": "A RabbitMQ topic exchange",
  "properties": {
    "exchange": {
      "description": "Exchange name, unique identifier",
      "type": "string",
      "pattern": "^[0-9A-Za-z-_.:]*$"
    },
    "type": {
      "description": "Exchange type, eg. direct, fanout, or topic",
      "type": "string",
      "pattern": "^topic$"
    },
    "options": {
      "description": "Exchange options",
      "type": "object"
    },
    "bindings": {
      "description": "Exchange bindings (destinations)",
      "type": "array",
      "minItems": 1,
      "items": [
        {
          "$schema": "http://json-schema.org/draft-04/schema#",
          "title": "RabbitMQ Topic Exchange Binding",
          "description": "A RabbitMQ topic exchange binding",
          "type": "object",
          "properties": {
            "destination": {
              "$ref": "topology"
            },
            "args": {
              "description": "Binding args",
              "type": "object"
            },
            "routingPattern": {
              "description": "Direct binding routing key",
              "type": "string",
              "pattern": "^(([a-zA-Z]+|[*]).)*([a-zA-Z]+|[*#])(.([a-zA-Z]+|[*]))*$"
            }
          },
          "required": [
            "destination",
            "routingPattern"
          ]
        }
      ]
    }
  },
  "required": [
    "exchange",
    "type",
    "bindings"
  ]
}
 */
