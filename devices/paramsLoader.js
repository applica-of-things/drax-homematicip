const fs = require('fs');
const readline = require('readline');
const _ = require('underscore');

class ParamsLoader {
     constructor(filename, listeners = []){
        this.file = readline.createInterface({
            input: fs.createReadStream(filename),
            output: process.stdout,
            terminal: false
        });
        this.listeners = listeners
     }

     load(fn){
        this.file.on('line', (line) => {
            this.listeners.forEach(l => {
                l.run(line)
            });
        });

        this.file.on('close', (line) => {
            if (_.isFunction(fn)){
                fn()
            }
        });

     }
}

module.exports = {
    ParamsLoader: ParamsLoader
}



