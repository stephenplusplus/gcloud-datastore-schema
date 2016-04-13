'use strict'

var assert = require('assert')
var gcloud = require('gcloud')

var schema = require('./')

describe('gcloud-datastore-schema', function () {
  it('should catch errors from the readme', function (done) {
    var datastore = schema(gcloud.datastore({ projectId: 'project-id' }))

    datastore.register('Person', {
      name: String,
      age: Number,
      tools: Array,
      isPremiumUser: Boolean,
      gpa: gcloud.datastore.double,
      address: {
        streetNumber: Number,
        streetName: String,
        zip: {
          firstPart: Number,
          secondPart: Number
        }
      },
      fullName: function (input) {
        return input.split(' ').length > 1
      }
    })

    datastore.save({
      key: datastore.key('Person'),
      data: {
        name: 'Doc',
        age: 8,
        tools: ['Stethoscope', 'Positive attitude'],
        gpa: gcloud.datastore.int(4.0),
        address: {
          streetNumber: 123,
          streetName: 'Main',
          zip: {
            firstPart: 12345,
            secondPart: 4444
          }
        },
        fullName: 'Doc',

        extraData: true,
        extraExtraData: false
      }
    }, function (err) {
      assert.strictEqual(err.code, 'ESCHEMAVIOLATION')
      assert.strictEqual(err.message, 'Schema validation failed')
      assert.deepEqual(err.errors, [
        {
          kind: 'Person',
          errors: [
            'Schema definition expected property: isPremiumUser',
            'Schema definition violated for property: "gpa". Expected type: Double, received: Int',
            'Schema definition violated for property: fullName',
            'Unexpected properties found: extraData, extraExtraData'
          ]
        }
      ])

      done()
    })
  })
})
