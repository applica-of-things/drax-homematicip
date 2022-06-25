const express = require('express');
const Http = require('./http/http');
const bodyParser = require('body-parser')

class Server {
    constructor(host = "localhost", port = "8088"){
        this.host = host
        this.port = port
        this.app = express()
        this.app.use(bodyParser.json());
    }


    start(){
        this.http = new Http(this.app)
        this.app.listen(this.port, () => 
            console.log(`Server is running on http://${this.host}:${this.port}`)
        )
    }

    stop(){

    }
}

module.exports = Server