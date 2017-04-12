
class ServerInterface {
    constructor(annotator){
        this.annotator = annotator;
        localStorage.removeItem('waldorf_auth_token');
    }

    SetBaseURL(url){
        this.baseURL = url;
    }

    make_base_auth(user, password) {
        var tok = user + ':' + password;
        var hash = btoa(tok);
        return 'Basic ' + hash;
    }

    make_token_auth(token){
        return 'Token ' + token;
    }

    LoggedIn(){
        let auth_token = localStorage.getItem('waldorf_auth_token');
        return auth_token !== null;
    }

    LogIn(username, password){
        return $.ajax({
            url: this.baseURL + "/api/login",
            type: "POST",
            async: true,
            context: this,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', this.make_base_auth(username, password));
            }
        }).done((data) => {
            console.log("Successfully logged in.");
            localStorage.setItem('waldorf_auth_token', data.auth_token);
        }).fail((response) => {
            console.error("Could not log in.");
            this.annotator.messageOverlay.ShowError("Could not log in!");
        });
    }

    LogOut(){
        return $.ajax({
            url: this.baseURL + "/api/logout",
            type: "DELETE",
            async: true,
            context: this,
            beforeSend: function (xhr) {
                let auth_token = localStorage.getItem('waldorf_auth_token') || "";
                console.log(`token: ${auth_token}`);
                xhr.setRequestHeader('Authorization', this.make_token_auth(auth_token));
            }
        }).done((data) => {
            console.log("Successfully logged out.");
            localStorage.removeItem('waldorf_auth_token');
        }).fail((response) => {
            console.error("Could not log out.");
        });
    }

    FetchAnnotations(searchKey, searchParam) {
        return $.ajax({
            url: this.baseURL + "/api/getAnnotationsByLocation",
            type: "GET",
            data: { [searchKey]: searchParam },
            dataType: "json",
            async: true
        }).done((data) => {
            console.log("Fetched " + data.annotations.length + " annotations for " + searchKey + ": \"" + searchParam + "\".");
        }).fail((response) => {
            console.error("Error fetching annotations for " + searchKey + ": \"" + searchParam + "\".");
            this.annotator.messageOverlay.ShowError("Could not retrieve annotations!");
        });
    }

    PostAnnotation(callback){
        console.log("Posting annotation...");
        let annotation = this.annotator.gui.GetAnnotationObject();
        console.log(annotation);

        let auth_token = localStorage.getItem('waldorf_auth_token');
        if (auth_token === null) {
            console.error("You are not logged in!");
            this.annotator.messageOverlay.ShowError("You are not logged in!");
            return false;
        }
        
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
            url: this.baseURL + "/api/addAnnotation",
            type: "POST",
            data: anno_data,
            async: true,
            context: this,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', this.make_token_auth(auth_token));
            },
            success: (data) => {
                console.log("Successfully posted new annotation.");
                this.annotator.messageOverlay.ShowMessage("Successfully created new annotation.");
                annotation.metadata.id = data.id; // Append the ID given by the response
                if(callback) callback(annotation);
            },
            error: (response) => {
                console.error("Failed to post new annotation!");
                this.annotator.messageOverlay.ShowError("Could not post new annotation!");
            }

        });
    }

    EditAnnotation(callback){
        let annotation = this.annotator.gui.GetAnnotationObject();

        let auth_token = localStorage.getItem('waldorf_auth_token');
        if (auth_token === null) {
            console.error("You are not logged in!");
            this.annotator.messageOverlay.ShowError("You are not logged in!");
            return false;
        }
        
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

        let oldID = anno_data.id;

        console.log("Modifying annotation " + oldID);
        
        $.ajax({
            url: this.baseURL + "/api/editAnnotation",
            type: "POST",
            data: anno_data,
            async: true,
            context: this,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', this.make_token_auth(auth_token));
            },
            success: (data) => {
                console.log("Successfully edited the annotation. (ID is now " + data.id + ")");
                this.annotator.messageOverlay.ShowMessage("Successfully edited the anotation.");
                //console.log(annotation);
                annotation.metadata.id = data.id; // Append the ID given by the response
                if(callback) callback(annotation, oldID);
            },
            error: (response) => {
                console.error("Failed to edit the annotation!");
                this.annotator.messageOverlay.ShowError("Could not edit the annotation!");
            }

        });
    }

    DeleteAnnotation(annotation){
        let auth_token = localStorage.getItem('waldorf_auth_token');
        if (auth_token === null) {
            console.error("You are not logged in!");
            this.annotator.messageOverlay.ShowError("You are not logged in!");
            let deferred = $.Deferred();
            deferred.reject({
                success: false,
                data: "Not logged in."
            });
            return deferred.promise();
        }

        console.log("Deleting annotation " + annotation.metadata.id);
        return $.ajax({
            url: this.baseURL + "/api/deleteAnnotation",
            type: "DELETE",
            data: {
                "id": annotation.metadata.id
            },
            async: true,
            context: this,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', this.make_token_auth(auth_token));
            }

        }).done((response) => {
            console.log("Successfully deleted the annotation.");
            this.annotator.messageOverlay.ShowMessage("Successfully deleted the annotation.");
        }).fail((response) => {
            console.error("Failed to delete annotation!");
            this.annotator.messageOverlay.ShowError("Could not delete the annotation!");
        });
    }

}


export { ServerInterface };