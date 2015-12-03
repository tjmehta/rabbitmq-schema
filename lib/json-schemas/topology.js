module.exports = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'Connected RabbitMQ Routing Topology',
  description: 'A connected RabbitMQ routing topology including exchanges, bindings and queues',
  type: 'object',
  // A connected rabbitmq topology is an exchange w/ all connected bindings or a queue
  oneOf: [
    { $ref: '#/definitions/directExchange' },
    { $ref: '#/definitions/fanoutExchange' },
    { $ref: '#/definitions/topicExchange' },
    { $ref: '#/definitions/queue' }
  ],
  // external definitions used in schema
  definitions: {
    directExchange: require('./direct-exchange'),
    fanoutExchange: require('./fanout-exchange'),
    topicExchange: require('./topic-exchange'),
    queue: require('./queue')
  }
}
