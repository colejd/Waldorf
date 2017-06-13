import { GetFormattedTime } from "../../utils/time.js";
let sha1 = require('sha1');

class InfoContainer {
    constructor(annotator){
        this.annotator = annotator;
        this.$container = $("<div class='annotator-info' aria-live='polite' aria-atomic='true'></div>").appendTo(this.annotator.$container);
    }

    Rebuild(annotations){
        let plural = annotations.length == 1 ? "" : "s";
        let totalAnnotations = this.annotator.annotationManager.annotations.length;
        this.$container.empty();
        this.$container.html(`<p>Showing ${annotations.length} annotation${plural} (${totalAnnotations} total).</p>`);

        // Add each annotation to the readout
        for (let i = 0; i < annotations.length; i++){
            this.$container.append(this.MakeContainer(annotations[i], i));
        }
    }

    MakeContainer(annotation, index){
        let $panel = $("<p></p>").appendTo($("<div></div>").appendTo(this.$container));
        //let text = JSON.stringify(annotation.AsOpenAnnotation(), null, 2);

        // Add clickable header that brings up the edit interface.
        let $header = $(`<a href='' title='Edit Annotation'><b>Annotation ${index + 1}:</b><br></a>`);
        $header.click( (event) => {
            event.preventDefault();
            this.annotator.gui.BeginEditing(annotation);
        });

        $panel.append($header);
        let $content = $("<p></p>");
        
        
        $content.append("<b>Text: </b> " + annotation.data.text);
        $content.append("<br>");
        $content.append("<b>Tags: </b> " + annotation.data.tags.join(", "));
        $content.append("<br>");
        $content.append("<b>Time: </b> " 
                + GetFormattedTime(annotation.data.beginTime / 1000) 
                + " - " 
                + GetFormattedTime(annotation.data.endTime / 1000));
        $content.append("<br>");

        $content.append("<b>Submitted by:</b><br />"
                + (annotation.metadata.userEmail != null ? sha1(annotation.metadata.userEmail) : "unspecified")
                );

        //$paragraph.append("<strong>Annotation " + (index + 1) + ":</strong><br><pre>" + text.escapeHTML() + "</pre>");

        $panel.append($content);
        return $panel;
    }

}

export { InfoContainer };