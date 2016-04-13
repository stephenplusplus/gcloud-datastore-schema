# gcloud-datastore-schema
> Define and follow a schema for your Datastore entities

```sh
$ npm install --save gcloud-datastore-schema
```
```js
var gcloud = require('gcloud');
var schema = require('gcloud-datastore-schema');

var datastore = schema(gcloud.datastore({/*...*/}));

// New method: register
datastore.register('Person', {
  // Native JavaScript types
  name: String,
  age: Number,
  tools: Array,
  isPremiumUser: Boolean,

  // Datastore types
  gpa: gcloud.datastore.double,

  // Nested schemas
  address: {
    streetNumber: Number,
    streetName: String,
    // Nested nested schemas
    zip: {
      firstPart: Number,
      secondPart: Number
    }
  },

  // Custom validators
  fullName: function (input) {
    return input.split(' ').length > 1;
  }
});

// The original save method will now validate by default
// So let's make it mad
datastore.save({
  key: datastore.key(['Person']),
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
  // err:
  // {
  //   code: 'ESCHEMAVIOLATION',
  //   message: 'Schema validation failed',
  //   errors: [
  //     {
  //       kind: 'Person',
  //       errors: [
  //         'Schema definition expected property: isPremiumUser',
  //         'Schema definition violated for property: "gpa". Expected type: Double, received: Int',
  //         'Schema definition violated for property: fullName',
  //         'Unexpected properties found: extraData, extraExtraData'
  //       ]
  //     }
  //   ]
  // }
})
```

## API Documentation

Coming soon, sorry. For now, please use the above example as a guide.
