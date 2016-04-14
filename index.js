'use strict'

var arrify = require('arrify')
var is = require('is')

/* eslint-disable no-undef, semi, indent */
var customTypes = {
Double: function (value) {
  return new entity.Double(value);
}.toString(),
GeoPoint: function (coordindates) {
  return new entity.GeoPoint(coordindates);
}.toString(),
Int: function (value) {
  return new entity.Int(value);
}.toString()
}
/* eslint-enable no-undef, semi, indent */

var getKind = function (key) {
  if (key.kind) return key.kind

  var path = key.path

  if (path.length % 2 === 0) {
    return path[path.length - 2]
  } else {
    return path[path.length - 1]
  }
}

var validateType = function (intendedType, prop, value) {
  var errorMessages = []

  // Is it a native type?
  if (intendedType === global[intendedType.name]) {
    if (!is.type(value, intendedType.name.toLowerCase())) {
      // Some types don't exist on `is`, e.g. Buffer. One last check:
      if (!(value instanceof global[intendedType.name])) {
        errorMessages.push([
          'Schema definition violated for property: "' + prop + '".',
          'Expected type: ' + intendedType.name + ', received: ' + JSON.stringify(value)
        ].join(' '))
      }
    }

    return errorMessages
  }

  // Is it a custom Datastore type?
  for (var customTypeName in customTypes) {
    var customTypeStringified = customTypes[customTypeName]

    if (intendedType.toString() === customTypeStringified) {
      if (value.constructor.name !== customTypeName) {
        errorMessages.push([
          'Schema definition violated for property: "' + prop + '".',
          'Expected type: ' + customTypeName + ', received: ' + value.constructor.name
        ].join(' '))
      }

      continue
    }
  }

  // Assume it's a custom intendedType function
  if (!intendedType(value)) {
    errorMessages.push('Schema definition violated for property: "' + prop + '"')
  }

  return errorMessages
}

var validateSchema = function (schema, data) {
  var errorMessages = []
  var dataProperties = Object.keys(data)

  for (var prop in schema) {
    var validator = schema[prop]

    if (!validator) {
      errorMessages.push('Schema definition not found for property: "' + prop + '"')
      continue
    }

    if (!is.defined(data[prop])) {
      errorMessages.push('Schema definition expected property: "' + prop + '"')
      continue
    }

    var value = data[prop]
    var nestedErrorMessages = []

    if (dataProperties.indexOf(prop) > -1) {
      dataProperties.splice(dataProperties.indexOf(prop), 1)
    }

    if (is.object(validator)) {
      // Nested schema
      nestedErrorMessages = validateSchema(validator, value)
    } else if (is.array(validator)) {
      // Array with a nested schema
      var arraySchema = validator[0]

      if (!is.array(value)) {
        var nestedErrorMessage = [
          'Schema definition violated for property: "',
          'Expected type: Array, received: ' + value.constructor.name
        ].join(' ')
        nestedErrorMessages.push(nestedErrorMessage)
      } else {
        value
          .map(function (value) {
            if (is.object(value)) return validateSchema(arraySchema, value)
            if (is.array(value)) return value.map(validateType.bind(null, arraySchema, prop))
            return validateType(arraySchema, prop, value)
          })
          .forEach(function (errors) {
            if (errors.length > 0) nestedErrorMessages = errors
          })
      }
    } else {
      errorMessages = errorMessages.concat(validateType(validator, prop, value))
    }

    if (nestedErrorMessages.length > 0) {
      nestedErrorMessages = nestedErrorMessages.map(function (errorMessage) {
        var separator = is.object(validator) ? '.' : '[].'
        return errorMessage.replace('"', '"' + prop + separator)
      })
      errorMessages = errorMessages.concat(nestedErrorMessages)
    }
  }

  if (dataProperties.length > 0) {
    errorMessages.push('Unexpected properties found: "' + dataProperties.join('", "') + '"')
  }

  return errorMessages
}

module.exports = function (datastore) {
  var schemas = {}

  datastore.register = function (kind, schema) {
    schemas[kind] = schema
  }

  var save = datastore.save
  datastore.save = function (entities, callback) {
    var schemaValidationError = new Error('Schema validation failed')
    schemaValidationError.code = 'ESCHEMAVIOLATION'
    schemaValidationError.errors = []

    arrify(entities).forEach(function (entity) {
      var kind = getKind(entity.key)
      if (!schemas[kind]) return

      var validationFailureMessages = validateSchema(schemas[kind], entity.data)
      if (validationFailureMessages.length > 0) {
        schemaValidationError.errors.push({
          kind: kind,
          errors: validationFailureMessages
        })
      }
    })

    if (schemaValidationError.errors.length > 0) callback(schemaValidationError)
    else save.apply(datastore, arguments)
  }

  return datastore
}
