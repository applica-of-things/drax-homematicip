
var xmlrpc = require('homematic-xmlrpc');
const { findIndex } = require('underscore');
const _ = require("underscore")

const CLOSE_PERCENTAGE_THRESHOLD = 10 //[%]

class CCU3 {
  constructor(clientHost = "localhost",
    clientPort = 2010,
    clientCredentials = { user: "Admin", pass: "admin" },
    serverHost = "localhost",
    serverPort = 8084,
  ) {
    this.client = xmlrpc.createClient({
      host: clientHost,
      port: clientPort,
      cookies: true,
      basic_auth: clientCredentials
    });
    
    this.server = xmlrpc.createServer({ host: serverHost, port: serverPort })
    this.serverHost = serverHost
    this.serverPort = serverPort

    this.eventListeners = []

    this.responses = []

    this.threshold = CLOSE_PERCENTAGE_THRESHOLD

    this.processes = 0
  }

  addProcess(){    
    this.processes = this.processes + 1
    console.log("INFO::PROCESS ADDED: ", this.processes)
  }

  removeProcess(){
    this.processes = this.processes - 1
    if (this.processes < 0){
      this.processes = 0
    }
    console.log("INFO::PROCESS REMOVED: ", this.processes)
  }

  isLock(){
    console.log("PROCESS::", this.processes)
    if (this.processes != 0){
      return true
    }
    return false
  }

  addEventListener(listener) {
    this.eventListeners.push(listener)
  }

  onEvent(err, params, callback) {
    console.log(' < event', JSON.stringify(params));
      callback(null, '');
      this.eventListeners.forEach(e => {
        if (_.isFunction(e.stateUnreach)) {
          var data = {
            address: params[1].split(":")[0],
            UNREACH: params[3]
          } 
          e.stateUnreach(data)
        }
      })
  }

  registerServer() {
    return new Promise((resolve, reject) => {
      this.server.on('system.listMethods', (err, params, callback) => {
        //console.log(' <  system.listMethods');
        callback(null, ['system.listMethods', 'system.multicall', 'event', 'listDevices']);
      });

      this.server.on('listDevices', (err, params, callback) => {
        callback(null, []);
      });

      this.server.on('event', (err, params, callback) => {
        this.onEvent(err, params, callback)
      });

      this.server.on('system.multicall', (err, params, callback) => {
        //console.log(' < system.multicall', JSON.stringify(params));
        var response = {};
        var address = null
        var channel = null
        params[0].forEach((call) => {
          console.log(' <', call.methodName, JSON.stringify(call.params));
          if (address == null && channel == null){
            address = call.params[1].split(":")[0]
            channel = call.params[1].split(":")[1]
            response = this.responses.find(r => r.address == address) || {}
          }
          response["address"] = address;
          if (response["channels"] == null || (response["channels"] && response["channels"].find(c => c == channel) == null)){
            response["channels"] = response["channels"]? [...response["channels"], channel] : [channel]
          }          
          var key = call.params[2]
          var value = call.params[3]
          response[key] = value;
        });
        if (this.responses.find(r => r.address == address) == null){
          this.responses.push(response)
        }

        this.eventListeners.forEach(e => {
          if (_.isFunction(e.stateEvent)) {
            this.responses = e.stateEvent(this.responses)
          }
        })
        callback(null, '');
      });

      setTimeout(() => {
        resolve()
      }, 2000)
    })
  }

  getThreshold(){
    return this.threshold
  }

  subscribe() {
    console.log(' > ', 'init', ['http://' + this.serverHost + ':' + this.serverPort, 'hmIpDraxInterface']);
    this.client.methodCall('init', ['http://' + this.serverHost + ':' + this.serverPort, 'hmIpDraxInterface'], function (err, res) {
      console.log(err, res);
    });
  }

  unsubscribe() {
    console.log(' > ', 'init', ['http://' + this.serverHost + ':' + this.serverPort, '']);
    this.client.methodCall('init', ['http://' + this.serverHost + ':' + this.serverPort, ''], function (err, res) {
        console.log(err, res);
        process.exit(0);
    });
    setTimeout(function () {
        console.log('force quit');
        process.exit(1);
    }, 1000);
}

  setInstallMode(on, time = 60, mode = 1, callback = null) {
    this.client.methodCall('setInstallMode', [on], (error, value) => {
      if (error) {
        console.log('error:', error);
      } else {
        if (_.isFunction(callback)) {
          callback(value)
        }
      }
    });
  }

  getInstallMode(callback = null) {
    this.client.methodCall('getInstallMode', [], (error, value) => {
      if (error) {
        console.log('error:', error);
      } else {
        if (_.isFunction(callback)) {
          callback(value)
        }
      }
    });
  }

  listDevices(callback = null) {
    this.client.methodCall('listDevices', [], (error, value) => {
      if (error) {
        console.log('error:', error);
      } else {
        if (_.isFunction(callback)) {
          callback(value)
        }
      }
    });
  }

  setDeviceValue(address, type, value, callback = null) {
    this.client.methodCall('setValue', [address, type, value], (error, value) => {
      if (error) {
        console.log('error:', error);
      } else {
        if (_.isFunction(callback)) {
          callback(value)
        }
      }
    });
  }

  getDeviceValue(address, type, callback = null, onError = null) {
    this.client.methodCall('getValue', [address, type], (error, value) => {
      if (error) {
        console.log('error:', error);
        if (_.isFunction(onError)) {
          onError(error)
        }
      } else {
        if (_.isFunction(callback)) {
          callback(value)
        }
      }
    });
  }

  deleteDevice(address, flags, callback = null) {
    this.client.methodCall('deleteDevice', [address, flags], (error, value) => {
      if (error) {
        console.log('error:', error);
      } else {
        if (_.isFunction(callback)) {
          callback(value)
        }
      }
    });
  }

  getDeviceValues(address, callback = null) {
    this.client.methodCall('getParamset', [address, "VALUES"], (error, value) => {
      if (error) {
        console.log('error:', error);
      } else {
        if (_.isFunction(callback)) {
          callback(value)
        }
      }
    });
  }

  getLinks(address, callback = null) {
    this.client.methodCall('getLinks', [address, 1], (error, value) => {
      if (error) {
        console.log('error:', error);
      } else {
        if (_.isFunction(callback)) {
          callback(value)
        }
      }
    });
  }

  addLink(deviceA, deviceB, linkName, linkDescription, callback = null) {
    this.client.methodCall('addLink', [deviceA, deviceB, linkName, linkDescription], (error, value) => {
      if (error) {
        console.log('error:', error);
      } else {
        if (_.isFunction(callback)) {
          callback(value)
        }
      }
    });
  }

  removeLink(sender, receiver, callback = null) {
    this.client.methodCall('removeLink', [sender, receiver], (error, value) => {
      if (error) {
        console.log('error:', error);
      } else {
        if (_.isFunction(callback)) {
          callback(value)
        }
      }
    });
  }

  setManualMode(address, callback = null) {
    this.client.methodCall('putParamset', [address, "VALUES", { 'CONTROL_MODE': 1 }], (error, value) => {
      if (error) {
        console.log('error:', error);
      } else {
        if (_.isFunction(callback)) {          
          callback(value)
        }
      }
    });
  }

}

module.exports = {
  CCU3: CCU3
}