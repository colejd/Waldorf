import { ServerInterface } from "./server-interface.js";
import { AnnotationManager } from "./annotation-manager.js";
import { TickBar } from "./components/tick-bar.js";
import { preferences } from "../utils/preference-manager.js";

class VideoAnnotator {
    constructor(player){
        console.log("[Annotator] created for video.");
        
        this.player = player;
        this.Wrap();
        this.PopulateControls();

        this.server = new ServerInterface();
        this.server.SetBaseURL("http://130.111.199.37:3000"); // External
        //this.server.SetBaseURL("http://192.168.1.83:3000"); // Internal
        
        this.annotationManager = new AnnotationManager();

        this.server.FetchAnnotations('location', this.player.videoElement.currentSrc, (json)=>{
            this.annotationManager.PopulateFromJSON(json);
            this.OnAnnotationsLoaded();
        });

        this.player.$container.on("OnTimeUpdate", (event, time) => {
            this.OnTimeUpdate(time);
        });

    }

    Preload(){

    }

    /**
     * Creates the divs that surround the video player.
     */
    Wrap(){
        this.$container = $(this.player.$container).wrap("<div class='annotator-container'></div>").parent();

        // Set the container to the width of the video player
        this.$container.width(this.player.$container.width());
    }

    PopulateControls(){
        // Create the video overlay
        this.$videoOverlay = $("<div class='annotator-video-overlay'></div>").appendTo(this.player.$container);
        this.ResizeOverlay();
        this.player.$container.on("OnFullscreenChange", (event, setFullscreen) => {
            this.ResizeOverlay();
        });

        // Create the tick bar
        this.tickBar = new TickBar(this);

        // Create the info container
        this.$info = $("<div class='annotator-info'></div>").appendTo(this.$container);

    }

    OnAnnotationsLoaded(){
        // Populate the TickBar
        this.tickBar.LoadAnnotations(this.annotationManager);

        //TODO: Send annotation loaded event
    }

    ResizeOverlay(){
        // Resize video overlay to fit actual video dimensions
        let videoDims = this.player.GetVideoDimensions();
        this.$videoOverlay.css('width', videoDims.width);
        this.$videoOverlay.css('height', videoDims.height);
        let heightDiff = (this.player.$video.height() - videoDims.height) / 2;
        this.$videoOverlay.css('top', heightDiff);

    }

    OnTimeUpdate(time){
        let annotationsNow = this.annotationManager.AnnotationsAtTime(time);

        // Update the info container
        this.$info.html("<p>Showing " + annotationsNow.length + " annotations (" + this.annotationManager.annotations.length + " total).</p>");
        // Add each annotation to the readout
        for (var i = 0; i < annotationsNow.length; i++){
            this.$info.append("<p><strong>Annotation " + (i + 1) + ":</strong><br>" + annotationsNow[i].ToHTML() + "</p>");
        }
    }


}

export { VideoAnnotator };