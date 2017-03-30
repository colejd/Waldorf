import { Annotation } from "./annotation.js";

class AnnotationManager {
    constructor(){
        this.annotations = [];
    }

    PopulateFromJSON(json){
        if (json.annotations.length == 0){
            console.warn("JSON contains no annotations.");
        }

        this.annotations = [];
        for(let object of json.annotations){
            this.RegisterAnnotation(object);
        }

    }

    RegisterAnnotation(jsonObject){
        let anno = new Annotation(jsonObject);
        this.annotations.push(anno);
    }

    RemoveAnnotation(annotation){
        let id = annotation.metadata.id;
        this.annotations = this.annotations.filter((obj) => {
            return obj.metadata.id !== id;
        });
    }

    /**
     * Update the given annotation in the stored array
     */
    UpdateAnnotation(annotation){
        this.RemoveAnnotation(annotation);
        this.RegisterAnnotation(annotation);
    }

    AnnotationsAtTime(time){


        let timeMS = (time * 1000) | 0;

        // TODO: Reenable with some kind of force parameter

        // // If the last time requested is asked for again, just give back the cached result
        // if(timeMS == this.lastTimeRequested){
        //     //console.log("Using cache");
        //     return this.cached;
        // }
        // this.lastTimeRequested = timeMS;

        // Filter all loaded annotations that fit within the range query.
        let filtered = this.annotations.filter(function(item){
            return item.data.beginTime <= timeMS && timeMS <= item.data.endTime;
        });

        this.cached = filtered;

        return filtered;
    }

}

export { AnnotationManager };