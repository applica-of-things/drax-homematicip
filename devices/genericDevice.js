const { Keystore } = require("drax-sdk-nodejs/keystore");
const fs = require('fs');
const configPath = require("../options");

class GenericDevice {
    constructor(){}

    updateConfig(config, client = null, resolve = null, reject = null){
        fs.writeFileSync(configPath, JSON.stringify(config));
        if (client != null){

            client.login()
            .then(() => {
                client.saveKeystore({keys: config.keys})
                if (resolve != null){
                    new Keystore().instance().addConfig(config)
                    resolve()
                }
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