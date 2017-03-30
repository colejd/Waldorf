import { GetFormattedTime, GetSecondsFromHMS } from "../../utils/time.js";
import { PolygonEditor } from "./polygon-editor.js";

class AnnotationGUI {

    constructor(annotator){
        this.annotator = annotator;

        this.Create();

        this.open = false;

        //Hide the container
        this.isVisible = false;
        this.$container.hide();

        this.polyEditor = new PolygonEditor(this.annotator);

        this.annotator.$container.on("OnPolygonEditingEnded", () => {
            this.SetVisible(true);
        });

    }

    GetTagsQuery(){
        return {
            url: this.annotator.tagsURL,
            dataType: 'json',
            delay: 250,
            cache: true,
            processResults: function (data) {
                // Parse the labels into the format expected by Select2
                let tags = [];
                let index = 1;
                for(let term of data["terms"]){
                    tags.push({
                        id: index,
                        text: term["rdfs:label"]
                    });
                    index++;
                }
                return {
                    results: tags
                };
            }
        }
    }

    Create(){
        this.$container = $("<div class='annotator-vp-post'></div>").appendTo(this.annotator.player.$container);
        this.$postToolbar = $("<div class='flex-toolbar'></div>").appendTo(this.$container);
        this.$postToolbar.css("margin-bottom", "5px");
        this.$postToolbar2 = $("<div class='flex-toolbar'></div>").appendTo(this.$container);
        this.$postToolbar2.css("margin-bottom", "5px");
        this.$postToolbar3 = $("<div class='flex-toolbar'></div>").appendTo(this.$container);

        this.$postToolbar.append($("<div></div>").css("flex-grow", 1).css("order", 0));

        // Make title div
        let $titleDiv = $("<div></div>");
        this.$titleLabel = $("<p style='color:#ffffff; margin-right: 15px;'>Create Annotation</p>").appendTo($titleDiv);
        this.RegisterElement($titleDiv, this.$postToolbar, -10);
        
        // Make "Start time" label and field
        let $timeStartContainer = $('<div class="ui-field-contain"></div>');
        let $timeStartLabel = $('<label for="time-start">Start Time:</label>').appendTo($timeStartContainer);
        this.$timeStartField = $('<input type="text" name="time-start" id="time-start" value="">').appendTo($timeStartContainer);
        this.$timeStartField.width(50);
        this.$timeStartField.css("font-family", "Courier, monospace");
        this.$timeStartField.addClass("ui-widget ui-widget-content ui-corner-all");
        this.$timeStartField.attr('title', "Start time (hh:mm:ss)");
        this.RegisterElement($timeStartContainer, this.$postToolbar, -3);
        
        // Make "End time" label and field
        let $timeEndContainer = $('<div class="ui-field-contain"></div>');
        let $timeEndLabel = $('<label for="time-end">End Time:</label>').appendTo($timeEndContainer);
        this.$timeEndField = $('<input type="text" name="time-end" id="time-end" value="0">').appendTo($timeEndContainer);
        this.$timeEndField.width(50);
        this.$timeEndField.css("font-family", "Courier, monospace");
        this.$timeEndField.addClass("ui-widget ui-widget-content ui-corner-all");
        this.$timeEndField.attr('title', "End time (hh:mm:ss)");
        this.RegisterElement($timeEndContainer, this.$postToolbar, -2);
        
        // Make "Edit polygon" button
        let $editPolyButton = $("<button>Edit Polygon</button>").button({
            icon: "fa fa-pencil",
            showLabel: false
        }).click(() => {
            this.SetVisible(false);
            this.polyEditor.BeginEditing();
        });
        $editPolyButton.attr('title', "Edit polygon");
        this.RegisterElement($editPolyButton, this.$postToolbar, -1);

        // Make delete button
        this.$deleteButton = $("<button>Delete Annotation</button>").button({
            icon: "fa fa-bomb",
            showLabel: false
        });
        this.$deleteButton.css("margin-right", "15px");
        this.$deleteButton.attr('title', "Delete annotation");
        this.$deleteButton.click(() => {
            this.annotator.server.DeleteAnnotation(this.originalAnnotation, () => {
                this.Close();
            });
        });
        this.RegisterElement(this.$deleteButton, this.$postToolbar, 1, 'flex-end');

        // Make cancel button
        let $cancelButton = $("<button>Cancel Annotation Editing</button>").button({
            icons: {primary: 'fa fa-remove'},
            showLabel: false
        });
        $cancelButton.attr('title', "Cancel annotation editing");
        $cancelButton.addClass("annotator-cancel-button");
        $cancelButton.click(() => {
            this.Close();
        });
        this.RegisterElement($cancelButton, this.$postToolbar, 2, 'flex-end');
        
        // Make "Submit Annotation" button
        let $submitButton = $("<button>Submit Annotation</button>").button({
            icons: {primary: 'fa fa-check'},
            showLabel: false
        });
        $submitButton.attr('title', "Save annotation to database");
        $submitButton.addClass("annotator-confirm-button");
        $submitButton.click(() => {
            this.CommitAnnotationToServer(() => {
                this.Close();
            });
        });
        this.RegisterElement($submitButton, this.$postToolbar, 3, 'flex-end');

        // Make tags field
        this.$tagsField = $('<select class="form-control" multiple="multiple"></select>');
        this.$tagsField.width("100%");
        this.RegisterElement(this.$tagsField, this.$postToolbar2, -1);
        this.$tagsField.select2({
            tags: true,
            placeholder: "Tags",
            ajax: this.GetTagsQuery(),
            selectOnBlur: true,
            // Allow manually entered text in drop down.
            createTag: function (params) {
                return {
                    id: params.term,
                    text: params.term,
                    newOption: true
                }
            }
        });
        // Add custom class for bringing the dropdown to the front (fullscreen fix)
        this.$tagsField.data('select2').$dropdown.addClass("select2-dropdown-annotator");
        
        // Make annotation text field
        this.$textField = $('<textarea type="text" name="anno-text" id="anno-text" value="" placeholder="Text">');
        this.$textField.width("100%");
        this.$textField.addClass("ui-widget ui-widget-content ui-corner-all");
        this.$textField.attr('title', 'Annotation text');
        this.$textField.css("flex-grow", 2);
        this.RegisterElement(this.$textField, this.$postToolbar3, -1);
        
        //this.$container.hide();
    }

    RegisterElement($element, $container, order, justification = 'flex-start'){
        $element.css('order', order);
        $element.css('align-self', justification);
        // Sets grow [shrink] [basis]
        //$element.css('flex', '0 0 auto');
        $container.append($element);
    }

    SetVisible(isVisible, duration = 0){

        //console.log(isVisible + " " + duration);
        if(isVisible){
            this.$container.fadeTo(duration, 1.0);
        } else {
            this.$container.stop(true, true);
            this.$container.fadeTo(duration, 0.0);
        }
        this.isVisible = isVisible;

    }

    ToggleOpen(){

        if(this.open){
            this.Close();
        } else {
            this.Open();
        }

    }

    Open(){
        this.SetVisible(true);
        this.open = true;
        this.polyEditor.Done();
        // Disable autofading when the gui is visible
        this.annotator.player.SetAutoFade(false);
    }

    Close(){
        this.SetVisible(false);
        this.open = false;
        this.polyEditor.Done();
        // Re-enable autofading when the gui is hidden
        this.annotator.player.SetAutoFade(true);
        this.$container.trigger("OnGUIClosed");
    }
    
    ToggleVisible(){
        this.SetVisible(!this.isVisible, 0);
    }

    BeginEditing(annotation = null){
        // Open the GUI if it isn't already
        this.Open();

        //console.log(annotation);

        if(annotation == null){
            // Populate fields if no annotation is given
            this.editMode = false;
            this.$titleLabel.text("Create Annotation");
            this.$deleteButton.button("disable");

            console.log("Populated with template data");
            this.$timeStartField.val(GetFormattedTime(this.annotator.player.videoElement.currentTime));
            this.$timeEndField.val(GetFormattedTime(this.annotator.player.videoElement.duration));
            this.$textField.val("");
            this.$tagsField.val("").trigger("change");

            this.polyEditor.InitPoly();
        }
        else{
            // Populate the fields from the annotation
            this.editMode = true;
            this.$titleLabel.text("Edit Annotation");
            this.$deleteButton.button("enable");

            this.originalAnnotation = annotation;
            console.log(annotation);

            console.log("Populated from an existing annotation");
            this.$timeStartField.val(GetFormattedTime(annotation.data.beginTime / 1000));
            this.$timeEndField.val(GetFormattedTime(annotation.data.endTime / 1000));
            this.$textField.val(annotation.data.text);
            this.$tagsField.val("").trigger("change");

            for(let tag of annotation.data.tags){
                this.$tagsField.append("<option value='"+tag+"' selected>"+tag+"</option>");
                this.$tagsField.trigger("change");
            }

            this.polyEditor.InitPoly(annotation.data["pointsArray"]);

        }
        //this.newPolyPoints = [];
        //this.breadcrumbs = [];
    }

    ParseTags(){

    }

    CommitAnnotationToServer(callback){
        if(this.editMode){
            console.log("Sending edited annotation to server...");
            this.annotator.server.EditAnnotation(callback);
        }
        else{
            console.log("Sending new annotation to server...");
            this.annotator.server.PostAnnotation(callback);
        }
    }

    GetAnnotationObject(){

        // Extract tag text from tags field
        let tags = this.$tagsField.select2("data").map((item) => { return item.text; });

        let obj = {}
        obj.data = {
            text: this.$textField.val(),
            beginTime: Math.round(GetSecondsFromHMS(this.$timeStartField.val()) * 1000),
            endTime: Math.round(GetSecondsFromHMS(this.$timeEndField.val()) * 1000),
            pointsArray: this.polyEditor.GetJSON(),
            tags: tags
        }
        

        if (this.originalAnnotation != null){
            obj.metadata = this.originalAnnotation.metadata;
        }
        else{
            obj.metadata = {
                //id: "",
                location: this.annotator.player.videoElement.currentSrc
                //title: ""
            }
        
        }

        return obj;
    }
    




}

export { AnnotationGUI };