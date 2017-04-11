
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

    FetchAnnotations(searchKey, searchParam, callback) {
        $.ajax({
            url: this.baseURL + "/api/getAnnotationsByLocation",
            type: "GET",
            data: { [searchKey]: searchParam },
            dataType: "json",
            async: true,
            success: (data) => {
                console.log("Fetched " + data.annotations.length + " annotations for " + searchKey + ": \"" + searchParam + "\".");
                callback(data);
            },
            error: (response) => {
                console.error("Error fetching annotations for " + searchKey + ": \"" + searchParam + "\".");
            }
        });
    }

    PostAnnotation(callback){
        console.log("Posting annotation...");
        let annotation = this.annotator.gui.GetAnnotationObject();
        console.log(annotation);

        let auth_token = localStorage.getItem('waldorf_auth_token');
        if (auth_token === null) {
            console.error("You are not logged in!");
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
                annotation.metadata.id = data.id; // Append the ID given by the response
                if(callback) callback(annotation);
            },
            error: (response) => {
                console.error("Failed to post new annotation!");
            }

        });
    }

    EditAnnotation(callback){
        let annotation = this.annotator.gui.GetAnnotationObject();

        let auth_token = localStorage.getItem('waldorf_auth_token');
        if (auth_token === null) {
            console.error("You are not logged in!");
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
                //console.log(annotation);
                annotation.metadata.id = data.id; // Append the ID given by the response
                if(callback) callback(annotation, oldID);
            },
            error: (response) => {
                console.error("Failed to edit the annotation!");
            }

        });
    }

    DeleteAnnotation(annotation, callback){
        let auth_token = localStorage.getItem('waldorf_auth_token');
        if (auth_token === null) {
            console.error("You are not logged in!");
            return false;
        }

        console.log("Deleting annotation " + annotation.metadata.id);
        $.ajax({
            url: this.baseURL + "/api/deleteAnnotation",
            type: "DELETE",
            data: {
                "id": annotation.metadata.id
            },
            async: true,
            context: this,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', this.make_token_auth(auth_token));
            },
            success: (data) => {
                console.log("Successfully deleted the annotation.");
                if(callback) callback(annotation);
            },
            error: (response) => {
                console.error("Failed to delete annotation!");
            }

        });
    }

}


export { ServerInterface };