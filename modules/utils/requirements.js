/**
 * Returns false if running on an unsupported platform or missing jQuery, otherwise true.
 * 
 */
export function VerifyRequirements() {
    
    // Stop running if we're on an unsupported platform (mobile for now)
    // if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    //     console.error("Platform is unsupported!");
    //     //let unsupportedDiv = document.createElement("div");
    //     //unsupportedDiv.appendChild(document.createTextNode("Your platform is unsupported!"));
    //     //document.body.appendChild(unsupportedDiv);
    //     return false;
    // }

    // Check if we don't have jQuery loaded
    if(!window.jQuery){
        console.error("JQuery must be present!");
        //let unsupportedDiv = document.createElement("div");
        //unsupportedDiv.appendChild(document.createTextNode("Your platform is unsupported!"));
        //document.body.appendChild(unsupportedDiv);
        return false;
    }

    return true;
    
}