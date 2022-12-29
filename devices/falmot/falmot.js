const { Config, VALID_STATE } = require("../../config/configuration");
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
                this.ccu3.addProcess()
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
                    this.ccu3.removeProcess()
                })
            }
        })

    }

    stateEvent(response){
        console.log("SEND STATE:::", this.address)
        this.state(true)
    }

    channelCallback(data, stEvnt = false){     
        var _cb = null
        if (this.iteractions <= 11){
            _cb = this.channelCallback.bind(this)
        } else {
            _cb = function(data){
                this.data = {...this.data, ...data}
                console.log("DATA::", this.data)
                this.sendState(this.data, stEvnt)
            }.bind(this)
        }

        this.data = {...this.data, ["level_" + this.iteractions]: data.LEVEL, address: this.address, type: 'HmIP-FALMOT-C12'}
        this.iteractions++
        console.log("INTERACTIONS::", this.iteractions)
        this.ccu3.getDeviceValues(this.address + ":" + this.iteractions, (d) => _cb({...d, address: this.address, type: 'HmIP-FALMOT-C12'}))
    }

    state(stEvnt = false){
        this.iteractions++
        console.log("INTERACTIONS::", this.iteractions)
        this.ccu3.getDeviceValues(this.address + ":" + this.iteractions, (d) => this.channelCallback({...d, address: this.address, type: 'HmIP-FALMOT-C12'}, stEvnt))
    }

    updateAndCheckRelay(level){
        let relay = new Config().instance().getRelayFromNodeAddress(this.address);
        console.log("RELAY: ", relay)
        if (relay){
            var _nodeIdx = relay.nodeAdresses.findIndex(na => na.address == this.address)

            if (_nodeIdx >= 0){
                relay.nodeAdresses[_nodeIdx].openValve = parseInt(level)
                var levels = relay.nodeAdresses.map(na => na.openValve)

                const sum = levels.reduce((a, b) => a + b, 0);
                const avg = (sum / levels.length) || 0;
                relay.average = avg

                new Config().instance().updateRelay(relay)
                if (relay.permanentOff){
                    this.turnOffRelay(relay.address)
                } else {
                    console.log("AVERAGE: ", avg)
                    if (avg > this.ccu3.getThreshold()){
                        this.turnOnRelay(relay.address)
                    } else {
                        this.turnOffRelay(relay.address)
                    }
                }
            }
        }
    }

    turnOnRelay(relayAddress){
        let _state = new Config().instance().getState("relay", relayAddress);
        if (_state !== null && _state !== VALID_STATE && _state !== true){
            new Config().instance().setState("relay", relayAddress, true);
            this.ccu3.setDeviceValue(relayAddress + ":3", 'STATE', true)
        }        
    }

    turnOffRelay(relayAddress){
        let _state = new Config().instance().getState("relay", relayAddress);
        if (_state !== null && _state !== VALID_STATE && _state !== false){
            new Config().instance().setState("relay", relayAddress, false);
            this.ccu3.setDeviceValue(relayAddress + ":3", 'STATE', false)
        }
    }

    stateUnreach(response){
        console.log("UNREACHED:::", this.address)
    }

    sendState(data, stEvnt = false){
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