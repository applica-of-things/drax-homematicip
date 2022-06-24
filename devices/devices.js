const { response } = require("express");
const { FactoryDevice } = require("./factoryDevice");
const { _ } = require("underscore");
const configPath = require("../options");

class Devices {
    constructor(listDevices = null, client = null, 
                ccu3 = null, drax = null, 
                sgtin = null, ip = null, schedule = null){
        this.listDevices = listDevices
        this.ccu3 = ccu3
        this.drax = drax
        this.sgtin = sgtin
        this.ip = ip
        this.client = client
        this.schedule = schedule
    }

    setCCU3(ccu3){
        this.ccu3 = ccu3
    }

    setDrax(drax){
        this.drax = drax
    }

    handshake(){
        return this.listDevices.reduce((p, device) => {
            var dev = new FactoryDevice(this.client, this.ccu3, this.drax, this.sgtin, this.ip).getDevice(device);
            return p.then(() => {
                return dev != null ? dev.handshake() : Promise.resolve();
            })
        }, Promise.resolve()); 
    }

    state(){
        return this.listDevices.reduce((p, device) => {
            var dev = new FactoryDevice(this.client, this.ccu3, this.drax, this.sgtin, this.ip).getDevice(device);
            return p.then(() => {
                return dev != null ? dev.state() : Promise.resolve();
            })
        }, Promise.resolve()); 
    }

    hasAllChannels(response){
        if (response.channels && response.channels.length > 1){
            return true
        } else {
            return false
        }
    }

    stateUnreach(response){
        try{
            var config = require(configPath)
            var key = config.keys.find(k => k.address == response.address)
            var dev = new FactoryDevice(this.client, this.ccu3, this.drax, this.sgtin, this.ip).getDevice({type: key.type, address: response.address})
            dev.stateUnreach(response)
        } catch(e){
            console.log("State Event Error: ", e)
        }
    }

    stateEvent(responses){
        if (_.isArray(responses)){
            responses.forEach((response) => {
                if(this.hasAllChannels(response)){
                    try{
                        var config = require(configPath)
                        var key = config.keys.find(k => k.address == response.address)
                        var dev = new FactoryDevice(this.client, this.ccu3, this.drax, this.sgtin, this.ip).getDevice({type: key.type, address: response.address})
                        dev.stateEvent({...response})
                        responses = responses.filter(r => r.address != response.address)                    
                    } catch(e){
                        console.log("State Event Error: ", e)
                    }
                }
            })
        }
        return responses
    }

    configuration(response){
        console.log(response)

        var type = response.urn.split(":")[0]
        var gtwAddress = response.urn.split(":")[1]
        var address = response.urn.split(":")[2]

        if (gtwAddress == this.sgtin){
            var d = {type, address}
            var dev = new FactoryDevice(this.client, this.ccu3, this.drax, this.sgtin, this.ip).getDevice(d)
    
            if (dev != null){
                dev.configuration(response.configuration)
            }
        }
    }
}

module.exports = {
    Devices: Devices
}