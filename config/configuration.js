const fs = require('fs');
const { Keystore } = require("drax-sdk-nodejs/keystore");
const { keysPath, relaysPath, statePath } = require("../options");

const VALID_STATE = 2010

var ConfigSingleton;

class Config {
    constructor(){
        this.config = null
        this.client = null
        this.sgtin = null
    }
    instance(){
        if (!ConfigSingleton){
            ConfigSingleton = new Config()
        }
        return ConfigSingleton
    }

    addClient(client){
        if (this.client == null)
            this.client = client
    }

    addSgtin(sgtin){
        if (this.sgtin == null)
            this.sgtin = sgtin
    }

    load(){
        return new Promise((resolve, reject) => {
            this.client.login()
            .then(() => {
                this.client.loadConfig({address: this.sgtin}).then((res) => {
                    this.config = res.data.value
                    var obj = require(keysPath)
                    this.config.keys = obj.keys

                    //this.config.ccu3.address = "192.168.43.131"
                    //this.config.ccu3.serverHost = "192.168.43.110"

                    resolve(this.config)
                })
            }).catch((e) => {
                reject(e)
            })
        })
    }

    // update(config){
    //     return new Promise((resolve, reject) => {
    //         this.client.login().then(() => {
    //             this.client.saveKeystore({keys: config.keys}).then(() => {
    //                 this.load().then(() => {
    //                     new Keystore().instance().addConfig(this.getConfig())
    //                     resolve()
    //                 }).catch((e) => {
    //                     console.log(e)
    //                     reject()
    //                 })
    //             }).catch((e) => {
    //                 console.log(e)
    //             })
    //         })
    //         .catch((code) => {
    //             console.log(code)
    //             reject()
    //         })
    //     })
            
    // }

    update(config){
        return new Promise((resolve, reject) => {
            this.client.login().then(() => {
                this.client.saveDevice({hmIpDevices: config.keys}).then(() => {
                    var obj = {
                        keys: config.keys
                    }
                    fs.writeFileSync(keysPath, JSON.stringify(obj))
                    resolve()
                }).catch((e) => {
                    console.log(e)
                    reject()
                })
            })
            .catch((code) => {
                console.log(code)
                reject()
            })
        })
            
    }

    updateRelay(data){
        var obj = require(relaysPath)
        var relays = obj.relays
        var relayIdx = relays.findIndex(r => r.address == data.address)
        if (relayIdx != -1){
            obj.relays[relayIdx] = data
        } else {
            obj.relays.push(data)
        }
        fs.writeFileSync(relaysPath, JSON.stringify(obj))
    }

    getRelayFromAddress(address){
        var obj = require(relaysPath)
        var relays = obj.relays
        var relay = relays.find(r => r.address == address)
        return relay
    }

    getRelayFromNodeAddress(address){
        var obj = require(relaysPath)
        var relays = obj.relays        
        return relays.find(r => {
            if (r.nodeAdresses){
                var _nodes = r.nodeAdresses.map(n => n.address)
                if (_nodes.includes(address)){
                    return true
                }
            }
            return false
        })
    }

    getConfig(){
        return this.config
    }

    checkState(type, address, value){
        var stateConfig = null
        try {
            stateConfig = require(statePath)
        } catch (e){
            stateConfig = {state: []}
        }
        var deviceState = stateConfig.state.find(s => s.type == type && s.address == address)
        if (deviceState){
            if (deviceState.value != value){
                return deviceState.value
            } else {
                return VALID_STATE
            }
        }
        return null
    }

    getState(type, address){
        var stateConfig = null
        try {
            stateConfig = require(statePath)
        } catch (e){
            stateConfig = {state: []}
        }
        var deviceState = stateConfig.state.find(s => s.type == type && s.address == address)
        if (deviceState){
            return deviceState.value
        }
        return null
    }

    setState(type, address, value){
        var obj = null
        try {
            obj = require(statePath)
        } catch (e){
            obj = {state: []}
        }
        
        var state = obj.state
        var stateIdx = state.findIndex(s => s.type == type && s.address == address)
        if (stateIdx != -1){
            obj.state[stateIdx] = {type, address, value}
        } else {
            obj.state.push({type, address, value})
        }
        fs.writeFileSync(statePath, JSON.stringify(obj))
    }

}

module.exports = {
    Config: Config,
    VALID_STATE: VALID_STATE
}