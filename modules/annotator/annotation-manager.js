import { Annotation } from "./annotation.js";

class AnnotationManager {
    constructor(){
        this.annotations = [];
    }

    PopulateFromJSON(json){
        if (json.length == 0){
            console.warn("JSON contains no annotations.");
        }

        this.annotations = [];
        for(let object of json){
            this.RegisterAnnotation(object);
        }

    }

    RegisterAnnotation(jsonObject){
        //console.log("Registering new annotation with ID " + jsonObject.id);
        let anno = new Annotation(jsonObject);
        this.annotations.push(anno);
    }

    RemoveAnnotation(id){
        //console.log("Removing: " + id);
        this.annotations = this.annotations.filter((obj) => {
            return obj.id !== id;
        });
    }

    /**
     * Update the given annotation in the stored array
     */
    UpdateAnnotation(annotation, oldID){
        //console.log("Updating annotation ID " + oldID + " to " + annotation.metadata.id);
        this.RemoveAnnotation(oldID);
        this.RegisterAnnotation(annotation);
    }

    AnnotationsAtTime(time){

        // TODO: Reenable with some kind of force parameter

        // // If the last time requested is asked for again, just give back the cached result
        // if(timeMS == this.lastTimeRequested){
        //     //console.log("Using cache");
        //     return this.cached;
        // }
        // this.lastTimeRequested = timeMS;

        // Filter all loaded annotations that fit within the range query.
        let filtered = this.annotations.filter(function(item){
            return item.beginTime <= time && time <= item.endTime;
        });

        this.cached = filtered;

        return filtered;
    }

}

export { AnnotationManager };