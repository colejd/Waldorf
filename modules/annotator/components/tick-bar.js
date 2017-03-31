
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
        $tick.data("annotation-id", annotation.metadata.id);

        let beginTime = annotation.data.beginTime / 1000;
        let beginPercent = beginTime / this.annotator.player.videoElement.duration;
        $tick.css('left', (beginPercent * 100).toString() + "%");

        let endTime = annotation.data.endTime / 1000;
        let endPercent = endTime / this.annotator.player.videoElement.duration;
        $tick.css('width', ((endPercent - beginPercent) * 100).toString() + "%");

        this.ticks.push($tick);
    }

    RemoveAnnotation(id){
        // Remove the object from the document, and the array
        this.ticks = this.ticks.filter((obj) => {
            if (obj.data("annotation-id") == id){
                obj.remove();
                return true;
            }
            return false;
        });
    }

    Clear(){
        for(let $tick of this.ticks){
            $tick.remove();
        }

        this.ticks = [];
    }

}


export { TickBar };