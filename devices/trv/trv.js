const { reject } = require("underscore");
const { Config } = require("../../config/configuration");
const { DELETE_FLAG_RESET } = require("../../homematic/flags");
const { FactoryDevice } = require("../factoryDevice");
const GenericDevice = require("../genericDevice");
const { Relay } = require("../relay/relay");


class Trv extends GenericDevice {
    constructor(address, client, ccu3, drax, sgtin, ip){
        super()
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
                })
            }
        })

    }

    updateAndCheckRelay(level){
        let relay = new Config().instance().getRelayAverageFromTrv(this.address);
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
                    if (relay.average > 30){
                        this.turnOnRelay(relay.address)
                    } else {
                        this.turnOffRelay(relay.address)
                    }
                }
            }
        }
    }

    turnOnRelay(relayAddress){
        this.ccu3.setDeviceValue(relayAddress + ":3", 'STATE', true)
    }

    turnOffRelay(relayAddress){
        this.ccu3.setDeviceValue(relayAddress + ":3", 'STATE', false)
    }

    stateEvent(response){
        console.log("SEND STATE:::", this.address)
        this.sendState(response)
    }

    stateUnreach(response){
        this.sendState(response)
    }

    state(){
        var callback1 = (data) => {

            var callback2 = (data) => {
                this.data = {...this.data, ...data}
                console.log("DATA::", this.data)
                this.sendState(this.data)
            }

            this.data = {...this.data, ...data}
            this.ccu3.getDeviceValues(this.address + ":1", (d) => callback2({...d, ...this.device}))
        }

        this.ccu3.getDeviceValues(this.address + ":0", (d) => callback1({...d, address: this.address, type: 'HmIP-eTRV-B'}))
    }

    sendState(data){
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
                    throw Error(e)
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
                    this.ccu3.setDeviceValue(this.address + ":1", 'SET_POINT_TEMPERATURE', targetTemperature)
                } catch (e){
                    console.log(e)
                }
            }
        }
    }
}

module.exports = {
    Trv: Trv
}