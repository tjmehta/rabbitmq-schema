var ajv = require('ajv')()
var Code = require('code')
var Lab = require('lab')
var lab = exports.lab = Lab.script()

var topologySchema = require('../lib/json-schemas/topology.js')
var queueSchema = require('../lib/json-schemas/queue.js')
var directExchangeSchema = require('../lib/json-schemas/direct-exchange.js')
var fanoutExchangeSchema = require('../lib/json-schemas/fanout-exchange.js')
var topicExchangeSchema = require('../lib/json-schemas/topic-exchange.js')

var describe = lab.describe
var it = lab.it
var before = lab.before
var beforeEach = lab.beforeEach
var expect = Code.expect

describe('topology json schema', function () {
  var ctx

  before(function (done) {
    ctx = {}
    // resolves circular refs
    ajv.addSchema([
      topologySchema,
      queueSchema,
      directExchangeSchema,
      fanoutExchangeSchema,
      topicExchangeSchema
    ])
    ctx.queue = {
      queue: 'queue-name',
      options: {},
      messageSchema: {
        $schema: 'http://json-schema.org/draft-04/schema#',
        description: 'queue-name message',
        type: 'object',
        properties: {
          foo: { type: 'string' },
          bar: { type: 'string' }
        }
      }
    }
    ctx.directExchange = {
      exchange: 'foo-name',
      type: 'direct',
      options: {},
      bindings: [{
        destination: ctx.queue,
        args: {},
        routingKey: 'hello'
      }]
    }
    ctx.fanoutExchange = {
      exchange: 'foo-name',
      type: 'fanout',
      options: {},
      bindings: [{
        destination: ctx.queue,
        args: {}
      }]
    }
    ctx.topicExchange = {
      exchange: 'foo-name',
      type: 'topic',
      options: {},
      bindings: [{
        destination: ctx.queue,
        args: {},
        routingPattern: 'hello'
      }]
    }
    done()
  })

  describe('queue', function () {
    beforeEach(function (done) {
      ctx.validate = ajv.compile(topologySchema)
      done()
    })

    it('should validate a queue json schema', function (done) {
      var valid = ctx.validate(ctx.queue)
      // console.log(ctx.validate.errors[0])
      expect(valid).to.be.true()
      done()
    })
  })

  describe('direct exchange', function () {
    beforeEach(function (done) {
      ctx.exchange = ctx.directExchange
      ctx.validate = ajv.compile(topologySchema)
      done()
    })

    it('should validate a direct exchange json schema', function (done) {
      var valid = ctx.validate(ctx.exchange)
      // console.log(ctx.validate.errors[0])
      expect(valid).to.be.true()
      done()
    })
  })

  describe('fanout exchange', function () {
    beforeEach(function (done) {
      ctx.exchange = ctx.fanoutExchange
      ctx.validate = ajv.compile(topologySchema)
      done()
    })

    it('should validate a fanout exchange json schema', function (done) {
      var valid = ctx.validate(ctx.exchange)
      expect(valid).to.be.true()
      done()
    })
  })

  describe('topic exchange', function () {
    beforeEach(function (done) {
      ctx.exchange = ctx.topicExchange
      ctx.validate = ajv.compile(topologySchema)
      done()
    })

    it('should validate a topic exchange json schema', function (done) {
      var valid = ctx.validate(ctx.exchange)
      // console.log(ctx.validate.errors[0])
      expect(valid).to.be.true()
      done()
    })
  })
})
