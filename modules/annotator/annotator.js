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
                this.$addAnnotationButton.button("disable");
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
        // Wrap the video player with this container
        this.$container = $(this.player.$container).wrap("<div class='annotator-container'></div>").parent();

        // Set the container to the width of the video player
        this.$container.width(this.player.$container.width());

        // Allow the video player container to grow
        //this.player.$container.width("100%");
        //this.player.$container.height("100%");
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
        this.annotationsNow = this.annotationManager.AnnotationsAtTime(time);

        if(this.annotationsNow.equals(this.lastAnnotationSet)){
            //console.log("Skipping");
            return;
        }

        this.lastAnnotationSet = this.annotationsNow;

        this.UpdateViews();
    }

    UpdateViews(){
        this.annotationsNow = this.annotationManager.AnnotationsAtTime(this.player.videoElement.currentTime);

        // Update the info container
        let plural = this.annotationsNow.length == 1 ? "" : "s";
        this.$info.html("<p>Showing " + this.annotationsNow.length + " annotation" + plural + " (" + this.annotationManager.annotations.length + " total).</p>");
        // Add each annotation to the readout
        for (let i = 0; i < this.annotationsNow.length; i++){
            this.$info.append("<p><strong>Annotation " + (i + 1) + ":</strong><br>" + this.annotationsNow[i].ToHTML() + "</p>");
        }

        this.$container.trigger("OnNewAnnotationSet", [this.annotationsNow]);
    }

    RegisterNewAnnotation(annotation){
        console.log(annotation);
        this.annotationManager.RegisterAnnotation(annotation);

        // Throw event for listening objects (e.g. tick-bar)
        this.$container.trigger("OnAnnotationRegistered", [annotation]);

        // Update dependent views
        this.UpdateViews();
    }

    UpdateAnnotation(annotation, oldID){
        this.annotationManager.UpdateAnnotation(annotation, oldID);

        // Throw event for listening objects (e.g. tick-bar)
        this.$container.trigger("OnAnnotationRemoved", [oldID]);
        this.$container.trigger("OnAnnotationRegistered", [annotation]);

        // Update dependent views
        this.UpdateViews();
    }

    DeregisterAnnotation(annotation){
        this.annotationManager.RemoveAnnotation(annotation.metadata.id);
        //this.annotationsNow = this.annotationManager.AnnotationsAtTime(this.player.videoElement.currentTime);

        // Throw event for listening objects (e.g. tick-bar)
        this.$container.trigger("OnAnnotationRemoved", [annotation.metadata.id]);

        // Update dependent views
        this.UpdateViews();

    }


}

export { VideoAnnotator };