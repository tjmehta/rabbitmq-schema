// var metaJsonSchema = require('./json-schema-draft-04.js')
// var put = require('101/put')

module.exports = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  id: 'queue',
  title: 'RabbitMQ Queue',
  description: 'A RabbitMQ queue',
  type: 'object',
  // expected properties
  properties: {
    queue: {
      description: 'Queue name, unique identifier',
      type: 'string',
      pattern: '^[0-9A-Za-z-_.:]*$'
    },
    options: {
      description: 'Queue options',
      type: 'object'
    },
    messageSchema: {
      type: 'object'
    }
  // messageSchema: put(metaJsonSchema, {
  //   description: 'Queue message json schema'
  // })
  },
  // definitions for references
  // definitions: metaJsonSchema.definitions,
  // required properties
  required: ['queue', 'messageSchema']
}
