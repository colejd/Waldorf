import { Annotation } from "./annotation.js";

class AnnotationManager {
    constructor(){
        this.annotations = [];
    }

    PopulateFromJSON(json){
        if (json.annotations.length == 0){
            console.warn("JSON contains no annotations.");
        }

        this.annotations = json.annotations.map((object) => {
            return new Annotation(object);
        });

    }

    AnnotationsAtTime(time){


        let timeMS = (time * 1000) | 0;

        // If the last time requested is asked for again, just give back the cached result
        if(timeMS == this.lastTimeRequested){
            //console.log("Using cache");
            return this.cachedResults;
        }
        this.lastTimeRequested = timeMS;

        // Filter all loaded annotations that fit within the range query.
        let filtered = this.annotations.filter(function(item){
            return item.data.beginTime <= timeMS && timeMS <= item.data.endTime;
        });

        // Cache the results
        this.cachedResults = filtered;

        return filtered;
    }

}

export { AnnotationManager };