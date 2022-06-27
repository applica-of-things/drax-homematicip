const { reject } = require("underscore")
const { Config } = require("../../config/configSingleton")
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
            this.ccu3.getDeviceValues(this.address + ":3", (d) => callback2({ ...d, ...this.device }))
        }
        this.ccu3.getDeviceValues(this.address + ":0", (d) => callback1({ ...d, address: this.address, type: 'HmIP-PCBS' }))
    }

    stateUnreach(response){
        this.sendState(response)
    }

    sendState(data) {
        var state = {
            rssi: data.RSSI_DEVICE,
            unreach: data.UNREACH,
            ip: this.ip,
            state: data.STATE,
        }

        try {
            let config = new Config().instance().getConfig();
            let nodeId = config.keys.find(k => k.type == "relay" && k.address == this.address).nodeId
            if (nodeId) {
                this.drax && this.drax.setState(nodeId, null, state, false)
            }
        } catch (e) {
            console.log("Key missing! address: %s", this.address)
        }
    }

    configuration(config) {
        var state = config.state
        var del = config.del
        var stateAutomation = config.stateAutomation

        if (del == 1) {
            this.ccu3.deleteDevice(this.address, DELETE_FLAG_RESET);
        }

        if (stateAutomation == 0) {
            this.ccu3.setDeviceValue(this.address + ":3", 'STATE', false)
        }

        if (state == 1) {
            this.ccu3.setDeviceValue(this.address + ":3", 'STATE', true)
        } else if (state == 0) {
            this.ccu3.setDeviceValue(this.address + ":3", 'STATE', false)
        }
    }

}
module.exports = {
    Relay: Relay
}