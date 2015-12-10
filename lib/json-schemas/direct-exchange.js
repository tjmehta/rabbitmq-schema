var generateExchange = require('../generate-exchange-json-schema.js')

module.exports = generateExchange('direct')
/*
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "directExchange",
  "type": "object",
  "title": "RabbitMQ Direct Exchange",
  "description": "A RabbitMQ direct exchange",
  "properties": {
    "exchange": {
      "description": "Exchange name, unique identifier",
      "type": "string",
      "pattern": "^[0-9A-Za-z-_.:]*$"
    },
    "type": {
      "description": "Exchange type, eg. direct, fanout, or topic",
      "type": "string",
      "pattern": "^direct$"
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
          "title": "RabbitMQ Direct Exchange Binding",
          "description": "A RabbitMQ direct exchange binding",
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
              "pattern": "^[a-zA-Z]+(.[a-zA-Z]+)*$"
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
