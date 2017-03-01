
class Annotation{
    constructor(json){
        // We could extend the JSON object directly but I'm worried about
        // name collisions. We'll just make it a property of the class.
        this.data = json.data;
        this.metadata = json.metadata;
    }

    ToHTML() {
        let lines = ""
        
        // Represent data
        lines += "<strong><em>{Data}</em></strong><br>";
        for(let propName in this.data) {
            let propValue = this.data[propName];
            lines += "&emsp;<em>[" + propName + "]</em><br>&emsp;&emsp;" + propValue + "<br>";
        }
        
        // Represent metadata
        lines += "<strong><em>{Metadata}</em></strong><br>";
        for(let propName in this.metadata) {
            let propValue = this.metadata[propName];
            lines += "&emsp;<em>[" + propName + "]</em><br>&emsp;&emsp;" + propValue + "<br>";
        }
        return lines;
    }

}

export { Annotation };