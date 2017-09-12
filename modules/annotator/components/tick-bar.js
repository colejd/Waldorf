
class TickBar {
    constructor(annotator){
        this.annotator = annotator;

        this.ticks = [];

        // Create the element
        this.$tickBar = $("<div class='annotator-tickbar'></div>");
        this.annotator.player.controlBar.$container.append(this.$tickBar);

        this.annotator.$container.on("OnAnnotationsLoaded", 
            (event, annotationManager) => this.LoadAnnotations(annotationManager));

        this.annotator.$container.on("OnAnnotationRegistered",
            (event, annotation) => this.LoadAnnotation(annotation));

        this.annotator.$container.on("OnAnnotationRemoved",
            (event, id) => this.RemoveAnnotation(id));
            
    }

    LoadAnnotations(annotationManager){
        this.Clear();

        for(let annotation of annotationManager.annotations){
            this.LoadAnnotation(annotation);
        }
    }

    LoadAnnotation(annotation){
        let $tick = $("<div class='annotator-tickbar-tick'></div>").appendTo(this.$tickBar);

        // Add the ID of the annotation to its corresponding tick so we can reference it later
        $tick.data("annotation-id", annotation.id);

        let beginTime = annotation.beginTime;
        let beginPercent = beginTime / this.annotator.player.videoElement.duration;
        $tick.css('left', (beginPercent * 100).toString() + "%");

        let endTime = annotation.endTime;
        let endPercent = endTime / this.annotator.player.videoElement.duration;
        $tick.css('width', ((endPercent - beginPercent) * 100).toString() + "%");

        this.ticks.push($tick);
    }

    RemoveAnnotation(id){
        console.log("Removing tick " + id);
        // Remove the object from the document, and the array
        let newTicks = [];
        for(let $tick of this.ticks){
            if($tick.data("annotation-id") == id){
                console.log("Removed a tick");
                $tick.remove();
            } else {
                newTicks.push($tick);
            }
        }
        this.ticks = newTicks;
    }

    Clear(){
        for(let $tick of this.ticks){
            $tick.remove();
        }

        this.ticks = [];
    }

}


export { TickBar };