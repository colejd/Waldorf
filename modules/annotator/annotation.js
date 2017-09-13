/// A wrapper for W3C Open Annotation JSON objects.
class Annotation {
    constructor(json = null){

        this["@context"] = "http://www.w3.org/ns/anno.jsonld";
        this["type"] = "Annotation";
        this["motivation"] = "highlighting";

        this["body"] = [];
        this["target"] = {};

        //delete this.beginTime;
        //delete this.endTime;
        //delete this.tags;

        if(json) {
            // Merge the json into this class.
            Object.assign(this, json);

            // Compute read only easy access properties
            this.recalculate();
        }

    }

    /// Compute read only easy access properties
    recalculate() {
        let timeSlice = this.target.selector.filter(item => item.type === "FragmentSelector")[0].value;
        timeSlice = timeSlice.replace("t=", "");

        /// Start time in seconds
        this.beginTime = parseFloat(timeSlice.split(",")[0]);

        /// End time in seconds
        this.endTime = parseFloat(timeSlice.split(",")[1]);

        /// Extract tags from annotation
        this.tags = this.body.filter(item => item.purpose === "tagging").map(item => item.value);
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

}



export { Annotation };