var ajv = require('ajv')()
var Code = require('code')
var Lab = require('lab')
var lab = exports.lab = Lab.script()

var queueSchema = require('../lib/json-schemas/queue.js')

var describe = lab.describe
var it = lab.it
var beforeEach = lab.beforeEach
var expect = Code.expect

describe('queue json schema', function () {
  var ctx

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
    ctx.validate = ajv.compile(queueSchema)
    done()
  })

  it('should validate a queue json schema', function (done) {
    var valid = ctx.validate(ctx.queue)
    // console.log(ctx.validate.errors[0])
    expect(valid).to.be.true()
    done()
  })

  describe('required errors', function () {
    it('should error if missing "queue"', function (done) {
      delete ctx.queue.queue
      expect(ctx.validate(ctx.queue)).to.be.false()
      // console.log(ctx.validate.errors[0])
      expect(ctx.validate.errors[0].message).to.match(/required.*'queue'/)
      done()
    })

    it('should error if missing "messageSchema"', function (done) {
      delete ctx.queue.messageSchema
      expect(ctx.validate(ctx.queue)).to.be.false()
      // console.log(ctx.validate.errors[0])
      expect(ctx.validate.errors[0].message).to.match(/required.*'messageSchema'/)
      done()
    })
  })
})
