
class ServerInterface {
    constructor(){

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
            error: (data) => {
                console.error("Error fetching annotations for " + searchKey + ": \"" + searchParam + "\".");
            }
        });
    }

    PostAnnotation(){

    }

    DeleteAnnotation(){

    }

    DeprecateAnnotation(){

    }

    EditAnnotation(){

    }

}


export { ServerInterface };