// Bring in build config options
let metaconfig = require("../config.json");

class PreferenceManager {
    constructor() {

    }

    GetJSON(callback){

        //let loc = window.location.pathname;
        //let dir = loc.substring(0, loc.lastIndexOf('/'));
        
        let dir = "./dist/";
        //console.log(dir + metaconfig.configFile);

        if(this.cachedJSON != null){
            callback(this.cached);
        }
        else{
            $.ajax({
                dataType: "json",
                url: dir + metaconfig.configFile,
                success: (data)=>{
                    this.cachedJSON = data;
                    callback(this.cachedJSON);
                }
            });
        }

    }

}

export let preferences = new PreferenceManager();