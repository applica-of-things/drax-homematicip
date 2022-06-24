const { Keystore } = require("drax-sdk-nodejs/keystore");
const fs = require('fs');
const configPath = require("../options");

class GenericDevice {
    constructor(){}

    updateConfig(config, client = null, resolve = null, reject = null){
        fs.writeFile(configPath, JSON.stringify(config), (err) => {
            if (err) {
                throw err;
            }
            new Keystore().instance().addConfig(config)
            if (client != null){

                this.client.login()
                .then(() => {
                    this.client.saveKeystore({keys: config.keys})
                    if (resolve != null){
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
        });
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