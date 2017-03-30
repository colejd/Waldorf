
class ServerInterface {
    constructor(annotator){
        this.annotator = annotator;
    }

    SetBaseURL(url){
        this.baseURL = url;
    }

    FetchAnnotations(searchKey, searchParam, callback) {
        $.ajax({
            url: this.baseURL + "/annotators/getAnnotationsByLocation",
            type: "GET",
            data: { [searchKey]: searchParam },
            dataType: "json",
            async: true,
            success: (data) => {
                console.log("Fetched " + data.annotations.length + " annotations for " + searchKey + ": \"" + searchParam + "\".");
                callback(data);
            },
            error: (response) => {
                console.error("Error fetching annotations for " + searchKey + ": \"" + searchParam + "\" - " + response.responseText + ".");
            }
        });
    }

    PostAnnotation(callback){
        console.log("Posting annotation...");
        let annotation = this.annotator.gui.GetAnnotationObject();
        //console.log(annotation);
        
        let anno_data = {
            'annotation': annotation.data.text, 
            'video_title': annotation.metadata.title, 
            'video_author': annotation.metadata.userName, 
            'location': annotation.metadata.location, 
            'semantic_tag': 'Semantic tag text', 
            'beginTime': annotation.data.beginTime, // ms as int
            'endTime': annotation.data.endTime, // ms as int
            'pointsArray': annotation.data.pointsArray, // Stringified array
            'tags': annotation.data.tags
        }
        
        //data = JSON.stringify(data);
        //console.log(anno_data);
        
        $.ajax({
            url: this.baseURL + "/annotators/addAnnotation",
            type: "POST",
            data: anno_data,
            async: true,
            //context: this,
            success: (data) => {
                console.log("Successfully posted new annotation.");
                annotation.metadata.id = data.id; // Append the ID given by the response
                if(callback) callback(annotation);
            },
            error: (response) => {
                console.error("Failed to post new annotation! Reason: " + response.responseText);
            }

        });
    }

    EditAnnotation(callback){
        console.log("Posting annotation...");
        let annotation = this.annotator.gui.GetAnnotationObject();
        console.log(annotation);
        
        let anno_data = {
            'annotation': annotation.data.text, 
            'video_title': annotation.metadata.title, 
            'video_author': annotation.metadata.userName, 
            'location': annotation.metadata.location, 
            'semantic_tag': 'Semantic tag text', 
            'beginTime': annotation.data.beginTime, // ms as int
            'endTime': annotation.data.endTime, // ms as int
            'pointsArray': annotation.data.pointsArray, // Stringified array
            'tags': annotation.data.tags,
            'id': annotation.metadata.id
        }
        
        //data = JSON.stringify(data);
        console.log(anno_data);
        
        $.ajax({
            url: this.baseURL + "/annotators/editAnnotation",
            type: "POST",
            data: anno_data,
            async: true,
            //context: this,
            success: (data) => {
                console.log("Successfully edited the annotation.");
                if(callback) callback(annotation, data);
            },
            error: (response) => {
                console.error("Failed to edit the annotation! Reason: " + response.responseText);
            }

        });
    }

    DeleteAnnotation(annotation, callback){
        console.log("Deleting annotation " + annotation.metadata.id);
        $.ajax({
            url: this.baseURL + "/deleteAnnotation",
            type: "POST",
            data: {
                "id": annotation.metadata.id
            },
            async: true,
            //context: this,
            success: (data) => {
                console.log("Successfully deleted the annotation.");
                if(callback) callback(annotation);
            },
            error: (response) => {
                console.error("Failed to delete annotation! Reason: " + response.responseText);
            }

        });
    }

}


export { ServerInterface };