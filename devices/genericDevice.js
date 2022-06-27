const { Keystore } = require("drax-sdk-nodejs/keystore");
const { Config } = require("../config/configSingleton");
const configPath = require("../options");

class GenericDevice {
    constructor(){}

    updateConfig(config, client = null, resolve = null, reject = null){
        if (client != null){
            client.login()
            .then(() => {
                client.saveKeystore({keys: config.keys}).then(() => {
                    var config = new Config().instance()
                    config.load().then(() => {
                        new Keystore().instance().addConfig(config.getConfig())
                        if (resolve != null){                        
                            resolve()
                        }
                    })
                })
            })
            .catch((code) => {
                console.log(code)
                if (reject != null){
                    reject()
                }
            })
        }
    }

    stateEvent(response){
        
    }

    stateUnreach(response){
        
    }

    handshake(){
        return new Promise((resolve, reject) => {
            resolve()
        })
    }
}

module.exports = GenericDevice