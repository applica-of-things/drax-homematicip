const { Keystore } = require("drax-sdk-nodejs/keystore");
const { Config } = require("../config/configuration");
const configPath = require("../options");

class GenericDevice {
    constructor(){}

    updateConfig(config, resolve = null, reject = null){
        var configuration = new Config().instance()
        configuration.update(config).then(() => {
            if (resolve){
                resolve()
            }
        }).catch((e) => {
            if (reject){
                reject()
            }
        })
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