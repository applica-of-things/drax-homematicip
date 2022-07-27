/**
 *
 *  Simple example:
 *  Connect to the interface process rfd on port 2001, open a rpc server and print incoming events
 *
 */

 var rpc = require('binrpc');

 // Config
 var thisHost = '192.168.43.110';
 var ccuHost = '192.168.43.150';
 var port = 8084
 
 
 var rpcServer = rpc.createServer({host: thisHost, port: port});    // Host running rpc server
 var rpcClient = rpc.createClient({host: ccuHost, port: 2010});      // CCU
 
 rpcServer.on('system.listMethods', function (err, params, callback) {
     console.log(' <  system.listMethods');
     callback(null, ['system.listMethods', 'system.multicall', 'event', 'listDevices']);
 });
 
 rpcServer.on('listDevices', function (err, params, callback) {
     callback(null, []);
 });
 
 rpcServer.on('event', function (err, params, callback) {
     console.log(' < event', JSON.stringify(params));
     callback(null, '');
 });
 
 rpcServer.on('system.multicall', function (err, params, callback) {
     console.log(' < system.multicall', JSON.stringify(params));
     var response = [];
     params[0].forEach(function (call) {
         console.log(' <', call.methodName, JSON.stringify(call.params));
          response.push('');
     });
     callback(null, '');
 });
 
 setTimeout(() => subscribe(), 2000)
 
 
 /**
  * Tell the CCU that we want to receive events
  */
 function subscribe() {
     console.log(' > ', 'init', ['xmlrpc_bin://' + thisHost + ':' + port, 'test123']);
     rpcClient.methodCall('init', ['xmlrpc_bin://' + thisHost + ':' + port, 'test123'], function (err, res) {
         console.log(err, res);
     });
 }
 
 process.on('SIGINT', function () {
     unsubscribe();
 });
 
 
 /**
  * Tell the CCU that we no longer want to receive events
  */
 function unsubscribe() {
     console.log(' > ', 'init', ['xmlrpc_bin://' + thisHost + ':2031', '']);
     rpcClient.methodCall('init', ['xmlrpc_bin://' + thisHost + ':2031', ''], function (err, res) {
         console.log(err, res);
 
         process.exit(0);
     });
     setTimeout(function () {
         console.log('force quit');
         process.exit(1);
     }, 1000);
 }