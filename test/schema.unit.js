require('set-prototype-of') // polyfill
var assign = require('101/assign')
var clone = require('101/clone')
var Code = require('code')
var keypather = require('keypather')()
var Lab = require('lab')
var indexBy = require('101/index-by')
var pluck = require('101/pluck')
var put = require('101/put')
var sinon = require('sinon')

var RabbitSchema = require('../index')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var beforeEach = lab.beforeEach
var afterEach = lab.afterEach
var expect = Code.expect
var createRabbitSchema = function (value) {
  return new RabbitSchema(value)
}

describe('rabbitmq-schema', function () {
  var ctx
  beforeEach(function (done) {
    ctx = {}
    done()
  })

  describe('constructor', function () {
    beforeEach(function (done) {
      ctx.json = {
        exchange: 'exchange',
        type: 'fanout',
        bindings: {
          destination: {
            queue: 'queue',
            messageSchema: {}
          }
        }
      }
      ctx.mockValidated = {}
      sinon.stub(RabbitSchema, 'validate')
      ctx.mockChildren = {
        queues: [],
        exchanges: [],
        queuesByName: [],
        exchangesByName: []
      }
      sinon.stub(RabbitSchema, '_getChildren').returns(ctx.mockChildren)
      done()
    })
    afterEach(function (done) {
      RabbitSchema.validate.restore()
      RabbitSchema._getChildren.restore()
      done()
    })

    it('should create a schema from an object', function (done) {
      var json = ctx.json
      var schema = new RabbitSchema(json)
      sinon.assert.calledWith(RabbitSchema.validate, json)
      expect(schema).to.deep.contain(json)
      schema.foo = 10 // should not set bc deep frozen
      expect(schema.foo).to.not.equal(10)
      expect(schema._queues).to.equal(ctx.mockChildren.queues)
      expect(schema._exchanges).to.equal(ctx.mockChildren.exchanges)
      expect(schema._queuesByName).to.equal(ctx.mockChildren.queuesByName)
      expect(schema._exchangesByName).to.equal(ctx.mockChildren.exchangesByName)
      done()
    })

    it('should create a schema from an array', function (done) {
      var json = [ctx.json]
      var schema = new RabbitSchema(json)
      sinon.assert.calledWith(RabbitSchema.validate, json)
      expect(schema.length).to.equal(json.length)
      expect(schema[0]).to.deep.contain(json[0])
      expect(schema[0]._queues).to.equal(ctx.mockChildren.queues)
      expect(schema[0]._exchanges).to.equal(ctx.mockChildren.exchanges)
      expect(schema[0]._queuesByName).to.equal(ctx.mockChildren.queuesByName)
      expect(schema[0]._exchangesByName).to.equal(ctx.mockChildren.exchangesByName)
      schema.foo = 10 // should not set bc deep frozen
      expect(schema.foo).to.not.equal(10)
      done()
    })

    it('should create a copy if passed a schema', function (done) {
      var json = ctx.json
      var schema = new RabbitSchema(json)
      ctx.mockQueues = []
      ctx.mockExchanges = []
      // must create mock to override frozen methods
      var schema2 = new RabbitSchema(schema)
      expect(schema2).to.not.equal(schema)
      expect(schema2).to.deep.contain(json)
      expect(schema2.toJSON()).to.deep.equal(json)
      schema2.foo = 10 // should not set bc deep frozen
      expect(schema2.foo).to.not.equal(10)
      expect(schema2._queues).to.equal(schema._queues)
      expect(schema2._exchanges).to.equal(schema._exchanges)
      expect(schema2._queuesByName).to.equal(schema._queuesByName)
      expect(schema2._exchangesByName).to.equal(schema._exchangesByName)
      done()
    })
  })

  describe('validate', function () {
    beforeEach(function (done) {
      ctx.queueErr = new Error('boomErr')
      ctx.exchangeErr = new Error('exchangeErr')
      sinon.stub(RabbitSchema, '_validateExchange').throws(ctx.exchangeErr)
      sinon.stub(RabbitSchema, '_validateQueue').throws(ctx.queueErr)
      done()
    })
    afterEach(function (done) {
      RabbitSchema._validateExchange.restore()
      RabbitSchema._validateQueue.restore()
      done()
    })

    it('should throw an RabbitSchemaValidationError if json is not an object', function (done) {
      expect(RabbitSchema.validate.bind(null, 'foo'))
        .to.throw(/value.*object/)
      done()
    })

    it('should throw an RabbitSchemaValidationError if json is not an object w/ parentPath', function (done) {
      expect(RabbitSchema.validate.bind(null, 'foo', 'bindings[0]'))
        .to.throw(/bindings\[0\].*object/)
      done()
    })

    it('should throw an SchemaValidationError if json is circular', function (done) {
      var circular = {}
      circular.foo = circular
      expect(RabbitSchema.validate.bind(null, circular))
        .to.throw(/value.*circular/)
      done()
    })

    it('should throw an SchemaValidationError if both invalid queue and invalid exchange', function (done) {
      var json = {}
      expect(RabbitSchema.validate.bind(null, json))
        .to.throw(/must be a queue.*exchange/)
      done()
    })

    it('should validate as a queue if it is queue-like', function (done) {
      var json = { queue: 'queue-name' }
      expect(RabbitSchema.validate.bind(null, json))
        .to.throw(ctx.queueErr.message)
      sinon.assert.calledWith(RabbitSchema._validateQueue, json)
      done()
    })

    it('should validate as a exchange if it is exchange-like', function (done) {
      var json = { exchange: 'exchange-name' }
      expect(RabbitSchema.validate.bind(null, json))
        .to.throw(ctx.exchangeErr.message)
      sinon.assert.calledWith(RabbitSchema._validateExchange, json)
      done()
    })

    it('should validate array as an array of connected topologies', function (done) {
      var json = [
        { queue: 'queue', messageSchema: {} }, // valid
        { exchange: 'exchange-name' } // invalid
      ]
      expect(RabbitSchema.validate.bind(null, json))
        .to.throw(ctx.exchangeErr.message)
      sinon.assert.calledWith(RabbitSchema._validateExchange, json[1], '[1]')
      done()
    })
  // full topology validation tests in topology.test.js
  })

  describe('validate nested', function () {
    beforeEach(function (done) {
      ctx.json = {
        exchange: 'exchange1',
        type: 'direct',
        bindings: [{
          routingPattern: 'key',
          destination: {
            exchange: 'exchange2',
            type: 'topic',
            bindings: [{
              routingPattern: 'key'
            }] // invalid
          }
        }]
      }
      done()
    })
    it('should throw an SchemaValidationError if both invalid queue and invalid exchange', function (done) {
      keypather.set(ctx.json, 'bindings[0].destination.bindings[0]', null)
      expect(RabbitSchema.validate.bind(null, ctx.json))
        .to.throw("'bindings[0].destination.bindings[0]' should be object")

      done()
    })

    it('should validate as a queue if it is queue-like', function (done) {
      keypather.set(ctx.json,
        'bindings[0].destination.bindings[0].destination', { queue: 'queue' })
      expect(RabbitSchema.validate.bind(null, ctx.json))
        .to.throw("'bindings[0].destination.bindings[0].destination' should have required property 'messageSchema'")

      done()
    })

    it('should validate as a exchange if it is exchange-like', function (done) {
      keypather.set(ctx.json,
        'bindings[0].destination.bindings[0].destination', { exchange: 'exchange' })
      expect(RabbitSchema.validate.bind(null, ctx.json))
        .to.throw("'bindings[0].destination.bindings[0].destination.type' must be direct, topic, or fanout")

      done()
    })

    describe('validate nested array', function () {
      beforeEach(function (done) {
        ctx.json = [ ctx.json ]

        done()
      })

      it('should throw an SchemaValidationError if both invalid queue and invalid exchange', function (done) {
        keypather.set(ctx.json, '[0].bindings[0].destination.bindings[0]', null)
        expect(RabbitSchema.validate.bind(null, ctx.json))
          .to.throw("'[0].bindings[0].destination.bindings[0]' should be object")

        done()
      })

      it('should validate as a queue if it is queue-like', function (done) {
        keypather.set(ctx.json,
          '[0].bindings[0].destination.bindings[0].destination', { queue: 'queue' })
        expect(RabbitSchema.validate.bind(null, ctx.json))
          .to.throw("'[0].bindings[0].destination.bindings[0].destination' should have required property 'messageSchema'")

        done()
      })

      it('should validate as a exchange if it is exchange-like', function (done) {
        keypather.set(ctx.json,
          '[0].bindings[0].destination.bindings[0].destination', { exchange: 'exchange' })
        expect(RabbitSchema.validate.bind(null, ctx.json))
          .to.throw("'[0].bindings[0].destination.bindings[0].destination.type' must be direct, topic, or fanout")

        done()
      })
    })
  })

  describe('_validateQueue', function () {
    it('should throw an SchemaValidationError if invalid queue', function (done) {
      var json = {
        queue: 'queue-name'
      }
      expect(RabbitSchema._validateQueue.bind(null, json))
        .to.throw(/required.*messageSchema/)
      done()
    })

    it('should validate successfull', function (done) {
      var json = {
        queue: 'queue-name',
        messageSchema: {}
      }
      RabbitSchema._validateQueue(json)
      done()
    })
  // full queue validation tests in queue.test.js
  })

  describe('_validateExchange', function () {
    it('should throw an SchemaValidationError if invalid queue', function (done) {
      var json = {
        exchange: 'exchange-name'
      }
      expect(RabbitSchema._validateExchange.bind(null, json))
        .to.throw(/type.*must be/)
      done()
    })

    it('should validate successfully', function (done) {
      var json = {
        exchange: 'exchange-name',
        type: 'fanout',
        bindings: [{
          destination: {
            queue: 'queue',
            messageSchema: {}
          }
        }]
      }
      RabbitSchema._validateExchange(json)
      done()
    })
  // full exchange validation tests in exchange.test.js
  })

  describe('_getChildren', function () {
    beforeEach(function (done) {
      ctx.json = [{
        exchange: 'exchange0',
        type: 'fanout',
        bindings: [{
          destination: {
            exchange: 'exchange1',
            type: 'fanout',
            bindings: [{
              destination: {
                queue: 'queue',
                messageSchema: {}
              }
            }]
          }
        }]
      }]
      ctx.schema = new RabbitSchema(ctx.json)
      done()
    })

    it('should get all children from a nested schema', function (done) {
      var children = RabbitSchema._getChildren(ctx.schema)
      expect(children.queues).to.have.a.length(1)
      // queue
      var queueName = children.queues[0].queue
      var queueJson = ctx.schema.getQueueByName(queueName).toJSON()
      expect(children.queues[0]).to.deep.contain(queueJson)
      expect(children.queues[0].toJSON()).to.deep.equal(queueJson)
      expect(children.queuesByName[queueName]).to.deep.contain(queueJson)
      expect(children.queuesByName[queueName].toJSON()).to.deep.equal(queueJson)
      // exchanges
      expect(children.exchanges).to.have.a.length(2)
      var exchangeName
      var exchangeJson
      // exchange1
      exchangeName = children.exchanges[0].exchange
      exchangeJson = ctx.schema.getExchangeByName(exchangeName).toJSON()
      expect(children.exchanges[0]).to.deep.contain(exchangeJson)
      expect(children.exchanges[0].toJSON()).to.deep.equal(exchangeJson)
      expect(children.exchangesByName[exchangeName]).to.deep.contain(exchangeJson)
      expect(children.exchangesByName[exchangeName].toJSON()).to.deep.equal(exchangeJson)
      // exchange2
      exchangeName = children.exchanges[1].exchange
      exchangeJson = ctx.schema.getExchangeByName(exchangeName).toJSON()
      expect(children.exchanges[1]).to.deep.contain(exchangeJson)
      expect(children.exchanges[1].toJSON()).to.deep.equal(exchangeJson)
      expect(children.exchangesByName[exchangeName]).to.deep.contain(exchangeJson)
      expect(children.exchangesByName[exchangeName].toJSON()).to.deep.equal(exchangeJson)
      done()
    })

    describe('errors', function () {
      it('should error if identical exchange found w/ different opts', function (done) {
        var exchange = ctx.schema.getExchangeByName('exchange1').toJSON()
        exchange.options = { foo: 1 }
        ctx.json[0].bindings.push({destination: exchange})
        expect(createRabbitSchema.bind(null, ctx.json)).to.throw(/exchange.*mismatched.*options/)
        done()
      })
      it('should error if identical exchange found w/ different bindings', function (done) {
        var exchange = ctx.schema.getExchangeByName('exchange1').toJSON()
        exchange.bindings = clone(ctx.json[0].bindings)
        ctx.json[0].bindings.push({destination: exchange})
        expect(createRabbitSchema.bind(null, ctx.json)).to.throw(/exchange.*mismatched.*bindings/)
        done()
      })
      it('should error if identical queue found w/ different opts', function (done) {
        var queue = ctx.schema.getQueueByName('queue').toJSON()
        queue.options = { foo: 1 }
        ctx.json[0].bindings[0].destination.bindings.push({destination: queue})
        expect(createRabbitSchema.bind(null, ctx.json)).to.throw(/queue.*mismatched.*options/)
        done()
      })
      it('should error if identical exchange found w/ different opts (combo2)', function (done) {
        var exchange = ctx.schema.getExchangeByName('exchange1').toJSON()
        ctx.json[0].bindings[0].destination.options = { foo: 1 }
        ctx.json[0].bindings.push({destination: exchange})
        expect(createRabbitSchema.bind(null, ctx.json)).to.throw(/exchange.*mismatched.*options/)
        done()
      })
      it('should error if identical queue found w/ different opts (combo2)', function (done) {
        var queue = ctx.schema.getQueueByName('queue').toJSON()
        ctx.json[0].bindings[0].destination.bindings[0].destination.options = { foo: 1 }
        ctx.json[0].bindings[0].destination.bindings.push({destination: queue})
        expect(createRabbitSchema.bind(null, ctx.json)).to.throw(/queue.*mismatched.*options/)
        done()
      })
    })
  })

  describe('instance methods', function () {
    beforeEach(function (done) {
      ctx.queue = {
        queue: 'queue-name',
        messageSchema: {
          $schema: 'http://json-schema.org/draft-04/schema#',
          description: 'queue-name message schema',
          type: 'object',
          properties: {
            foo: { type: 'string' },
            bar: { type: 'string' }
          },
          required: ['foo']
        }
      }
      ctx.validMessage = { foo: 'foo', 'bar': 'bar' }
      done()
    })

    describe('validateMessage', function () {
      describe('direct queue message', function () {
        beforeEach(function (done) {
          ctx.schema = new RabbitSchema(ctx.queue)
          done()
        })

        it('should error if queue does not exist', function (done) {
          var schema = ctx.schema
          expect(
            schema.validateMessage.bind(schema, '', 'non-existant-queue', {})
          ).to.throw(/queue.*does not exist/)
          done()
        })

        it('should error if the message is invalid for any destination queues', function (done) {
          var schema = ctx.schema
          expect(
            schema.validateMessage.bind(schema, 'queue-name', {})
          ).to.throw(/required property.*foo/)
          done()
        })

        it('should pass if the message is valid', function (done) {
          // expect no errors
          ctx.schema.validateMessage('', 'queue-name', ctx.validMessage)
          done()
        })
      })

      describe('direct queue w/ string message queue', function () {
        beforeEach(function (done) {
          ctx.queue = {
            queue: 'string-queue-name',
            options: {},
            messageSchema: {
              $schema: 'http://json-schema.org/draft-04/schema#',
              description: 'string-queue-name message',
              type: 'string',
            }
          }
          ctx.validMessage = 'hello'
          ctx.schema = new RabbitSchema(ctx.queue)
          done()
        })

        it('should error if queue does not exist', function (done) {
          var schema = ctx.schema
          expect(
            schema.validateMessage.bind(schema, '', 'non-existant-queue', {})
          ).to.throw(/queue.*does not exist/)
          done()
        })

        it('should error if the message is invalid for any destination queues', function (done) {
          var schema = ctx.schema
          expect(
            schema.validateMessage.bind(schema, 'string-queue-name', {})
          ).to.throw(/should be string/)
          done()
        })

        it('should pass if the message is valid', function (done) {
          // expect no errors
          ctx.schema.validateMessage('', 'string-queue-name', ctx.validMessage)
          done()
        })
      })
    })

    describe('largeSchema', function () {
      beforeEach(function (done) {
        ctx.json = {
          exchange: 'exchange1',
          type: 'direct',
          bindings: [
            {
              routingPattern: 'routing.key',
              destination: {
                exchange: 'exchange2',
                type: 'topic',
                bindings: [
                  {
                    routingPattern: 'miss.routing.key',
                    destination: {
                      exchange: 'miss-exchange1',
                      type: 'fanout',
                      bindings: [{
                        destination: ctx.queue
                      }]
                    }
                  },
                  {
                    routingPattern: 'routing.key',
                    destination: {
                      exchange: 'exchange3',
                      type: 'fanout',
                      bindings: [{
                        destination: ctx.queue
                      }]
                    }
                  }
                ]
              }
            },
            {
              routingPattern: 'modus.ponens',
              destination: ctx.queue
            }
          ]
        }
        ctx.schema = new RabbitSchema(ctx.json)
        done()
      })

      describe('validateMessage', function () {
        it('should error if the exchange does not exist', function (done) {
          var schema = ctx.schema
          expect(
            schema.validateMessage.bind(schema, 'non-existant-exchange', 'routing.key', {})
          ).to.throw(/exchange.*does not exist/)
          done()
        })

        it('should error if the message does not reach any destination queues', function (done) {
          var schema = ctx.schema
          expect(
            schema.validateMessage.bind(schema, 'exchange1', 'foo.bar', {})
          ).to.throw(/did not reach any queues/)
          done()
        })

        it('should error if the message is invalid for any destination queues', function (done) {
          var schema = ctx.schema
          expect(
            schema.validateMessage.bind(schema, 'exchange1', 'routing.key', {})
          ).to.throw(/required property.*foo.*exchange1[.]exchange2[.]exchange3[.]queue-name[.]messageSchema/)
          done()
        })

        it('should pass if the message is valid', function (done) {
          ctx.schema.validateMessage('exchange1', 'routing.key', { foo: 'foo', bar: 'bar' })
          done()
        })
      })

      describe('getExchanges', function () {
        it('should get exchanges from a json', function (done) {
          var exchanges = ctx.schema.getExchanges()
          expect(exchanges).to.have.a.length(4)
          expect(exchanges).to.deep.contain([
            ctx.json.bindings[0].destination.bindings[0].destination,
            ctx.json.bindings[0].destination.bindings[1].destination,
            ctx.json.bindings[0].destination,
            ctx.json
          ])
          expect(exchanges.map(pluck('toJSON()'))).to.deep.equal([
            ctx.json.bindings[0].destination.bindings[0].destination,
            ctx.json.bindings[0].destination.bindings[1].destination,
            ctx.json.bindings[0].destination,
            ctx.json
          ])
          done()
        })
      })

      describe('getQueues', function (done) {
        it('should get queues from a json', function (done) {
          var queues = ctx.schema.getQueues()
          expect(queues).to.have.a.length(1)
          expect(queues).to.deep.contain([ ctx.queue ])
          expect(queues.map(pluck('toJSON()'))).to.deep.equal([ ctx.queue ])
          done()
        })
      })

      describe('getQueueByName', function () {
        it('should get a queue by name', function (done) {
          expect(ctx.schema.getQueueByName(ctx.queue.queue)).to.deep.contain(ctx.queue)
          expect(ctx.schema.getQueueByName(ctx.queue.queue).toJSON()).to.deep.equal(ctx.queue)
          done()
        })
      })
      describe('getExchangeByName', function () {
        it('should get an exchange by name', function (done) {
          expect(ctx.schema.getExchangeByName('exchange2'))
            .to.deep.contain(ctx.json.bindings[0].destination)
          expect(ctx.schema.getExchangeByName('exchange2').toJSON())
            .to.deep.equal(ctx.json.bindings[0].destination)
          done()
        })
      })
      describe('getBindings', function () {
        it('should get all bindings from a json', function (done) {
          var bindings = ctx.schema.getBindings()
          var expectedBindings = [
            put(
              ctx.json.bindings[0],
              'source', ctx.json),
            put(
              ctx.json.bindings[1],
              'source', ctx.json),
            put(
              ctx.json.bindings[0].destination.bindings[0],
              'source', ctx.json.bindings[0].destination),
            put(
              ctx.json.bindings[0].destination.bindings[1],
              'source', ctx.json.bindings[0].destination),
            put(
              ctx.json.bindings[0].destination.bindings[0].destination.bindings[0],
              'source', ctx.json.bindings[0].destination.bindings[0].destination),
            put(
              ctx.json.bindings[0].destination.bindings[1].destination.bindings[0],
              'source', ctx.json.bindings[0].destination.bindings[1].destination)
          ]

          expect(bindings).to.deep.contains(expectedBindings)
          expect(bindings).to.have.length(expectedBindings.length)
          done()
        })
      })
      describe('getDirectBindings', function () {
        it('should get a schema\'s direct bindings', function (done) {
          ctx.schema.getDirectBindings()
          done()
        })
      })
      describe('toJSON', function () {
        it('should return a clone of the original json', function (done) {
          expect(ctx.schema.toJSON()).to.deep.contain(ctx.json)
          done()
        })
      })
    })
    describe('queueSchema', function () {
      beforeEach(function (done) {
        ctx.schema = new RabbitSchema({
          queue: 'queue',
          messageSchema: {}
        })
        done()
      })

      describe('getDirectBindings', function () {
        it('should get a schema\'s direct bindings', function (done) {
          expect(ctx.schema.getDirectBindings()).to.deep.equal([])
          done()
        })
      })
    })
  })
})
