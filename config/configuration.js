const fs = require('fs');
const { Keystore } = require("drax-sdk-nodejs/keystore");
const { keysPath } = require("../options");

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
                    resolve(this.config)
                })
            }).catch(() => {reject()})
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
                this.client.saveDevice({keys: config.keys}).then(() => {
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

    getConfig(){
        return this.config
    }

}

module.exports = {
    Config: Config,
}