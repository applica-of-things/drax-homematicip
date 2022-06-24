class TimeListener {
    constructor(){
        this.listeners = []
    }

    addListener(listener){
        this.listeners.push(listener)
    }

    run(ccu3, drax){
        console.log("CCU3: ", ccu3)
        console.log("Drax: ", drax)
    }
}

module.exports = {
    TimeListener: TimeListener
}