
class TickBar {
    constructor(annotator){
        this.annotator = annotator;

        // Create the element
        this.$tickBar = $("<div class='annotator-tickbar'></div>");
        this.annotator.player.controlBar.$container.append(this.$tickBar);

        this.annotator.$container.on("OnAnnotationsLoaded", (event, annotationManager)=>{
            this.LoadAnnotations(annotationManager);
        });
    }

    LoadAnnotations(annotationManager){
        let annotations = annotationManager.annotations;
        // Remove any children of the tick bar
        this.$tickBar.empty();
        
        for(let i = 0; i < annotations.length; i++){
            let anno = annotations[i];
            let $tick = $("<div class='annotator-tickbar-tick'></div>").appendTo(this.$tickBar);
            

            let beginTime = anno.data.beginTime / 1000;
            let beginPercent = beginTime / this.annotator.player.videoElement.duration;
            $tick.css('left', (beginPercent * 100).toString() + "%");


            let endTime = anno.data.endTime / 1000;
            let endPercent = endTime / this.annotator.player.videoElement.duration;
            $tick.css('width', ((endPercent - beginPercent) * 100).toString() + "%");
        }
    }

}


export { TickBar };