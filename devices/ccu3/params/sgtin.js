class Sgtin {

    constructor(){
        this.param = null
    }

    run(line){        
        if (line.includes('HM_HMIP_SGTIN')){
            this.param = line.split("=")[1].replace(/'/g, "")
        }
    }

    getParam(){
        return this.param
    }

}

module.exports = {
    Sgtin: Sgtin
}