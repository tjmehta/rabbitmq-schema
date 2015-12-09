var Code = require('code')
var Lab = require('lab')
var lab = exports.lab = Lab.script()

var topicPatternTest = require('../lib/topic-pattern-test.js')

var describe = lab.describe
var it = lab.it
var expect = Code.expect

describe('topic pattern test', function () {
  var patterns = [
    'foo.bar',
    'foo.bar.',
    '.foo.bar',
    'foo.*.',
    '.*.bar',
    'foo.#.',
    '.#.bar',
    'foo.*',
    '*.bar',
    'foo.#',
    '#.bar',
    'foo.*.bar',
    'foo.#.bar'
  ]
  var keys = [
    'foo.bar',
    'foo.bar.',
    '.foo.bar',
    'foo.',
    '.bar',
    'foo..',
    '..bar',
    'foo...',
    '...bar',
    'foo..bar',
    'foo...bar',
    'foo.bar.qux',
    'foo.bar.qux.',
    '.foo.bar.qux'
  ]
  var expected = {
    'foo.bar': [
      'foo.bar'
    ],
    'foo.bar.': [
      'foo.bar.'
    ],
    '.foo.bar': [
      '.foo.bar'
    ],
    'foo.*.': [
      'foo.bar.',
      'foo..'
    ],
    '.*.bar': [
      '.foo.bar',
      '..bar'
    ],
    'foo.#.': [
      'foo.bar.',
      'foo.',
      'foo..',
      'foo...',
      'foo.bar.qux.'
    ],
    '.#.bar': [
      '.foo.bar',
      '.bar',
      '..bar',
      '...bar'
    ],
    'foo.*': [
      'foo.bar',
      'foo.bar.',
      'foo.',
      'foo..'
    ],
    '*.bar': [
      'foo.bar',
      '.foo.bar',
      '.bar',
      '..bar'
    ],
    'foo.#': [
      'foo.bar',
      'foo.bar.',
      'foo.',
      'foo..',
      'foo...',
      'foo..bar',
      'foo...bar',
      'foo.bar.qux',
      'foo.bar.qux.'
    ],
    '#.bar': [
      'foo.bar',
      '.foo.bar',
      '.bar',
      '..bar',
      '...bar',
      'foo..bar',
      'foo...bar'
    ],
    'foo.*.bar': [
      'foo..bar'
    ],
    'foo.#.bar': [
      'foo.bar',
      'foo..bar',
      'foo...bar'
    ]
  }
  // Generative tests that assert 'expected'
  describe('topic-pattern-tests', function () {
    patterns.forEach(function (pattern) {
      describe(pattern + ' matches', function () {
        keys.forEach(function (key) {
          var expectKeyToMatch = Boolean(~expected[pattern].indexOf(key))
          if (expectKeyToMatch) {
            it('should match ' + key, function (done) {
              expect(topicPatternTest(pattern, key)).to.be.true()
              done()
            })
          } else {
            it('should not match ' + key, function (done) {
              expect(topicPatternTest(pattern, key)).to.be.false()
              done()
            })
          }
        })
      })
    })
  })
})

// EXPECTATIONS GENERATED W/ THIS SCRIPT:
/*
var co = require('co')
var amqplib = require('amqplib')
var promisify = function (obj, name) {
  var args = []
  console.log(obj[name].toString())
  return obj[name].bind(obj)
}
var patternToName = function (pattern) {
  return pattern
    .replace(/[.]/, '-')
    .replace(/[*]/, 'S')
    .replace(/[#]/, 'H')
}

co(function *() {
  var conn = yield amqplib.connect('amqp://192.168.99.100:32771')
  var channel = yield conn.createChannel()
  var exchange = yield channel.assertExchange('topic', 'topic')
  var message = `Message ${Date.now}`
  var patterns = [
    'foo.bar',
    'foo.bar.',
    '.foo.bar',
    'foo.*.',
    '.*.bar',
    'foo.#.',
    '.#.bar',
    'foo.*',
    '*.bar',
    'foo.#',
    '#.bar',
    'foo.*.bar',
    'foo.#.bar'
  ]
  var keys = [
    'foo.bar',
    'foo.bar.',
    '.foo.bar',
    'foo.',
    '.bar',
    'foo..',
    '..bar',
    'foo...',
    '...bar',
    'foo..bar',
    'foo...bar',
    'foo.bar.qux',
    'foo.bar.qux.',
    '.foo.bar.qux'
  ]
  var names = patterns.map(patternToName)

  var queues = yield names.map(function (name) {
    return channel.assertQueue(name)
  })

  var bindings = yield names.map(function (name, i) {
    return channel.bindQueue(name, 'topic', patterns[i])
  })

  console.log('created exchange, queues, and bindings')

  var expected = {}
  var consumers = yield names.map(function (name, i) {
    channel.consume(name, messageHandler.bind(null, patterns[i]))
  })
  function messageHandler (queuePattern, message) {
    expected[queuePattern] = expected[queuePattern] || []
    expected[queuePattern].push(message.content.toString())
    channel.ack(message)
  }

  console.log('created consumers')

  keys.forEach(publish)
  function publish (key) {
    channel.publish('topic', key, new Buffer(key))
  }

  console.log('published messages')

  setTimeout(function () {
    console.log('EXPECTED', expected)
  }, 1000)
}).then(function () {
  console.log('done')
}).catch(function (err) {
  console.error(err.stack)
})

 */
