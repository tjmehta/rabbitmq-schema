var ajv = require('ajv')()
var Code = require('code')
var Lab = require('lab')
var lab = exports.lab = Lab.script()

var directExchangeSchema = require('../lib/json-schemas/direct-exchange.js')

var describe = lab.describe
var it = lab.it
var beforeEach = lab.beforeEach
var expect = Code.expect

describe('direct exchange json schema', function () {
  var ctx
  beforeEach(function (done) {
    ctx = {}
    ctx.validate = ajv.compile(directExchangeSchema)
    // ctx.validate = jsen(directExchangeSchema)
    // ctx.validate = require('is-my-json-valid')(directExchangeSchema)
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
    ctx.exchange = {
      exchange: 'foo-name',
      type: 'direct',
      options: {},
      bindings: [{
        destination: ctx.queue,
        args: {},
        routingKey: 'hello'
      }]
    }

    done()
  })

  it('should validate a direct exchange json schema', function (done) {
    expect(ctx.validate(ctx.exchange)).to.be.true()

    done()
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

    it('should error if missing "bindings[*].routingKey"', function (done) {
      delete ctx.exchange.bindings[0].routingKey
      expect(ctx.validate(ctx.exchange)).to.be.false()
      // console.log(ctx.validate.errors[0])
      expect(ctx.validate.errors[0].message).to.match(/required.*routingKey/)
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
})
