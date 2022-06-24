const { DELETE_FLAG_RESET } = require("../../homematic/flags");
const configPath = require("../../options");
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

    state(){        
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
                ip: this.ip
            }
            try {
                let config = require(configPath);
                let nodeId = config.keys.find(k => k.type == "gtw" && k.address == this.address).nodeId
                if (nodeId){
                    this.drax && this.drax.setState(nodeId, null, state, false)
                }
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