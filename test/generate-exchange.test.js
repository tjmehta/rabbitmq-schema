var Code = require('code')
var Lab = require('lab')

var generateExchange = require('../lib/generate-exchange-json-schema.js')

var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var expect = Code.expect

describe('generate-exchange-json-schema', function () {
  describe('errors for coverage', function () {
    it('should error if passed invalid type', function (done) {
      expect(generateExchange.bind(null, 'bogus'))
        .to.throw(/type must be.*direct.*topic.*fanout/)
      done()
    })
  })
})
