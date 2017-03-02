require('clip-path-polygon');

class PolygonOverlay {
    constructor(annotator){
        this.annotator = annotator;
        this.polyElements = [];
        this.baseZ = 2147483649;

        // Create the video overlay
        this.$videoOverlay = $("<div class='annotator-video-overlay'></div>").appendTo(this.annotator.player.$container);
        this.ResizeOverlay();
        this.annotator.player.$container.on("OnFullscreenChange", (event, setFullscreen) => this.ResizeOverlay());

        this.annotator.$container.on("OnNewAnnotationSet", (event, annotations) => this.Update(annotations));
    }

    Update(annotations){
        this.Clear();

        let polygons = annotations.map(annotation => JSON.parse(annotation.data["pointsArray"]));
        
        //Sort polygon order by size (ascending)
        // polygons.sort(function(a, b) {
        //     return this.GetArea(a) > this.GetArea(b);
        // })
        
        for (let i = 0; i < polygons.length; i++) {

            let $poly = $("<div class='annotator-overlay-poly'></div>").appendTo(this.$videoOverlay);
            $poly.clipPath(polygons[i], {
                isPercentage: true,
                svgDefId: 'annotatorPolySvg'
            });

            this.AddTooltip($poly, annotations[i]);
            
            this.polyElements.push($poly);
        }
    }

    AddTooltip($poly, annotation){
        $poly.qtip({
            content: {
                title: annotation.metadata["id"],
                text: annotation.data["text"]
            },
            position: {
                my: 'bottom right',
                at: 'top left',
                target: 'mouse', // Follow the mouse
                adjust: {
                    mouse: true,
                    method: "shift shift" // horizontal, vertical
                },
                viewport: this.annotator.player.$container
            },
            hide: {
                delay: 0 // No hide delay by default
            },
            style: {
                classes: 'qtip-light qtip-rounded'
            }
        });
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