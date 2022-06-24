const { Devices } = require("../../devices/devices")
const { TimeListener } = require("./timeListener")

class Poll extends TimeListener {
    constructor(){
        super()

    }

    run(ccu3, drax, sgtin = null, ip = null, client = null){
        var fn = (value) => {
            var list = value.filter(v => v.SUBTYPE != '').map(d => {
                 return {type: d.TYPE, address: d.ADDRESS}
            })
            console.log(list)

            var devices = new Devices(list, client, ccu3, drax, sgtin, ip)
            devices.handshake().then(() => {
                devices.state()
            })            
        }
        ccu3.listDevices(fn)
    }
}

module.exports = {
    Poll: Poll
}