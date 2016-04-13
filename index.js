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

var validate = function (schema, data) {
  var errorMessages = []
  var dataProperties = Object.keys(data)

  for (var prop in schema) {
    var validator = schema[prop]
    var value = data[prop]

    if (dataProperties.indexOf(prop) > -1) {
      dataProperties.splice(dataProperties.indexOf(prop), 1)
    }

    // Is nested schema?
    if (is.object(validator)) {
      validate(validator, value)
      continue
    }

    if (!validator || !is.fn(validator)) {
      errorMessages.push('Schema definition not found for property: ' + prop)
      continue
    }

    if (!is.defined(value)) {
      errorMessages.push('Schema definition expected property: ' + prop)
      continue
    }

    // Is it a native type?
    if (validator === global[validator.name]) {
      if (!is.type(data[prop], validator.name.toLowerCase())) {
        // Some types don't exist on `is`, e.g. Buffer. One last check:
        if (!(value instanceof global[validator.name])) {
          errorMessages.push([
            'Schema definition violated for property: "' + prop + '".',
            'Expected type: ' + validator.name + ', received: ' + JSON.stringify(value)
          ].join(' '))
        }
      }

      continue
    }

    // Is it a custom Datastore type?
    for (var customTypeName in customTypes) {
      var customTypeStringified = customTypes[customTypeName]

      if (validator.toString() === customTypeStringified) {
        if (value.constructor.name !== customTypeName) {
          errorMessages.push([
            'Schema definition violated for property: "' + prop + '".',
            'Expected type: ' + customTypeName + ', received: ' + value.constructor.name
          ].join(' '))
        }

        continue
      }
    }

    // Assume it's a custom validator function
    if (!validator(value)) {
      errorMessages.push('Schema definition violated for property: ' + prop)
      continue
    }
  }

  if (dataProperties.length > 0) {
    errorMessages.push('Unexpected properties found: ' + dataProperties.join(', '))
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

      var validationFailureMessages = validate(schemas[kind], entity.data)
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
