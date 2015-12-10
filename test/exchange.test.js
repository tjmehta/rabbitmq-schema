var ajv = require('ajv')()
var Code = require('code')
var Lab = require('lab')
var put = require('101/put')

var topologySchema = require('../lib/json-schemas/topology.js')
var queueSchema = require('../lib/json-schemas/queue.js')
var directExchangeSchema = require('../lib/json-schemas/direct-exchange.js')
var fanoutExchangeSchema = require('../lib/json-schemas/fanout-exchange.js')
var topicExchangeSchema = require('../lib/json-schemas/topic-exchange.js')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var before = lab.before
var beforeEach = lab.beforeEach
var expect = Code.expect

describe('exchange json schema', function () {
  var ctx

  before(function (done) {
    // resolves circular refs
    ajv.addSchema([
      queueSchema,
      directExchangeSchema,
      fanoutExchangeSchema,
      topicExchangeSchema,
      topologySchema
    ])
    done()
  })

  beforeEach(function (done) {
    ctx = {}
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
        routingPattern: 'hello'
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

  describe('for direct exchange', function () {
    beforeEach(function (done) {
      ctx.validate = ajv.compile(directExchangeSchema)
      ctx.exchange = ctx.directExchange
      done()
    })

    itShouldPassCommonExchangeTests()

    it('should error if missing "bindings[*].routingPattern"', function (done) {
      delete ctx.exchange.bindings[0].routingPattern
      expect(ctx.validate(ctx.exchange)).to.be.false()
      // console.log(ctx.validate.errors[0])
      expect(ctx.validate.errors[0].message).to.match(/required.*routingPattern/)
      done()
    })
  })

  describe('for fanout exchange', function () {
    beforeEach(function (done) {
      ctx.validate = ajv.compile(fanoutExchangeSchema)
      ctx.exchange = ctx.fanoutExchange
      done()
    })

    itShouldPassCommonExchangeTests()
  })

  describe('for topic exchange', function () {
    beforeEach(function (done) {
      ctx.validate = ajv.compile(topicExchangeSchema)
      ctx.exchange = ctx.topicExchange
      done()
    })

    itShouldPassCommonExchangeTests()

    it('should error if missing "bindings[*].routingPattern"', function (done) {
      delete ctx.exchange.bindings[0].routingPattern
      expect(ctx.validate(ctx.exchange)).to.be.false()
      // console.log(ctx.validate.errors[0])
      expect(ctx.validate.errors[0].message).to.match(/required.*routingPattern/)
      done()
    })
  })

  function itShouldPassCommonExchangeTests () {
    describe('with queue binding', function () {
      it('should validate an exchange json schema', function (done) {
        var valid = ctx.validate(ctx.exchange)
        // console.log(ctx.validate.errors[0])
        expect(valid).to.be.true()
        done()
      })

      it('should error if missing "bindings[*].destination.queue"', function (done) {
        delete ctx.queue.queue
        expect(ctx.validate(ctx.exchange)).to.be.false()
        // console.log(ctx.validate.errors[0])
        expect(ctx.validate.errors[0].dataPath).to.match(/destination$/)
        expect(ctx.validate.errors[0].message).to.match(/oneOf/)
        done()
      })

      it('should error if missing "bindings[*].destination.messageSchema"', function (done) {
        delete ctx.queue.messageSchema
        expect(ctx.validate(ctx.exchange)).to.be.false()
        // console.log(ctx.validate.errors[0])
        expect(ctx.validate.errors[0].dataPath).to.match(/destination$/)
        expect(ctx.validate.errors[0].message).to.match(/oneOf/)
        done()
      })
    })

    describe('with direct exchange binding', function () {
      beforeEach(function (done) {
        ctx.destination =
          ctx.exchange.bindings[0].destination =
            put(ctx.directExchange, { exhange: 'another-name' })
        done()
      })

      it('should validate an exchange json schema', function (done) {
        var valid = ctx.validate(ctx.exchange)
        // console.log(ctx.validate.errors[0])
        expect(valid).to.be.true()
        done()
      })

      it('should error if missing "bindings[*].destination.exchange"', function (done) {
        delete ctx.destination.exchange
        expect(ctx.validate(ctx.exchange)).to.be.false()
        // console.log(ctx.validate.errors[0])
        expect(ctx.validate.errors[0].dataPath).to.match(/destination$/)
        expect(ctx.validate.errors[0].message).to.match(/oneOf/)
        done()
      })

      it('should error if missing "bindings[*].destination.type"', function (done) {
        delete ctx.destination.type
        expect(ctx.validate(ctx.exchange)).to.be.false()
        // console.log(ctx.validate.errors[0])
        expect(ctx.validate.errors[0].dataPath).to.match(/destination$/)
        expect(ctx.validate.errors[0].message).to.match(/oneOf/)
        done()
      })

      it('should error if missing "bindings[*].destination.bindings"', function (done) {
        delete ctx.destination.bindings
        expect(ctx.validate(ctx.exchange)).to.be.false()
        // console.log(ctx.validate.errors[0])
        expect(ctx.validate.errors[0].dataPath).to.match(/destination$/)
        expect(ctx.validate.errors[0].message).to.match(/oneOf/)
        done()
      })
    })

    describe('with fanout exchange binding', function () {
      beforeEach(function (done) {
        ctx.destination =
          ctx.exchange.bindings[0].destination =
            put(ctx.fanoutExchange, { exhange: 'another-name' })
        done()
      })

      it('should validate an exchange json schema', function (done) {
        var valid = ctx.validate(ctx.exchange)
        // console.log(ctx.validate.errors[0])
        expect(valid).to.be.true()
        done()
      })
    })

    describe('with topic exchange binding', function () {
      beforeEach(function (done) {
        ctx.destination =
          ctx.exchange.bindings[0].destination =
            put(ctx.topicExchange, { exhange: 'another-name' })
        done()
      })

      it('should validate an exchange json schema', function (done) {
        var valid = ctx.validate(ctx.exchange)
        // console.log(ctx.validate.errors[0])
        expect(valid).to.be.true()
        done()
      })
    })

    describe('required errors', function () {
      it('should error if missing "exchange"', function (done) {
        delete ctx.exchange.exchange
        expect(ctx.validate(ctx.exchange)).to.be.false()
        // console.log(ctx.validate.errors[0])
        expect(ctx.validate.errors[0].message).to.match(/required.*'exchange'/)
        done()
      })

      it('should error if missing "type"', function (done) {
        delete ctx.exchange.type
        expect(ctx.validate(ctx.exchange)).to.be.false()
        // console.log(ctx.validate.errors[0])
        expect(ctx.validate.errors[0].message).to.match(/required.*'type'/)
        done()
      })

      it('should error if missing "bindings"', function (done) {
        delete ctx.exchange.bindings
        expect(ctx.validate(ctx.exchange)).to.be.false()
        // console.log(ctx.validate.errors[0])
        expect(ctx.validate.errors[0].message).to.match(/required.*'bindings'/)
        done()
      })

      it('should error if missing "bindings[*].destination"', function (done) {
        delete ctx.exchange.bindings[0].destination
        expect(ctx.validate(ctx.exchange)).to.be.false()
        // console.log(ctx.validate.errors[0])
        expect(ctx.validate.errors[0].message).to.match(/required.*destination/)
        done()
      })
    })
  }
})
