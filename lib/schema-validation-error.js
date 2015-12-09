var exists = require('101/exists')
var isString = require('101/is-string')
var keypather = require('keypather')()
var util = require('util')

module.exports = SchemaValidationError

/**
 * creates a schema validation error from an ajv validate instance
 * @param {Object|String} validate errored ajvValidate object or error message
 */
function SchemaValidationError (validate, _parentPath) {
  // error properties
  this.message = isString(validate)
    ? validate // validate is message
    : SchemaValidationError.getMessage(validate, _parentPath)
  this.name = 'SchemaValidationError'
  Error.captureStackTrace(this, SchemaValidationError)
  // additional properties
  this.validate = validate
}

util.inherits(SchemaValidationError, Error)

/**
 * creates an error message from an ajvValidate object
 * @param  {Object} validate ajvValidate object
 * @return {String} error message
 */
SchemaValidationError.getMessage = function (validate, _parentPath) {
  var Schema = require('./schema.js') // circular require
  var validateErr = validate.errors[0]
  var dataPath = validateErr.dataPath.slice(1) // chop off first '.'
  var msgDataPath = dataPath || 'json'
  var currPath = _parentPath
    ? _parentPath + '.' + dataPath
    : dataPath
  var message

  msgDataPath = _parentPath
    ? ["'", _parentPath, '.', msgDataPath, "'"].join('')
    : ["'", msgDataPath, "'"].join('')

  // console.log(validate.data, dataPath, _parentPath)

  if (validateErr.keyword === 'oneOf') {
    // oneOf is only used to match queue or exchange
    var json = keypather.get(validate.data, dataPath)

    if (exists(json.queue)) {
      Schema._validateQueue(json, currPath)
    } else if (exists(json.exchange)) {
      Schema._validateExchange(json, currPath)
    } else {
      message = [ msgDataPath, ' must be a queue or exchange' ].join('')
    }
  } else {
    message = [ msgDataPath, validateErr.message ].join(' ')
  }

  return message
}
