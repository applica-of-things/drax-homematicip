const { ParamsLoader } = require("./devices/paramsLoader");
const { Sgtin } = require("./devices/ccu3/params/sgtin");
const { Poll } = require("./listeners/time/poll");
const Server = require("./server/server");
const AppliHomeClient = require("./appliHomeClient/client");
const Gateway = require("./homematic/gateway");
const Ip = require("./devices/ccu3/params/ip");

var sgtin = new Sgtin()
var ip = new Ip()
var poll = new Poll()

var args = process.argv.slice(2);

var appliHomeClient = new AppliHomeClient(
    {
        mail: "hm_drax@applica5.guru",
        password: "MefracruPH98___",
        serviceUrl: args[0]
    }
)

var params = new ParamsLoader('/var/hm_mode', [sgtin, ip])
params.load(() => {
    console.log(sgtin.getParam())
    console.log(ip.getParam())
    var server = new Server()
    server.start()
    var gateway = new Gateway(sgtin.getParam(), ip.getParam(), null)
    gateway.addTimeListener(poll)
    gateway.start()
})