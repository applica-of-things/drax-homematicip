const { reject } = require("underscore")
const { Config, VALID_STATE } = require("../../config/configuration")
const { DELETE_FLAG_RESET } = require("../../homematic/flags")
const GenericDevice = require("../genericDevice")

class Relay extends GenericDevice {
    constructor(address, client, ccu3, drax, sgtin, ip) {
        super()
        this.data = {}

        this.address = address
        this.ccu3 = ccu3
        this.drax = drax

        this.sgtin = sgtin
        this.ip = ip
        this.client = client
    }

    handshake() {
        return new Promise((resolve, reject) => {
            try {
                let config = new Config().instance().getConfig();
                let nodeId = config.keys.find(k => k.type == 'relay' && k.address == this.address).nodeId
                resolve()
            } catch (e) {
                this.ccu3.addProcess()
                console.log("Key missing! address: %s", this.address)
                var node = {
                    id: 0,
                    urn: "relay:" + this.sgtin + ":" + this.address,
                    supportedTypes: ["hm-relay"],
                    configurationPublishTopic: "configurations/hmip/" + this.sgtin,
                    statePublishTopic: "states/hmip",
                    initialState: {},
                    name: "RELAY-" + this.address + "-" + this.sgtin
                }
                this.drax.handshake(node).then((res) => {
                    console.log(res)
                    var newKey = {
                        "nodeId": res.data.nodeId,
                        "publicKey": new Buffer.from(res.data.publicKey, 'base64').toString('hex'),
                        "privateKey": new Buffer.from(res.data.privateKey, 'base64').toString('hex'),
                        "type": "relay",
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

    state() {
        var callback1 = (data) => {
            console.log("DATA0::", data)

            var callback2 = (data) => {
                this.data = { ...this.data, ...data }
                console.log("DATA3::", data)

                this.sendState(this.data)
            }
            this.data = { ...this.data, ...data }
            this.ccu3.getDeviceValues(this.address + ":3", (d) => callback2({ ...d, address: this.address, type: 'HmIP-PCBS' }))
        }
        this.ccu3.getDeviceValues(this.address + ":0", (d) => callback1({ ...d, address: this.address, type: 'HmIP-PCBS' }))
    }

    stateUnreach(response){
        console.log("UNREACHED! RETRYING", this.address)
        let _state = new Config().instance().getState("relay", this.address);
        if (_state !== null && _state !== VALID_STATE){
            this.setRelayState(_state)
        }
    }

    sendState(data) {
        var state = {
            rssi: data.RSSI_DEVICE,
            unreach: data.UNREACH,
            ip: this.ip,
            state: data.STATE,
        }
        console.log("STATEEEEE:::", state)
        if (data.STATE !== null && data.STATE !== undefined){
            let _state = new Config().instance().checkState("relay", this.address, data.STATE);
            console.log("STATEEEEE_relay:::", _state)
            if (_state !== null && _state !== VALID_STATE){
                console.log("STATEEEEE_relay_after:::", _state)
                this.setRelayState(_state)
            }
        } else {
            this.ccu3.setDeviceValue(this.address + ":3", 'STATE', false)
        }

        try {
            let config = new Config().instance().getConfig();
            let nodeId = config.keys.find(k => k.type == "relay" && k.address == this.address).nodeId
            if (nodeId) {
                try {
                    this.drax && this.drax.setState(nodeId, null, state, false)
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

    configuration(config) {
        var state = config.state
        var del = config.del
        var stateAutomation = config.stateAutomation
        var devicesList = config.devicesList
        var threshold = config.threshold
        var permanentOff = config.permanentOff

        if (devicesList){
            try {
                var nodeAdresses = devicesList.split(",")
                let conf = new Config().instance().getConfig();
                let relay = conf.keys.find(k => k.type == "relay" && k.address == this.address)
                if (relay){
                    new Config().instance().updateRelay({...relay, nodeAdresses: nodeAdresses, average: 0, threshold})
                    this.setRelayState(false)
                }
            } catch (e) {
                console.log(e)
            }
        }

        if (permanentOff){
            try {
                let relay = new Config().instance().getRelayAverage(this.address);
                if (relay){
                    relay.permanentOff = parseInt(permanentOff)
                    new Config().instance().updateRelay(relay)
                    if (relay.permanentOff == 0 && relay.average && relay.average > this.ccu3.getThreshold()){
                        this.setRelayState(true)
                    } else {
                        this.setRelayState(false)
                    }
                }
            } catch (e) {
                console.log(e)
            }
        }

        if (threshold){
            try {
                let relay = new Config().instance().getRelayAverage(this.address);
                if (relay){
                    relay.threshold = threshold
                    new Config().instance().updateRelay(relay)
                    this.setRelayState(false)
                }
            } catch (e) {
                console.log(e)
            }
        }

        if (del == 1) {
            this.ccu3.deleteDevice(this.address, DELETE_FLAG_RESET);
        }

        if (stateAutomation == 0) {
            this.setRelayState(false)
        }

        if (state == 1) {
            this.setRelayState(true)
        } else if (state == 0) {
            this.setRelayState(false)
        }
    }

    setRelayState(value){
        new Config().instance().setState("relay", this.address, value);
        this.ccu3.setDeviceValue(this.address + ":3", 'STATE', value)
    }

}
module.exports = {
    Relay: Relay
}