const { Config } = require("../../config/configuration");
const GenericDevice = require("../genericDevice");

class Falmot extends GenericDevice {
    constructor(address, client, ccu3, drax, sgtin, ip){
        super()
        this.data = {}

        this.address = address
        this.ccu3 = ccu3
        this.drax = drax
        
        this.sgtin = sgtin
        this.ip = ip
        this.client = client

        this.iteractions = 0
    }

    handshake(){
        return new Promise((resolve, reject) => {
            try {
                let config = new Config().instance().getConfig();
                let nodeId = config.keys.find(k => k.type == 'falmot' && k.address == this.address).nodeId
                resolve()
            } catch (e) {
                console.log("Key missing! address: %s", this.address)
                var node = {
                    id: 0,
                    urn: "falmot:" + this.sgtin + ":" + this.address,
                    supportedTypes: ["hm-falmot"],
                    configurationPublishTopic: "configurations/hmip/" + this.sgtin,
                    statePublishTopic: "states/hmip",
                    initialState: {},
                    name: "FALMOT-" + this.address + "-" + this.sgtin
                }
                this.drax && this.drax.handshake(node).then((res) => {
                    console.log(res)                
                    var newKey = {
                        "nodeId": res.data.nodeId,
                        "publicKey": new Buffer.from(res.data.publicKey, 'base64').toString('hex'),
                        "privateKey": new Buffer.from(res.data.privateKey, 'base64').toString('hex'),
                        "type": "falmot",
                        "parentAddress": this.sgtin,
                        "address": this.address
                    }
                    let config = new Config().instance().getConfig();
                    config.keys.push(newKey)
                    this.updateConfig(config, () => resolve(), () => reject())
                })
            }
        })

    }

    stateEvent(response){
        console.log("SEND STATE:::", this.address)
        this.state()
    }

    channelCallback(data, iteractions){
        var _interactions = iteractions
        var _cb = null
        if (_interactions <= 11){
            _cb = this.channelCallback
        } else {
            _cb = function(data){
                this.data = {...this.data, ...data}
                console.log("DATA::", this.data)
                this.sendState(this.data)
            }
        }

        this.data = {...this.data, ["level_" + _interactions]: data.LEVEL, address: this.address, type: 'HmIP-FALMOT-C12'}
        _interactions++
        this.ccu3.getDeviceValues(this.address + ":" + _interactions, (d) => _cb.bind(this, {...d, address: this.address, type: 'HmIP-FALMOT-C12'}, _interactions))
    }

    state(){
        var _interactions = 1
        this.ccu3.getDeviceValues(this.address + ":" + _interactions, (d) => this.channelCallback.bind(this, {...d, address: this.address, type: 'HmIP-FALMOT-C12'}, _interactions))
    }

    // updateAndCheckRelay(level){
    //     let relay = new Config().instance().getRelayAverageFromAddress(this.address);
    //     console.log("RELAY: ", relay)
    //     console.log("AVERAGE: ", level)
    //     if (relay){
    //         if (relay.permanentOff){
    //             this.turnOffRelay(relay.address)
    //         } else {                
    //             if (level * 100 > 30){
    //                 this.turnOnRelay(relay.address)
    //             } else {
    //                 this.turnOffRelay(relay.address)
    //             }
    //         }
    //     }
    // }

    // turnOnRelay(relayAddress){
    //     this.ccu3.setDeviceValue(relayAddress + ":3", 'STATE', true)
    // }

    // turnOffRelay(relayAddress){
    //     this.ccu3.setDeviceValue(relayAddress + ":3", 'STATE', false)
    // }

    updateAndCheckRelay(level){
        let relay = new Config().instance().getRelayAverageFromAddress(this.address);
        console.log("RELAY: ", relay)
        if (relay){
            let actualAverage = relay.average || 0
            let index = relay.index || 0
            let timestamp = relay.timestamp || 0
            let now = new Date().getTime()

            if (index % relay.nodeAdresses.length == 0 || now - timestamp > 2 * 60 * 1000){
                actualAverage = 0
                index = 0
            }

            if (level != 0){
                if (relay.nodeAdresses.length > 1){
                    actualAverage = actualAverage + level / relay.nodeAdresses.length
                } else if (relay.nodeAdresses.length == 1){
                    actualAverage = level
                }
            }
            relay.average = actualAverage
            relay.index = index + 1
            relay.timestamp = new Date().getTime()
            new Config().instance().updateRelay(relay)
            if (relay.index % relay.nodeAdresses.length == 0){                
                if (relay.permanentOff){
                    this.turnOffRelay(relay.address)
                } else {
                    console.log("AVERAGE: ", relay.average)
                    if (relay.average > this.ccu3.getThreshold()){
                        this.turnOnRelay(relay.address)
                    } else {
                        this.turnOffRelay(relay.address)
                    }
                }
            }
        }
    }

    turnOnRelay(relayAddress){
        new Config().instance().setState("relay", relayAddress, true);
        this.ccu3.setDeviceValue(relayAddress + ":3", 'STATE', true)
    }

    turnOffRelay(relayAddress){
        new Config().instance().setState("relay", relayAddress, false);
        this.ccu3.setDeviceValue(relayAddress + ":3", 'STATE', false)
    }

    stateUnreach(response){
        console.log("UNREACHED:::", this.address)
    }

    sendState(data){
        var state = data
        var _levels = []
        for (var i = 1; i <= 12; i++){
            if (data["level_" + i] != null && data["level_" + i] != undefined && data["level_" + i] !== ''){
                _levels.push(data["level_" + i])
            }
        }
        var level = null

        if (_levels.length > 0){
            level = _levels.reduce((a, b) => a + b, 0) / _levels.length;
        }

        if (level != null && level != undefined){
            this.updateAndCheckRelay(level * 100)
        }
        console.log("AVERAGE: ", level)

        try {
            let config = new Config().instance().getConfig();
            let nodeId = config.keys.find(k => k.type == "falmot" && k.address == this.address).nodeId
            if (nodeId){
                try {
                    this.drax.setState(nodeId, null, state, false)
                } catch (e) {
                    console.log("SetStateError: ", e); console.log("NodeId: ", nodeId);
                    console.log('force quit');
                    process.exit(1);
                }
            }
        } catch (e) {
            console.log(e)
        }
    }

    configuration(config){
        var del = config.del

        if (del == 1){
            this.ccu3.deleteDevice(this.address, DELETE_FLAG_RESET);
        }
    }
}

module.exports = {
    Falmot: Falmot
}