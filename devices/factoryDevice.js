const { Gtw } = require("./gtw/gtw")
const { Sth } = require("./sth/sth")
const { Trv } = require("./trv/trv")
const { Relay } = require("./relay/relay")

class FactoryDevice {
    constructor(client, ccu3, drax, sgtin, ip) {        
        this.ccu3 = ccu3
        this.drax = drax
        this.sgtin = sgtin
        this.ip = ip
        this.client = client
    }

    state(){}

    getDevice(device){
        switch(device.type){
            case 'HmIP-PCBS':
            case 'relay':
                return new Relay(device.address, this.client, this.ccu3, this.drax, this.sgtin, this.ip)
            case 'HmIP-STH':
            case 'sth':
                return new Sth(device.address, this.client, this.ccu3, this.drax, this.sgtin, this.ip)
            case 'HmIP-eTRV-B':
            case 'trv':
                return new Trv(device.address, this.client, this.ccu3, this.drax, this.sgtin, this.ip)

            case 'gtw':
                return new Gtw(device.address, this.client, this.ccu3, this.drax, this.sgtin, this.ip)     

            default:
                return null
        }
    }

}

module.exports = {
    FactoryDevice: FactoryDevice
}