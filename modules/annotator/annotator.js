import { ServerInterface } from "./server-interface.js";
import { AnnotationManager } from "./annotation-manager.js";
import { TickBar } from "./components/tick-bar.js";
import { PolygonOverlay } from "./components/polygon-overlay.js";
import { preferences } from "../utils/preference-manager.js";

class VideoAnnotator {
    constructor(player, serverURL){
        console.log("[Annotator] created for video.");
        
        this.player = player;
        this.Wrap();
        this.PopulateControls();

        this.server = new ServerInterface();
        this.server.SetBaseURL(serverURL);
        
        this.annotationManager = new AnnotationManager();

        this.server.FetchAnnotations('location', this.player.videoElement.currentSrc, (json)=>{
            this.annotationManager.PopulateFromJSON(json);
            this.AnnotationsLoaded();
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
        // Create the tick bar
        this.tickBar = new TickBar(this);

        // Create the polygon overlay
        this.polyOverlay = new PolygonOverlay(this);

        // Create the info container
        this.$info = $("<div class='annotator-info'></div>").appendTo(this.$container);

    }

    AnnotationsLoaded(){
        //Send annotation loaded event
        this.$container.trigger("OnAnnotationsLoaded", this.annotationManager);
    }

    OnTimeUpdate(time){
        let annotationsNow = this.annotationManager.AnnotationsAtTime(time);

        // Update the info container
        this.$info.html("<p>Showing " + annotationsNow.length + " annotations (" + this.annotationManager.annotations.length + " total).</p>");
        // Add each annotation to the readout
        for (let i = 0; i < annotationsNow.length; i++){
            this.$info.append("<p><strong>Annotation " + (i + 1) + ":</strong><br>" + annotationsNow[i].ToHTML() + "</p>");
        }

        this.$container.trigger("OnTimeUpdate", time);
    }


}

export { VideoAnnotator };