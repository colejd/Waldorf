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

        this.annotator.$container.on("OnNewAnnotationSet", (event, annotations)=>{
            this.Update(annotations); 
        });

        // this.annotator.$container.on("OnTimeUpdate", (event, time) => {
        //     console.log("Time update");
        // });
    }

    Update(annotations){
        this.Clear();

        let polygons = annotations.map(annotation => JSON.parse(annotation.data["pointsArray"]));
        
        //Sort polygon order by size (ascending)
    //    polygons.sort(function(a, b) {
    //        return this.GetArea(a) > this.GetArea(b);
    //    })
        
        for (let i = 0; i < polygons.length; i++) {
            // Make a new child of polyParent and clip it
            let $poly = $("<div class='annotator-overlay-poly'></div>").appendTo(this.$videoOverlay);
            //$poly.addClass("annotator-poly");
            $poly.clipPath(polygons[i], {
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


            $poly.qtip({ // Grab all elements with a title attribute
                content: {
                    text: annotations[i].data["text"]
                },
                position: {
                    my: 'bottom right',  // Position my top left...
                    at: 'top left', // at the bottom right of...
                    target: 'mouse',
                    adjust: {
                        mouse: true
                    },
                    viewport: this.annotator.player.$container
                },
                hide: {
                    delay: 0 // No hide delay by default
                },
                style: {
                    classes: 'qtip-dark qtip-rounded'
                }
            });
                
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