let sha1 = require('sha1');

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

    /**
     * Returns this annotation as a W3C Open Annotation Model compliant JSONLD structure.
     */
    AsOpenAnnotation() {
        return Annotation.OpenAnnotation(this);
    }

    /**
     * Returns an annotation object from the server as a W3C Open Annotation Model compliant JSONLD structure.
     */
    static OpenAnnotation(serverJSON) {
        let model = {
            "@context": "http://www.w3.org/ns/anno.jsonld",
            //"id": "Unspecified", //"http://example.org/anno3"; // specific URL (IRI) pointer to the annotation
            "type": "Annotation",
            "motivation": "highlighting"
        };

        // Create and add the creator metadata if it's available
        if(serverJSON.metadata.userName && serverJSON.metadata.userEmail){
            let creator = {
                //id: "Unspecified",
                "type": "Person",
                "nickname": serverJSON.metadata.userName,
                "email": sha1(serverJSON.metadata.userEmail)
            };
            model["creator"] = creator;
        }

        let body = [];

        // Build text descriptor
        let bodyText = {
            "type" : "TextualBody",
            "value" : serverJSON.data.text,
            "format" : "text/plain",
            "language" : "en",
            "purpose": "describing"
        };
        body.push(bodyText);

        // Build tag descriptors
        for(let tagStr of serverJSON.data.tags){
            let bodyTag = {
                "type": "TextualBody",
                "purpose": "tagging",
                "value": tagStr
            }
            body.push(bodyTag);
        }

        model["body"] = body;

        let target = {
            "id": serverJSON.metadata.location, // URL of the video
            "type": "Video"
        }

        let selectors = [];

        // Build polygon selector
        let points = JSON.parse(serverJSON.data.pointsArray);
        let svgHTML = "<svg:svg viewBox='0 0 100 100' preserveAspectRatio='none'><polygon points='" + points.join(" ") + "' /></svg:svg>";  // http://stackoverflow.com/a/24898728
        let polygonSelector = {
            "type": "SvgSelector",
            "value": svgHTML
        }
        selectors.push(polygonSelector);

        // Build time selector
        let timeSelector = {
            "type": "FragmentSelector",
            "conformsTo": "http://www.w3.org/TR/media-frags/", // See media fragment specification
            "value": `t=${serverJSON.data.beginTime / 1000},${serverJSON.data.endTime / 1000}` // Time interval in seconds
        }
        selectors.push(timeSelector);

        // Finalize target section
        target["selector"] = selectors;

        
        model["target"] = target;

        return model;
    }

}



export { Annotation };