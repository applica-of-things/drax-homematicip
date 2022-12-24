const { reject } = require("underscore");
const _ = require("underscore")
const { Config, VALID_STATE } = require("../../config/configuration");
const { DELETE_FLAG_RESET } = require("../../homematic/flags");
const GenericDevice = require("../genericDevice");

class Wth extends GenericDevice {
    constructor(address, client, ccu3, drax, sgtin, ip){
        super()
        this.data = {}

        this.address = address
        this.ccu3 = ccu3
        this.drax = drax
        
        this.sgtin = sgtin
        this.ip = ip
        this.client = client

        this.levels = []
        this.linkIndex = 0
    }

    handshake(){
        return new Promise((resolve, reject) => {
            try {
                let config = new Config().instance().getConfig();
                let nodeId = config.keys.find(k => k.type == "wth" && k.address == this.address).nodeId
                resolve()
            } catch (e) {
                this.ccu3.addProcess()
                console.log("Key missing! address: %s", this.address)
                var node = {
                    id: 0,
                    urn: "wth:" + this.sgtin + ":" + this.address,
                    supportedTypes: ["hm-wth"],
                    configurationPublishTopic: "configurations/hmip/" + this.sgtin,
                    statePublishTopic: "states/hmip",
                    initialState: {},
                    name: "WTH-" + this.address + "-" + this.sgtin
                }
                this.drax && this.drax.handshake(node).then((res) => {
                    console.log(res)                
                    var newKey = {
                        "nodeId": res.data.nodeId,
                        "publicKey": new Buffer.from(res.data.publicKey, 'base64').toString('hex'),
                        "privateKey": new Buffer.from(res.data.privateKey, 'base64').toString('hex'),
                        "type": "wth",
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

    // updateAndCheckRelay(level){
    //     let relay = new Config().instance().getRelayAverageFromAddress(this.address);
    //     console.log("RELAY: ", relay)
    //     if (relay){
    //         let actualAverage = relay.average || 0
    //         let index = relay.index || 0
    //         let timestamp = relay.timestamp || 0
    //         let now = new Date().getTime()

    //         if (index % relay.nodeAdresses.length == 0 || now - timestamp > 2 * 60 * 1000){
    //             actualAverage = 0
    //             index = 0
    //         }

    //         if (level != 0){
    //             if (relay.nodeAdresses.length > 1){
    //                 actualAverage = actualAverage + level / relay.nodeAdresses.length
    //             }
    //         }
    //         relay.average = actualAverage
    //         relay.index = index + 1
    //         relay.timestamp = new Date().getTime()
    //         new Config().instance().updateRelay(relay)
    //         if (relay.index % relay.nodeAdresses.length == 0){                
    //             if (relay.permanentOff){
    //                 this.turnOffRelay(relay.address)
    //             } else {
    //                 console.log("AVERAGE: ", relay.average)
    //                 if (relay.average > this.ccu3.getThreshold()){
    //                     this.turnOnRelay(relay.address)
    //                 } else {
    //                     this.turnOffRelay(relay.address)
    //                 }
    //             }
    //         }
    //     }
    // }

    // turnOnRelay(relayAddress){
    //     this.ccu3.setDeviceValue(relayAddress + ":3", 'STATE', true)
    // }

    // turnOffRelay(relayAddress){
    //     this.ccu3.setDeviceValue(relayAddress + ":3", 'STATE', false)
    // }

    stateEvent(response){
        console.log("SEND STATE:::", this.address)
        //this.sendState(response)
        this.state()
    }

    state(){
        var callback1 = (data) => {

            var callback2 = (data) => {
                this.data = {...this.data, ...data}
                console.log("DATA::", this.data)
                this.sendState(this.data)
            }

            this.data = {...this.data, ...data}
            this.ccu3.getDeviceValues(this.address + ":1", (d) => callback2({...d, address: this.address, type: 'HmIP-WTH-B'}))
        }

        this.ccu3.getDeviceValues(this.address + ":0", (d) => callback1({...d, address: this.address, type: 'HmIP-WTH-B'}))
    }

    integrateWithFalmot(callback){        
        this.ccu3.getLinks(this.address, callback)
    }

    removeAllLinks(){
        var callback = (value) => {
            var links = value != null && value.map(v => {
                return {
                    receiver: v.RECEIVER,
                    sender: v.SENDER
                }
            }) || []
            links = links.filter(l => l.sender == this.address + ":7")
            links.forEach(link => this.ccu3.removeLink(link.sender, link.receiver))
        }
        this.ccu3.getLinks(this.address, callback)
    }

    stateUnreach(response){
        console.log("UNREACHED! RETRYING", this.address)
        let _state = new Config().instance().getState("wth", this.address);
        if (_state !== null && _state !== VALID_STATE){
            this.setTargetTemperature(_state)
        }
    }

    addLevel(level, onLevel, len){
        this.linkIndex++
        this.levels.push(level)

        if (this.linkIndex >= len){
            if (_.isFunction(onLevel)){
                onLevel()
            }
        }
    }

    getLevels(links, onLevel, onError){
        var len = links.length || 0
        links.forEach(link => {
            this.ccu3.getDeviceValue(link, 'LEVEL', (level) => this.addLevel(level, onLevel, len), (e) => onError(e))
        });
    }

    sendState(data){
        const _cb = (value) => {
            var links = value != null && value.map(v => v.RECEIVER) || []

            const onError = (e) => {
                console.log("ERROR:: No Levels from linked Device")
                var state = {
                    temperature: data.ACTUAL_TEMPERATURE || null,
                    battery: data.OPERATING_VOLTAGE? Math.ceil(Math.min(data.OPERATING_VOLTAGE / 2.8 * 100, 100)): null,
                    lowBattery: data.LOW_BAT,
                    humidity: data.HUMIDITY,
                    address: data.address,
                    targetTemperature: data.SET_POINT_TEMPERATURE || null,
                    windowState: data.WINDOW_STATE,
                    ip: this.ip,
                    rssi: data.RSSI_DEVICE,
                    unreach: data.UNREACH,
                }

                try {
                    let config = new Config().instance().getConfig();
                    let nodeId = config.keys.find(k => k.type == "wth" && k.address == this.address).nodeId
                    if (nodeId){
                        try {
                            this.drax.setState(nodeId, null, state, false)
                        } catch (e) {
                            console.log("SetStateError: ", e); console.log("NodeId: ", nodeId);
                            console.log('force quit');
                            process.exit(1);
                        }
                    }
                } catch (e) {
                    console.log(e)
                }
            }

            const onLevel = () => {
                var _level = this.levels.reduce((a, b) => a + b, 0) / this.levels.length;
                var state = {
                    temperature: data.ACTUAL_TEMPERATURE || null,
                    battery: data.OPERATING_VOLTAGE? Math.ceil(Math.min(data.OPERATING_VOLTAGE / 2.8 * 100, 100)): null,
                    lowBattery: data.LOW_BAT,
                    humidity: data.HUMIDITY,
                    address: data.address,
                    level: _level != undefined && _level != null? _level * 100: null,
                    targetTemperature: data.SET_POINT_TEMPERATURE || null,
                    windowState: data.WINDOW_STATE,
                    ip: this.ip,
                    rssi: data.RSSI_DEVICE,
                    unreach: data.UNREACH,
                }
        
                if (data.SET_POINT_MODE != 1){
                    this.ccu3.setManualMode(this.address + ":1")
                }
        
                // if (_level != null){
                //     this.updateAndCheckRelay(_level * 100)
                // }

                if (data.SET_POINT_TEMPERATURE !== null && data.SET_POINT_TEMPERATURE !== undefined){
                    let _state = new Config().instance().checkState("wth", this.address, data.SET_POINT_TEMPERATURE);
                    if (_state !== null && _state !== VALID_STATE && data.WINDOW_STATE != 1){
                        this.setTargetTemperature(_state)
                    }
                }

                try {
                    let config = new Config().instance().getConfig();
                    let nodeId = config.keys.find(k => k.type == "wth" && k.address == this.address).nodeId
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

            this.getLevels(links, onLevel, onError)
        }
        this.integrateWithFalmot(_cb)        
    }

    configuration(config){
        var targetTemperature = config.targetTemperature
        var del = config.del
        var links = config.links
        var removeAllLinks = config.removeAllLinks

        if (del == 1){
            this.ccu3.deleteDevice(this.address, DELETE_FLAG_RESET);
        } else if (targetTemperature != null && targetTemperature != ''){
            try{
                targetTemperature = parseFloat(targetTemperature)
                this.setTargetTemperature(targetTemperature)
            } catch (e){
                console.log(e)
            }
        } else if (links != null && links != undefined && links != ""){
            var _links = links.split(",")
            _links.forEach(l => {
                var linkName = this.address + ":7" + "-" + l
                var linkDescription = this.address + ":7" + "-" + l + "_WTH"
                this.ccu3.addLink(this.address + ":7", l, linkName, linkDescription)
            })
        } else if (removeAllLinks == 1){
            this.removeAllLinks()
        }
    }

    setTargetTemperature(t){
        new Config().instance().setState("wth", this.address, t);
        this.ccu3.setDeviceValue(this.address + ":1", 'SET_POINT_TEMPERATURE', t)
    }
}

module.exports = {
    Wth: Wth
}