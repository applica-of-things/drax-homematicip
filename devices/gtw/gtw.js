const { Config } = require("../../config/configuration");
const { DELETE_FLAG_RESET } = require("../../homematic/flags");
const GenericDevice = require("../genericDevice");


class Gtw extends GenericDevice {
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

    stateEvent(response){

    }

    handshake(){
        return new Promise((resolve, reject) => {
            try {
                let config = new Config().instance().getConfig();
                let nodeId = config.keys.find(k => k.type == "gtw" && k.address == this.address).nodeId
                resolve()
            } catch (e) {
                console.log("Key missing! address: %s", this.sgtin)
                var node = {
                    id: 0,
                    urn: "gtw:" + this.sgtin + ":" + this.sgtin,
                    supportedTypes: ["hm-gtw"],
                    configurationPublishTopic: "configurations/hmip/" + this.sgtin,
                    statePublishTopic: "states/hmip",
                    initialState: {},
                    name: "GTW-" + this.sgtin + "-" + this.sgtin
                }
                this.drax && this.drax.handshake(node).then((res) => {
                    console.log(res)                
                    var newKey = {
                        "nodeId": res.data.nodeId,
                        "publicKey": new Buffer.from(res.data.publicKey, 'base64').toString('hex'),
                        "privateKey": new Buffer.from(res.data.privateKey, 'base64').toString('hex'),
                        "type": "gtw",
                        "parentAddress": this.sgtin,
                        "address": this.sgtin
                    }
                    let config = new Config().instance().getConfig();
                    config.keys.push(newKey)
                    this.updateConfig(config, () => resolve(), () => reject())
                })
            }
        })

    }

    state(){
        var state = {
            connected: true,
            ip: this.ip
        }
        try {
            let config = new Config().instance().getConfig();
            let nodeId = config.keys.find(k => k.type == "gtw" && k.address == this.address).nodeId
            if (nodeId){
                this.drax.setState(nodeId, null, state, false)
            }
        } catch (e) {
            console.log("Key missing! address: %s", this.address)
        }
    }

    scan(){
        var fn = (value) => {
            var list = value.filter(v => v.SUBTYPE != '').map(d => {
                 return {type: d.TYPE, address: d.ADDRESS}
            })

            this.data = {
                devices: list
            }

            var state = {
                devices: JSON.stringify(this.data.devices),
                connected: true,
                ip: this.ip
            }
            try {
                let config = new Config().instance().getConfig();
                let nodeId = config.keys.find(k => k.type == "gtw" && k.address == this.address).nodeId
                if (nodeId){
                    this.drax && this.drax.setState(nodeId, null, state, false)
                }
                let config = new Config().instance().getConfig();
                this.updateConfig(config, () => resolve(), () => reject())
            } catch (e) {
                console.log("Key missing! address: %s", this.address)
            }
        }
        this.ccu3.listDevices(fn)
    }

    configuration(config){
        var scan = config.scan
        var installMode = config.installMode        

        if (scan != null && scan == 1){
            this.scan()
        }
        if (installMode != null && installMode == 1){
            this.ccu3.setInstallMode(true)
            setTimeout(() => this.scan(), 30000)
        }

    }
}

module.exports = {
    Gtw: Gtw
}