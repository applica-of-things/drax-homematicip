const { Keystore } = require('drax-sdk-nodejs/keystore');
const fs = require('fs');
const { Config } = require('../../config/configSingleton');
class Http {
    constructor(app){
        this.controller(app)        
    }

    controller(app){
        app.get('/ping', (req, res) => {
            res.send({ping: "HM-PING-OK"});
            console.log("ping get received!")
        });

        app.post('/config', (req, res) => {            
            console.log("config post received!")
            var keys = req.body.keys
            var config = new Config().instance().getConfig();

            keys.forEach(k => {
                var _k = config.keys.find(key => k.nodeId == key.nodeId)
                if (_k == null){
                    config.keys.push(k)
                }                
            });

            fs.writeFile('config.json', JSON.stringify(config), (err) => {
                if (err) {
                    throw err;
                }
                var c = new Config().instance().getConfig();
                new Keystore().instance().addConfig(c)
                res.send("OK");
            })

        })
    }
}

module.exports = Http