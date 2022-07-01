const { ParamsLoader } = require("./devices/paramsLoader");
const { Sgtin } = require("./devices/ccu3/params/sgtin");
const { Poll } = require("./listeners/time/poll");
const Server = require("./server/server");
const AppliHomeClient = require("./appliHomeClient/client");
const Gateway = require("./homematic/gateway");
const Ip = require("./devices/ccu3/params/ip");
const { Config } = require("./config/configuration");
const { configPath } = require("./options");

var config = require(configPath)

var sgtin = new Sgtin()
var ip = new Ip()
var poll = new Poll()

var args = process.argv.slice(2);

var appliHomeClient = new AppliHomeClient(
    {
        mail: config.mail,
        password: config.password,
        serviceUrl: args[0]
    }
)

var params = new ParamsLoader('/var/hm_mode', [sgtin, ip])
params.load(() => {
    var config = new Config().instance()
    config.addSgtin(sgtin.getParam())
    config.addClient(appliHomeClient)
    config.load().then((res) => {
        console.log(res)
        var gateway = new Gateway(sgtin.getParam(), ip.getParam(), appliHomeClient)
        gateway.addTimeListener(poll)
        gateway.start()
    })
    .catch((e) => {
        process.exit(1)
    })
})