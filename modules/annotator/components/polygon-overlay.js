require('clip-path-polygon');

class PolygonOverlay {
    constructor(annotator){
        this.annotator = annotator;
        this.polyElements = [];
        this.baseZ = 2147483649;

        // Create the video overlay
        this.$videoOverlay = $("<div class='annotator-video-overlay'></div>").appendTo(this.annotator.player.$container);
        this.ResizeOverlay();
        this.annotator.player.$container.on("OnFullscreenChange", (event, setFullscreen) => {
            this.ResizeOverlay();
        });

        this.annotator.$container.on("OnTimeUpdate", (event, time)=>{ 
            this.Update(time); 
        });
    }

    Update(time){
        this.Clear();

        let currentAnnotations = this.annotator.annotationManager.AnnotationsAtTime(time);
        let polygons = currentAnnotations.map(a => JSON.parse(a.data["pointsArray"]));
        
        //Sort polygon order by size (ascending)
    //    polygons.sort(function(a, b) {
    //        return this.GetArea(a) > this.GetArea(b);
    //    })
        
        for (let polygon of polygons) {
            // Make a new child of polyParent and clip it
            let $poly = $("<div class='annotator-overlay-poly'></div>").appendTo(this.$videoOverlay);
            //$poly.addClass("annotator-poly");
            $poly.clipPath(polygon, {
                isPercentage: true,
                svgDefId: 'annotatorPolySvg'
            });
            
            // Configure tooltip
            // $poly.tooltipster({
            //     zIndex: this.baseZ + i,
            //     updateAnimation: null,
            //     animationDuration: 200,
            //     delay: 0,
            //     theme: 'tooltipster-borderless',
            //     plugins: ['follower']
            // });
            // $poly.tooltipster('content', annotations[i].data["text"]);
                
            this.polyElements.push($poly);
        
        }
    }

    Clear(){
        // Clear all the polygons from the DOM
        for(let i = 0; i < this.polyElements.length; i++){
            this.polyElements[i].remove();
        }
        
        // Mark the array as empty
        this.polyElements = [];
        
        // $('#mySvg').remove();
    }

    ResizeOverlay(){
        // Resize video overlay to fit actual video dimensions
        let videoDims = this.annotator.player.GetVideoDimensions();
        this.$videoOverlay.css('width', videoDims.width);
        this.$videoOverlay.css('height', videoDims.height);
        let heightDiff = (this.annotator.player.$video.height() - videoDims.height) / 2;
        this.$videoOverlay.css('top', heightDiff);
    }

}

export { PolygonOverlay };