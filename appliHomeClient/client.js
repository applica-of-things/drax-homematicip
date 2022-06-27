const axios = require('axios');

class AppliHomeClient {
    constructor(params = null){
        this.params = params || {serviceUrl: "https://draxcloud.com/trv"}
        this.token = null
    }

    login(){
        return new Promise((resolve, reject) => {
            var data = { mail: this.params.mail, password: this.params.password }
            axios
                .post(this.params.serviceUrl + '/auth/login', null, {params: data})
                .then(res => {
                    console.log(`statusCode: ${res.status}`);
                    if (res.data.responseCode == 1003){
                        var d = {
                            ...data, 
                            name: "Admin",
                            lastname: "Admin",
                            password: this.params.password,
                            passwordConfirm: this.params.password,
                            privacyPolicy: true,
                            mail: this.params.mail
                        }
                        this.register(d).then((res) => {
                            this.login()
                        }).catch((e) => console.log(e))
                    } else if (res.data.responseCode != 0){
                        reject(res.data.responseCode)
                    } else {
                        console.log(res);
                        this.token = res.data.token
                        resolve(res)
                    }
                    
                })
                .catch(error => {                    
                    console.error(error);
                    reject(error)
                });
        })
    }

    register(data){
        return new Promise((resolve, reject) => {
            axios
                .post(this.params.serviceUrl + '/auth/register', data)
                .then(res => {                    
                    console.log(`statusCode: ${res.status}`);
                    if (res.data.responseCode != 0 || (res.data.value && res.data.value.errors != null && res.data.value.errors.length > 0)){
                        reject(res.data.responseCode)
                    } else {
                        console.log(res);
                        resolve(res)
                    }
                })
                .catch(error => {                    
                    console.error(error);
                    reject(error)
                });
        })
    }

    saveKeystore(data){
        return new Promise((resolve, reject) => {
            var headers = {"x-auth-token": this.token}
            axios
                .post(this.params.serviceUrl + '/keystore/saveKeystore', data, {headers})
                .then(res => {                    
                    console.log(`statusCode: ${res.status}`);
                    if (res.data.responseCode != 0){
                        reject(res.data.responseCode)
                    } else {
                        console.log(res);
                        resolve(res)
                    }
                })
                .catch(error => {                    
                    console.error(error);
                    reject(error)
                });
        })
    }

    loadConfig(sgtin){
        return new Promise((resolve, reject) => {
            var headers = {"x-auth-token": this.token}
            var data = sgtin
            axios
                .post(this.params.serviceUrl + '/ccu3/config', data, {headers})
                .then(res => {                    
                    console.log(`statusCode: ${res.status}`);
                    if (res.data.responseCode != 0){
                        reject(res.data.responseCode)
                    } else {
                        console.log(res);
                        resolve(res)
                    }
                })
                .catch(error => {                    
                    console.error(error);
                    reject(error)
                });
        })
    }
}

module.exports = AppliHomeClient