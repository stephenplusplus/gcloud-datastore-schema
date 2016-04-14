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
      favoriteNumbers: [Number],
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
      phoneNumbers: [
        {
          metadata: {
            type: String,
            availability: [
              String
            ]
          },
          number: String
        }
      ],
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
        favoriteNumbers: [16, 91],
        gpa: gcloud.datastore.int(4.0),
        address: {
          streetNumber: 123,
          streetName: 'Main',
          zip: {
            firstPart: 12345,
            secondPart: 4444
          }
        },
        phoneNumbers: [
          {
            number: '555-1212',
            metadata: {
              availability: [
                '9-5',
                95
              ]
            }
          }
        ],
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
            'Schema definition expected property: "isPremiumUser"',
            'Schema definition violated for property: "gpa". Expected type: Double, received: Int',
            'Schema definition expected property: "phoneNumbers[].metadata.type"',
            'Schema definition violated for property: "phoneNumbers[].metadata.availability[].availability". Expected type: String, received: 95',
            'Schema definition violated for property: "fullName"',
            'Unexpected properties found: "extraData", "extraExtraData"'
          ]
        }
      ])

      done()
    })
  })
})
