module.exports = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  id: 'topology',
  title: 'Connected RabbitMQ Routing Topology',
  description: 'A connected RabbitMQ routing topology including exchanges, bindings and queues',
  type: 'object',
  // A connected rabbitmq topology is an exchange w/ all connected bindings or a queue
  oneOf: [
    { $ref: 'queue' },
    { $ref: 'directExchange' },
    { $ref: 'fanoutExchange' },
    { $ref: 'topicExchange' }
  ]
}
