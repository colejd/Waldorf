import { ServerInterface } from "./server-interface.js";
import { AnnotationManager } from "./annotation-manager.js";
import { TickBar } from "./components/tick-bar.js";
import { PolygonOverlay } from "./components/polygon-overlay.js";
import { preferences } from "../utils/preference-manager.js";
import { AnnotationGUI } from "./components/annotation-gui.js";
import { InfoContainer } from "./components/info-container.js";
import { SessionManager } from "./session-manager.js";
import { MessageOverlay } from "./components/message-overlay.js";
import { Annotation } from "./annotation.js";

class VideoAnnotator {
    constructor(player, serverURL, tagsURL, apiKey){
        console.log("[VideoAnnotator] Creating VideoAnnotator...");

        this.serverURL = serverURL;
        this.tagsURL = tagsURL;
        this.apiKey = apiKey;
        
        this.player = player;
        this.Wrap();
        this.PopulateControls();

        this.server = new ServerInterface(this);
        this.server.SetBaseURL(this.serverURL);
        
        this.messageOverlay = new MessageOverlay(this);
        this.annotationManager = new AnnotationManager();
        this.sessionManager = new SessionManager(this);

        // Load annotations from server based on the player's video URL
        this.server.FetchAnnotations('location', this.player.videoElement.currentSrc)
        .done((json)=>{
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

        console.log("[VideoAnnotator] Annotator created for video.");
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

        // Copy the video styles to the container
        console.log(this.player.originalStyles);
        this.$container.css(this.player.originalStyles);
    }

    PopulateControls(){
        // Create the tick bar
        this.tickBar = new TickBar(this);

        // Create the polygon overlay
        this.polyOverlay = new PolygonOverlay(this);

        this.$debugControls = $("<div class='annotator-debug-controls'></div>").appendTo(this.$container);
        var $showAllAnnotationsButton = this.$debugControls.append('<button>Open Annotation Manifest in New Window</button>');
        $showAllAnnotationsButton.click(() => {
            let url = this.player.videoElement.currentSrc;
            this.server.FetchAnnotations("location", url).done((json) => {
                let win = window.open();
                if(win === null) {
                    console.error("Couldn't show annotation manifest; please allow pop-ups.");
                    this.messageOverlay.ShowError("Couldn't show annotation manifest; please allow pop-ups.");
                }
                else {
                    win.document.open();
                    win.document.write(`<title>Annotation Manifest for ${url}</title>`);
                    win.document.write("<pre>");
                    win.document.write(JSON.stringify(json, null, 2).escapeHTML());

                    win.document.write("</pre>");
                    win.document.close();
                }
            });
            
        });

        // Wrap all the buttons with the list tag
        //this.$debugControls.wrapInner("<ul></ul>");
        // Wrap each button with the list element tag
        //this.$debugControls.find("button").wrap("<li></li>");

        // Create the info container
        this.infoContainer = new InfoContainer(this);

        // Inject the annotation edit button into the toolbar
        this.$addAnnotationButton = $("<button>Add New Annotation</button>").button({
            icon: "fa fa-plus",
            showLabel: false
        }).click(() => {
            this.$addAnnotationButton.button("disable");
            this.gui.BeginEditing();
        });
        this.player.controlBar.RegisterElement(this.$addAnnotationButton, 3, 'flex-end');

        // Inject the annotation upload button into the toolbar
        this.$uploadAnnotationButton = $("<button type='file'>Upload New Annotation</button>").button({
            icon: "fa fa-upload",
            showLabel: false
        }).click(() => {
            this.LoadFromFile();
        });
        this.player.controlBar.RegisterElement(this.$uploadAnnotationButton, 2, 'flex-end');

        

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
        this.infoContainer.Rebuild(this.annotationsNow);

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
        this.annotationManager.RemoveAnnotation(annotation.id);
        //this.annotationsNow = this.annotationManager.AnnotationsAtTime(this.player.videoElement.currentTime);

        // Throw event for listening objects (e.g. tick-bar)
        this.$container.trigger("OnAnnotationRemoved", [annotation.id]);

        // Update dependent views
        this.UpdateViews();

    }

    LoadFromFile() {
        // Create the dialog
        let $container = $("<div class='session-modal' title='Import Annotations'></div>"); // Outermost HTML
        let $headText = $("<p class='validateTips'>Annotations must be W3C OA compliant in JSON format.</p>").appendTo($container);
        let $form = $("<form></form>").appendTo($container);

        let $importField;

        $("<label for='importFile'>Select File</label>").appendTo($form);
        $importField = $("<input type='file' name='importFile' class='file ui-widget-content ui-corner-all'>").appendTo($form);
        
        $form.wrapInner("<fieldset />");

        $importField.on('change', function(){
            let files = $(this).get(0).files;
            let fr = new FileReader();

            fr.onload = (function(localFile){
                let localJson = JSON.parse(localFile.target.result);
                console.log(localJson);
                // TODO: Hook up to OA parser
            });
            fr.readAsText(files[0]);
        });

        let $dialog = $container.dialog({
            autoOpen: true,
            draggable: false,
            modal: true,
            buttons: {
                Cancel: () => {
                    $dialog.dialog("close");
                }
            },
            close: () => {
                $dialog.find("form")[ 0 ].reset();
                $dialog.find("input").removeClass( "ui-state-error" );
                //this.OnModalClose();
            }
        });
    }

    ValidateAnnotation(annotation) {
        return false;
    }


}

export { VideoAnnotator };