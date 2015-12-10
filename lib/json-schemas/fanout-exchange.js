var generateExchange = require('../generate-exchange-json-schema.js')

module.exports = generateExchange('fanout')
/*
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "fanoutExchange",
  "type": "object",
  "title": "RabbitMQ Fanout Exchange",
  "description": "A RabbitMQ fanout exchange",
  "properties": {
    "exchange": {
      "description": "Exchange name, unique identifier",
      "type": "string",
      "pattern": "^[0-9A-Za-z-_.:]*$"
    },
    "type": {
      "description": "Exchange type, eg. direct, fanout, or topic",
      "type": "string",
      "pattern": "^fanout$"
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
          "title": "RabbitMQ Fanout Exchange Binding",
          "description": "A RabbitMQ fanout exchange binding",
          "type": "object",
          "properties": {
            "destination": {
              "$ref": "topology"
            },
            "args": {
              "description": "Binding args",
              "type": "object"
            }
          },
          "required": [
            "destination"
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
