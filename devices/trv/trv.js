const { reject } = require("underscore");
const { Config, VALID_STATE } = require("../../config/configuration");
const { DELETE_FLAG_RESET } = require("../../homematic/flags");
const GenericDevice = require("../genericDevice");

class Trv extends GenericDevice {
    constructor(address, client, ccu3, drax, sgtin, ip){
        super(address, client, ccu3, drax, sgtin, ip)
        this.data = {}

        this.address = address
        this.ccu3 = ccu3
        this.drax = drax
        
        this.sgtin = sgtin
        this.ip = ip
        this.client = client
    }

    handshake(){
        return new Promise((resolve, reject) => {
            try {
                let config = new Config().instance().getConfig();
                let nodeId = config.keys.find(k => k.type == "trv" && k.address == this.address).nodeId
                resolve()
            } catch (e) {
                this.ccu3.addProcess()
                console.log("Key missing! address: %s", this.address)
                var node = {
                    id: 0,
                    urn: "trv:" + this.sgtin + ":" + this.address,
                    supportedTypes: ["hm-trv"],
                    configurationPublishTopic: "configurations/hmip/" + this.sgtin,
                    statePublishTopic: "states/hmip",
                    initialState: {},
                    name: "TRV-" + this.address + "-" + this.sgtin
                }
                this.drax && this.drax.handshake(node).then((res) => {
                    console.log(res)                
                    var newKey = {
                        "nodeId": res.data.nodeId,
                        "publicKey": new Buffer.from(res.data.publicKey, 'base64').toString('hex'),
                        "privateKey": new Buffer.from(res.data.privateKey, 'base64').toString('hex'),
                        "type": "trv",
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

    stateEvent(response){
        console.log("SEND STATE:::", this.address)
        //this.sendState(response)
        this.state(true)
    }

    state(stEvnt = false){
        var callback1 = (data) => {

            var callback2 = (data) => {
                this.data = {...this.data, ...data}
                console.log("DATA::", this.data)
                this.sendState(this.data, stEvnt)
            }

            this.data = {...this.data, ...data}
            this.ccu3.getDeviceValues(this.address + ":1", (d) => callback2({...d, address: this.address, type: 'HmIP-eTRV-B'}))
        }

        this.ccu3.getDeviceValues(this.address + ":0", (d) => callback1({...d, address: this.address, type: 'HmIP-eTRV-B'}))
    }

    stateUnreach(response){
        console.log("UNREACHED! RETRYING", this.address)
        let _state = new Config().instance().getState("trv", this.address);
        if (_state !== null && _state !== VALID_STATE){
            this.setTargetTemperature(_state)
        }
    }

    sendState(data, stEvnt = false){
        var state = {
            temperature: data.ACTUAL_TEMPERATURE || null,
            battery: data.OPERATING_VOLTAGE? Math.ceil(Math.min(data.OPERATING_VOLTAGE / 2.8 * 100, 100)): null,
            lowBattery: data.LOW_BAT,
            address: data.address,
            level: data.LEVEL != null? data.LEVEL * 100: null,
            targetTemperature: data.SET_POINT_TEMPERATURE || null,
            windowState: data.WINDOW_STATE,
            ip: this.ip,
            rssi: data.RSSI_DEVICE,
            unreach: data.UNREACH,
        }
        if (stEvnt === false && data.SET_POINT_TEMPERATURE !== null && data.SET_POINT_TEMPERATURE !== undefined){
            let _state = new Config().instance().checkState("trv", this.address, data.SET_POINT_TEMPERATURE);
            if (_state !== null && _state !== VALID_STATE && data.WINDOW_STATE != 1){
                this.setTargetTemperature(_state)
                state.targetTemperature = _state
                state.level = 0
            }
        } else if (stEvnt === true){
            new Config().instance().setState("trv", this.address, data.SET_POINT_TEMPERATURE);
        }

        if (data.LEVEL != null){
            this.updateAndCheckRelay(data.LEVEL * 100)
        }

        if (data.SET_POINT_MODE != 1){
            this.ccu3.setManualMode(this.address + ":1")
        }

        try {
            let config = new Config().instance().getConfig();
            let nodeId = config.keys.find(k => k.type == "trv" && k.address == this.address).nodeId
            if (nodeId){
                try {
                    this.drax.setState(nodeId, null, state, false)
                } catch (e) {
                    console.log("SetStateError: ", e); console.log("NodeId: ", nodeId);
                    console.log('force quit');
                    process.exit(1);
                    //throw Error(e)
                }
            }
        } catch (e) {
            console.log(e)
        }
    }

    configuration(config){
        var targetTemperature = config.targetTemperature
        var del = config.del

        if (del == 1){
            this.ccu3.deleteDevice(this.address, DELETE_FLAG_RESET);
        } else {
            if (targetTemperature != null){
                try{
                    targetTemperature = parseFloat(targetTemperature)
                    this.setTargetTemperature(targetTemperature)
                } catch (e){
                    console.log(e)
                }
            }
        }
    }

    setTargetTemperature(t){
        new Config().instance().setState("trv", this.address, t);
        this.ccu3.setDeviceValue(this.address + ":1", 'SET_POINT_TEMPERATURE', t)
    }
}

module.exports = {
    Trv: Trv
}