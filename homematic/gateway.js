const { Drax } = require("drax-sdk-nodejs");
const { Keystore } = require("drax-sdk-nodejs/keystore");

const { CCU3 } = require("./ccu3");
var config = new Config().instance().getConfig()
new Keystore().instance().addConfig(config)


const { Devices } = require("../devices/devices");
const GenericDevice = require("../devices/genericDevice");
const { Config } = require("../config/configSingleton");


class Schedule {
    constructor(interval, listeners = [], ccu3 = {}, drax = {}, sgtin = null, ip = null, client) {
        this.interval = interval;
        this.listeners = listeners
        this.ccu3 = ccu3
        this.drax = drax
        this.sgtin = sgtin
        this.ip = ip
        this.client = this.client
        this.watchId = null
    }

    resetTimeInterval() {
        this.stop()
        this.start()
    }

    init() {
        this.listeners.forEach(l => {
            l.run(this.ccu3, this.drax, this.sgtin, this.ip, this.client)
        })
    }

    start() {
        this.watchId = setInterval(() => {
            this.listeners.forEach(l => {
                l.run(this.ccu3, this.drax, this.sgtin, this.ip, this.client)
            })
        }, this.interval);
    }

    stop() {
        if (this.watchId) {
            clearInterval(this.watchId);
        }
    }
}

class Gateway extends GenericDevice {
    constructor(sgtin, ip, client) {
        super()
        this.sgtin = sgtin
        this.ip = ip
        this.params = {
            host: null,
            port: null,
            vhost: null,
            config
        }

        this.timeListeners = []
        this.configurationListeners = []
        this.client = client
    }

    addConfigurationListener(listener) {
        this.configurationListeners.push(listener)
    }

    addTimeListener(listener) {
        this.timeListeners.push(listener)
    }

    handshake(){
        var gatewayNode = {
            id: 0,
            urn: "gtw:" + this.sgtin + ":" + this.sgtin,
            supportedTypes: ["hm-gtw"],
            configurationPublishTopic: "configurations/hmip/" + this.sgtin,
            statePublishTopic: "states/hmip",
            initialState: { ip: this.ip },
            name: "GTW-" + this.sgtin
        }
        this.drax && this.drax.handshake(gatewayNode)
        .then((res) => {
            console.log(res)
            try {
                new Keystore().instance().getPrivateKey(res.data.nodeId)
            } catch (e) {
                var newKey = {
                    "nodeId": res.data.nodeId,
                    "publicKey": new Buffer.from(res.data.publicKey, 'base64').toString('hex'),
                    "privateKey": new Buffer.from(res.data.privateKey, 'base64').toString('hex'),
                    "type": "gtw",
                    "parentAddress": this.sgtin,
                    "address": this.sgtin
                }
                config.keys.push(newKey)
            }

            this.updateConfig(config, this.client)

            this.ccu3 = new CCU3(
                config.ccu3.address, 
                config.ccu3.port, 
                config.ccu3.credentials,
                config.ccu3.serverHost,
                config.ccu3.serverPort)

            this.ccu3.registerServer().then(() => {
                this.init()
            })
        })
        .catch(e => {
            console.log(e)
            //setTimeout(() => this.handshake(), 10000)            
            this.drax = null

            this.ccu3 = new CCU3(
                config.ccu3.address, 
                config.ccu3.port, 
                config.ccu3.credentials,
                config.ccu3.serverHost,
                config.ccu3.serverPort)

            this.ccu3.registerServer().then(() => {
                this.init()
            })
        })
    }

    start() {        
        this.drax = new Drax(this.params)
        this.drax.start().then(() => {
            this.handshake()
        })
    }

    init() {
        try{
            this.ccu3.subscribe()
            this.schedule = new Schedule(config.ccu3.interval_min * 60 * 1000, this.timeListeners, this.ccu3, this.drax, this.sgtin, this.ip, this.client)
            this.schedule.init()
            this.schedule.start()
    
            var devices = new Devices([], this.client, this.ccu3, this.drax, this.sgtin, this.ip, this.schedule)
            this.ccu3.addEventListener(devices)
            this.addConfigurationListener(devices)
    
            this.drax && this.drax.addConfigurationListener("configurations/hmip/" + this.sgtin, this.configurationListeners)
        } catch(e){
            this.ccu3.unsubscribe()
        }
    }

    stop() {
        this.schedule.stop()
        this.drax && this.drax.stop()
    }

}

module.exports = Gateway