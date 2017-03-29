import { ServerInterface } from "./server-interface.js";
import { AnnotationManager } from "./annotation-manager.js";
import { TickBar } from "./components/tick-bar.js";
import { PolygonOverlay } from "./components/polygon-overlay.js";
import { preferences } from "../utils/preference-manager.js";
import { AnnotationGUI } from "./components/annotation-gui.js";

class VideoAnnotator {
    constructor(player, serverURL, tagsURL){
        console.log("[Annotator] created for video.");

        this.serverURL = serverURL;
        this.tagsURL = tagsURL;
        
        this.player = player;
        this.Wrap();
        this.PopulateControls();

        this.server = new ServerInterface(this);
        this.server.SetBaseURL(this.serverURL);
        
        this.annotationManager = new AnnotationManager();

        this.server.FetchAnnotations('location', this.player.videoElement.currentSrc, (json)=>{
            this.annotationManager.PopulateFromJSON(json);
            this.AnnotationsLoaded();
        });

        this.player.$container.on("OnTimeUpdate", (event, time) => {
            this.OnTimeUpdate(time);
        });

        this.$container.on("OnPolyClicked", (event, annotation) => {
            // Edit a poly when clicked, but only if the editor isn't already open
            if(!this.gui.open){
                this.gui.BeginEditing(annotation);
            }
        });

        this.gui.$container.on("OnGUIClosed", (event) => {
            this.$addAnnotationButton.button("enable");
        });

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

        // Inject the annotation edit button into the toolbar
        this.$addAnnotationButton = $("<button>Add New Annotation</button>").button({
            icon: "fa fa-plus",
            showLabel: false
        }).click(() => {
            this.$addAnnotationButton.button("disable");
            this.gui.BeginEditing();
        });
        this.player.controlBar.RegisterElement(this.$addAnnotationButton, 1, 'flex-end');

        this.gui = new AnnotationGUI(this);

    }

    AnnotationsLoaded(){
        //Send annotation loaded event
        this.$container.trigger("OnAnnotationsLoaded", this.annotationManager);
    }

    OnTimeUpdate(time){
        let annotationsNow = this.annotationManager.AnnotationsAtTime(time);

        if(annotationsNow.equals(this.lastAnnotationSet)){
            //console.log("Skipping");
            return;
        }

        this.lastAnnotationSet = annotationsNow;

        // Update the info container
        this.$info.html("<p>Showing " + annotationsNow.length + " annotations (" + this.annotationManager.annotations.length + " total).</p>");
        // Add each annotation to the readout
        for (let i = 0; i < annotationsNow.length; i++){
            this.$info.append("<p><strong>Annotation " + (i + 1) + ":</strong><br>" + annotationsNow[i].ToHTML() + "</p>");
        }

        this.$container.trigger("OnNewAnnotationSet", [annotationsNow]);
    }


}

export { VideoAnnotator };