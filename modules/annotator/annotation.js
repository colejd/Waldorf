/// A wrapper for W3C Open Annotation JSON objects.
class Annotation {
    constructor(json = null){

        this["@context"] = "http://www.w3.org/ns/anno.jsonld";
        this["type"] = "Annotation";
        this["motivation"] = "highlighting";

        this["body"] = [];
        this["target"] = {};

        if(json) {
            // Merge the json into this class.
            Object.assign(this, json);

            // Compute read only easy access properties

            let timeSlice = this.target.selector.filter(item => item.type === "FragmentSelector")[0].value;
            timeSlice = timeSlice.replace("t=", "");

            /// Start time in seconds
            this.beginTime = parseFloat(timeSlice.split(",")[0]);

            /// End time in seconds
            this.endTime = parseFloat(timeSlice.split(",")[1]);

            /// Extract tags from annotation
            this.tags = this.body.filter(item => item.purpose === "tagging").map(item => item.value);
        }

    }

    getPoly() {
        let pointsSelector = this.target.selector.filter(item => item.type === "SvgSelector");

        if(pointsSelector.length == 0) return null;

        // Parse the points array from the annotation
        let pointsSvg = pointsSelector[0].value;
        let regExString = new RegExp("(?:points=')(.*?)(?:')", "ig"); //set ig flag for global search and case insensitive
        
        let pointsRE = regExString.exec(pointsSvg)[1];
        let pointsData = pointsRE.trim().split(" ").map(item => item.split(","));

        return pointsData;
    }

    // toString() {
        
    // }

    // ToHTML() {
    //     let lines = ""
        
    //     // Represent data
    //     lines += "<strong><em>{Data}</em></strong><br>";
    //     for(let propName in this.data) {
    //         let propValue = this.data[propName];
    //         lines += "&emsp;<em>[" + propName + "]</em><br>&emsp;&emsp;" + propValue + "<br>";
    //     }
        
    //     // Represent metadata
    //     lines += "<strong><em>{Metadata}</em></strong><br>";
    //     for(let propName in this.metadata) {
    //         let propValue = this.metadata[propName];
    //         lines += "&emsp;<em>[" + propName + "]</em><br>&emsp;&emsp;" + propValue + "<br>";
    //     }
    //     return lines;
    // }

    /**
     * Returns this annotation as a W3C Open Annotation Model compliant JSONLD structure.
     */
    // AsOpenAnnotation() {
    //     return Annotation.OpenAnnotation(this);
    // }

    // static FromOpenAnnotation(json) {

    // }

    /**
     * Returns an annotation object from the server as a W3C Open Annotation Model compliant JSONLD structure.
     */
    static OpenAnnotation(serverJSON) {
        // let model = {
        //     "@context": "http://www.w3.org/ns/anno.jsonld",
        //     //"id": "Unspecified", //"http://example.org/anno3"; // specific URL (IRI) pointer to the annotation
        //     "type": "Annotation",
        //     "motivation": "highlighting"
        // };

        // // Create and add the creator metadata if it's available
        // if(serverJSON.metadata.userName && serverJSON.metadata.userEmail){
        //     let creator = {
        //         //id: "Unspecified",
        //         "type": "Person",
        //         "nickname": serverJSON.metadata.userName,
        //         "email": sha1(serverJSON.metadata.userEmail)
        //     };
        //     model["creator"] = creator;
        // }

        // let body = [];

        // // Build text descriptor
        // let bodyText = {
        //     "type" : "TextualBody",
        //     "value" : serverJSON.data.text,
        //     "format" : "text/plain",
        //     "language" : "en",
        //     "purpose": "describing"
        // };
        // body.push(bodyText);

        // // Build tag descriptors
        // for(let tagStr of serverJSON.data.tags){
        //     let bodyTag = {
        //         "type": "TextualBody",
        //         "purpose": "tagging",
        //         "value": tagStr
        //     }
        //     body.push(bodyTag);
        // }

        // model["body"] = body;

        // let target = {
        //     "id": serverJSON.metadata.location, // URL of the video
        //     "type": "Video"
        // }

        // let selectors = [];

        // // Build polygon selector
        // let points = JSON.parse(serverJSON.data.pointsArray);
        // let svgHTML = "<svg:svg viewBox='0 0 100 100' preserveAspectRatio='none'><polygon points='" + points.join(" ") + "' /></svg:svg>";  // http://stackoverflow.com/a/24898728
        // let polygonSelector = {
        //     "type": "SvgSelector",
        //     "value": svgHTML
        // }
        // selectors.push(polygonSelector);

        // // Build time selector
        // let timeSelector = {
        //     "type": "FragmentSelector",
        //     "conformsTo": "http://www.w3.org/TR/media-frags/", // See media fragment specification
        //     "value": `t=${serverJSON.data.beginTime / 1000},${serverJSON.data.endTime / 1000}` // Time interval in seconds
        // }
        // selectors.push(timeSelector);

        // // Finalize target section
        // target["selector"] = selectors;

        
        // model["target"] = target;

        // return model;
    }

}



export { Annotation };