var q = 'tasks';
const AmqpDraxBroker = require("./consumer/amqpDraxBroker")

// const amqp = require('amqplib/callback_api');

// const opt = { credentials: require('amqplib').credentials.plain('f7a5998ef216473eb5b1c473224913f4', '3965156625403a8c41ecc81e7516a1f695c4b7b9e377138092a474f3d7bfbe53') };

// amqp.connect('amqp://35.205.187.28', opt, (err, conn) => {
//     return conn.createChannel();
// })

var params = {
    host: null,
    port: null,
    vhost: null,
    user: "ed2b5e96b99f44588647752cd543c84d",
    password: "0e302e419e30bf5615f05ef2acc89028bae05330b2f136290094513178dcf674",
    projectId: "node-sdk-development-65447"
}

// var draxBroker  = new AmqpDraxBroker(params)
// draxBroker.start()
// var mapState = new Map();
// mapState["dato"] = "2355555"

// setTimeout(() => {
//     draxBroker.setState(3373, "homematicip:gateway:test", mapState, true)
// }, 2000)

// setTimeout(() => {
//     draxBroker.stop()
// }, 20000)

var xmlrpc = require('xmlrpc')

// Creates an XML-RPC server to listen to XML-RPC method calls
//var server = xmlrpc.createServer({ host: 'http://192.168.0.117', port: 2010 })

var client = xmlrpc.createClient({
    host: '192.168.0.117',
    port: 2010,
    cookies: true,
    basic_auth: { user: "Admin", pass: "admin" }
  });
  
  //client.setCookie('Admin', 'admin');
  var deviceId = '00201D89A8B0C1:1'

  var deviceId2 = "00201D89A8B051:1"
  
  //This call will send provided cookie to the server
//   client.methodCall('someAction', [], function(error, value) {
//     //Here we may get cookie received from server if we know its name
//     console.log(client.getCookie('session'));
//   });
// client.methodCall('putParamset', [deviceId, "VALUES", {'SET_POINT_MODE': 0, 'SET_POINT_TEMPERATURE': 19.5}], function (error, value) {
//     if (error) {
//       console.log('error:', error);
//       console.log('req headers:', error.req && error.req._header);
//       console.log('res code:', error.res && error.res.statusCode);
//       console.log('res body:', error.body);
//     } else {
//       console.log('value:', value);
//     }
//   });

  client.methodCall('putParamset', [deviceId2, "VALUES", {'CONTROL_MODE': 1}], function (error, value) {
    if (error) {
      console.log('error:', error);
      console.log('req headers:', error.req && error.req._header);
      console.log('res code:', error.res && error.res.statusCode);
      console.log('res body:', error.body);
    } else {
      console.log('value:', value);
    }
  });

//   client.methodCall('listDevices', [], function (error, value) {
//     if (error) {
//       console.log('error:', error);
//       console.log('req headers:', error.req && error.req._header);
//       console.log('res code:', error.res && error.res.statusCode);
//       console.log('res body:', error.body);
//     } else {
//         var filteredValues = value.filter(v => v.CHILDREN.length != 0)
//         var mappedValues = filteredValues.map(v => {
//             return {
//                 type: v.TYPE,
//                 subType: v.SUBTYPE,
//                 address: v.ADDRESS
//             }
//         })
//         console.log('value:', mappedValues);
//     }
//   });

//   client.methodCall('getInstallMode', [], function (error, value) {
//     if (error) {
//       console.log('error:', error);
//     } else {
//         console.log('value:', value);
//     }
//   });

// client.methodCall('deleteDevice', ["00201D89A8B051", 0x01], function (error, value) {
//     if (error) {
//       console.log('error:', error);
//     } else {
//         console.log('value:', value);
//     }
//   });

//   client.methodCall('setInstallMode', [true], function (error, value) {
//     if (error) {
//       console.log('error:', error);
//     } else {
//         console.log('value:', value);
//     }
//   });