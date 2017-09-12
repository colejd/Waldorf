let sha1 = require('sha1');

class ServerInterface {
    constructor(annotator){
        this.annotator = annotator;
        //localStorage.removeItem('waldorf_auth_token');
    }

    SetBaseURL(url){
        this.baseURL = url;
    }

    make_base_auth(user, password) {
        var tok = user + ':' + password;
        var hash = btoa(tok);
        return 'Basic ' + hash;
    }

    make_write_auth(text){
        if(this.annotator.apiKey){
            return 'ApiKey ' + text;
        } else {
            return 'Token ' + text;
        }
    }

    LoggedIn(){
        if(this.annotator.apiKey){
            // Return true if an email has been entered
            let user_email = localStorage.getItem('waldorf_user_email');
            return user_email !== null;
        }
        else {
            // Return true if a token has been registered
            let auth_token = localStorage.getItem('waldorf_auth_token');
            return auth_token !== null;
        }
    }

    LogIn(username, password){
        // If API key is used, just store the email address
        if(this.annotator.apiKey){
            console.log("Successfully logged in.");
            localStorage.setItem('waldorf_user_email', username);
            return $.Deferred().resolve();
        }

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
        // If API key is used, just remove the email from local storage.
        if(this.annotator.apiKey){
            console.log("Successfully logged out.");
            localStorage.removeItem('waldorf_user_email');
            return $.Deferred().resolve();
        }

        return $.ajax({
            url: this.baseURL + "/api/logout",
            type: "DELETE",
            async: true,
            context: this,
            beforeSend: function (xhr) {
                let auth_token = localStorage.getItem('waldorf_auth_token') || "";
                console.log(`token: ${auth_token}`);
                xhr.setRequestHeader('Authorization', this.make_write_auth(auth_token));
            }
        }).done((data) => {
            console.log("Successfully logged out.");
            localStorage.removeItem('waldorf_auth_token');
        }).fail((response) => {
            console.error("Could not log out.");
            localStorage.removeItem('waldorf_auth_token');
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
            console.log("Fetched " + data.length + " annotations for " + searchKey + ": \"" + searchParam + "\".");
        }).fail((response) => {
            console.error("Error fetching annotations for " + searchKey + ": \"" + searchParam + "\".");
            this.annotator.messageOverlay.ShowError("Could not retrieve annotations!");
        });
    }

    PostAnnotation(callback){
        console.log("Posting annotation...");
        let annotation = this.annotator.gui.GetAnnotationObject();
        console.log(annotation);

        let key;
        if (this.annotator.apiKey){
            key = this.annotator.apiKey;
            let email_storage = localStorage.getItem('waldorf_user_email');
            if (email_storage === null) {
                console.error("You are not logged in!");
                this.annotator.messageOverlay.ShowError("You are not logged in!");
                return false;
            }
        } else {
            key = localStorage.getItem('waldorf_auth_token');
            if (key === null) {
                console.error("You are not logged in!");
                this.annotator.messageOverlay.ShowError("You are not logged in!");
                return false;
            }
        }

        if(this.annotator.apiKey){
            if(annotation["creator"] == null) annotation["creator"] = {};
            annotation["creator"]["email"] = sha1(localStorage.getItem('waldorf_user_email'));
            //annotation.metadata.userEmail = localStorage.getItem('waldorf_user_email');
            //anno_data["email"] = localStorage.getItem('waldorf_user_email'); // Email
        }
        
        //data = JSON.stringify(data);
        //console.log(anno_data);
        
        $.ajax({
            url: this.baseURL + "/api/addAnnotation",
            type: "POST",
            data: annotation,
            async: true,
            context: this,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', this.make_write_auth(key));
            },
            success: (data) => {
                console.log("Successfully posted new annotation.");
                this.annotator.messageOverlay.ShowMessage("Successfully created new annotation.");
                annotation.id = data.id; // Append the ID given by the response
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
        
        let key;
        if (this.annotator.apiKey){
            key = this.annotator.apiKey;
            let email_storage = localStorage.getItem('waldorf_user_email');
            if (email_storage === null) {
                console.error("You are not logged in!");
                this.annotator.messageOverlay.ShowError("You are not logged in!");
                return false;
            }
        } else {
            key = localStorage.getItem('waldorf_auth_token');
            if (key === null) {
                console.error("You are not logged in!");
                this.annotator.messageOverlay.ShowError("You are not logged in!");
                return false;
            }
        }

        if(this.annotator.apiKey){
            if(annotation["creator"] == null) annotation["creator"] = {};
            annotation["creator"]["email"] = sha1(localStorage.getItem('waldorf_user_email'));
        }

        let oldID = annotation.id;

        console.log("Modifying annotation " + oldID);
        
        $.ajax({
            url: this.baseURL + "/api/editAnnotation",
            type: "POST",
            data: annotation,
            async: true,
            context: this,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', this.make_write_auth(key));
            },
            success: (data) => {
                console.log("Successfully edited the annotation. (ID is now " + data.id + ")");
                this.annotator.messageOverlay.ShowMessage("Successfully edited the anotation.");
                //console.log(annotation);
                annotation.id = data.id; // Append the ID given by the response
                if(callback) callback(annotation, oldID);
            },
            error: (response) => {
                console.error("Failed to edit the annotation!");
                this.annotator.messageOverlay.ShowError("Could not edit the annotation!");
            }

        });
    }

    DeleteAnnotation(annotation){
        let key;
        if (this.annotator.apiKey){
            key = this.annotator.apiKey;
            let email_storage = localStorage.getItem('waldorf_user_email');
            if (email_storage === null) {
                console.error("You are not logged in!");
                this.annotator.messageOverlay.ShowError("You are not logged in!");
                let deferred = $.Deferred();
                deferred.reject({
                    success: false,
                    data: "Not logged in."
                });
                return deferred.promise();
            }
        } else {
            key = localStorage.getItem('waldorf_auth_token');
            if (key === null) {
                console.error("You are not logged in!");
                this.annotator.messageOverlay.ShowError("You are not logged in!");
                let deferred = $.Deferred();
                deferred.reject({
                    success: false,
                    data: "Not logged in."
                });
                return deferred.promise();
            }
        }

        console.log("Deleting annotation " + annotation.id);
        return $.ajax({
            url: this.baseURL + "/api/deleteAnnotation",
            type: "DELETE",
            data: {
                "id": annotation.id
            },
            async: true,
            context: this,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', this.make_write_auth(key));
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