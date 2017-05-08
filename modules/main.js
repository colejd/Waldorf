/*
Entry point for the whole project. Any jQuery extensions should
be registered here.
*/

// Import npm module dependencies
import "./vendor.js";

import "./utils/array-extensions.js";
import "./utils/jquery-extensions.js";
import "./utils/string-extensions.js";

import { preferences } from "./utils/preference-manager.js";
import { VerifyRequirements } from "./utils/requirements.js";
import { AnnotatorVideoPlayer } from "./video-player/video-player.js";
import { VideoAnnotator } from "./annotator/annotator.js";

//console.log(css);

console.log($.fn);

//Start running when the window finishes loading
window.addEventListener('load', function(){
    VerifyRequirements();
});

$.fn.annotate = function(serverURL, tagsURL) {
    // Error out early if "this" is not a video
    if($(this).prop('tagName').toLowerCase() != "video"){
        console.error("Cannot wrap a non-video element!");
        return;
    }

    // preferences.GetJSON((data) => {
    //     //console.log(data);
    // });
    
    // Wrap self with custom video player
    let player = new AnnotatorVideoPlayer($(this));
    let annotator = null;
    player.$container.on("OnVideoReady", () => {
        console.log("[Main] Player sent OnVideoReady, attempting to wrap with annotator...");
        // Add annotator once video has loaded
        if(annotator == null){
            console.log("[Main] Wrapping video with annotator...");
            annotator = new VideoAnnotator(player, serverURL, tagsURL);
        }
    });

};