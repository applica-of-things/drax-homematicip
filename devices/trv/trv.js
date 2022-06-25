const { reject } = require("underscore");
const { DELETE_FLAG_RESET } = require("../../homematic/flags");
const configPath = require("../../options");
const GenericDevice = require("../genericDevice");


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
                let config = require(configPath);
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
                    let config = require(configPath);
                    config.keys.push(newKey)
                    this.updateConfig(config, this.client, () => resolve(), () => reject())
                })
            }
        })

    }

    stateEvent(response){
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

        if (data.SET_POINT_MODE != 1){
            this.ccu3.setManualMode(this.address + ":1")
        }

        try {
            let config = require(configPath);
            let nodeId = config.keys.find(k => k.type == "trv" && k.address == this.address).nodeId
            if (nodeId){
                this.drax.setState(nodeId, null, state, false)
            }
        } catch (e) {
            console.log("Key missing! address: %s", this.address)
        }
    }

    configuration(config){
        var targetTemperature = config.targetTemperature
        var del = config.del

        if (del == 1){
            this.ccu3.deleteDevice(this.address, DELETE_FLAG_RESET);
        } else {
            if (targetTemperature != null){
                this.ccu3.setDeviceValue(this.address + ":1", 'SET_POINT_TEMPERATURE', parseFloat(targetTemperature))
            }
        }
    }
}

module.exports = {
    Trv: Trv
}