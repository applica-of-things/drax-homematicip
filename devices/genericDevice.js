const { Keystore } = require("drax-sdk-nodejs/keystore");
const { Config } = require("../config/configuration");
const configPath = require("../options");

class GenericDevice {
    constructor(address, client, ccu3, drax, sgtin, ip){
        this.ccu3 = ccu3
    }

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
        console.log("UNREACHED:::", this.address)
        if (!this.ccu3.isLock()){
            console.log("PROCESS EXIT")
            //process.exit(1);
        }
    }

    handshake(){
        return new Promise((resolve, reject) => {
            resolve()
        })
    }
}

module.exports = GenericDevice