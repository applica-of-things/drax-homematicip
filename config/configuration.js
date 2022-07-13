const fs = require('fs');
const { Keystore } = require("drax-sdk-nodejs/keystore");
const { keysPath, relaysPath } = require("../options");

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
        var relay = relays.find(r => r.address == data.address)
        if (relay){
            relay = data
        } else {
            relays.push(data)
        }
        fs.writeFileSync(relaysPath, JSON.stringify(obj))            
    }

    getRelayAverage(address){
        var obj = require(relaysPath)
        var relays = obj.relays
        var relay = relays.find(r => r.address == address)
        return relay
    }

    getRelayAverageFromTrv(trvAddress){
        var obj = require(relaysPath)
        var relays = obj.relays
        return relays.find(r => r.nodeAdresses && r.nodeAdresses.includes(trvAddress))
    }

    getConfig(){
        return this.config
    }

}

module.exports = {
    Config: Config,
}