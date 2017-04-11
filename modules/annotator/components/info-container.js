class InfoContainer {
    constructor(annotator){
        this.annotator = annotator;
        this.$container = $("<div class='annotator-info' aria-live='polite' aria-atomic='true'></div>").appendTo(this.annotator.$container);
    }

    Rebuild(annotations){
        let plural = annotations.length == 1 ? "" : "s";
        let totalAnnotations = this.annotator.annotationManager.annotations.length;
        this.$container.html("<p>Showing " + annotations.length + " annotation" + plural + " (" + totalAnnotations + " total).</p>");
        // Add each annotation to the readout
        for (let i = 0; i < annotations.length; i++){
            this.$container.append("<p><strong>Annotation " + (i + 1) + ":</strong><br>" + annotations[i].ToHTML() + "</p>");
        }
    }

}

export { InfoContainer };