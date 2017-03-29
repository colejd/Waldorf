import { VideoPlayerBar } from "./video-player-bar.js";
//import * as screenfull from "screenfull";

//import 'jquery-ui/dist/jquery-ui.js';
let screenfull = require('screenfull');

class AnnotatorVideoPlayer {
    constructor($video){
        console.log("[AnnotatorVideoPlayer] created for video.");

        this.$video = $video;
        this.videoElement = this.$video.get(0);

        this.Wrap();
        this.PopulateControls();
        this.SetVisible(true);

        // Hook up events
        this.HookUpEvents();

        // Play / pause the video when clicked.
        this.$video.on("click", () => this.TogglePlayState());

        this.allowAutoFade = true;
        /// Inactivity timer for the mouse.
        this.mouseTimer = null;
        /// Set to true if the time slider is currently being dragged by the user.
        this.draggingTimeSlider = false;
        /// Seconds before the UI fades due to mouse inactivity.
        this.idleSecondsBeforeFade = 3;
        this.fadeDuration = 300;

        this.$container.mousemove(() => this.OnMouseMove());
        this.SetAutoFade(true);

        screenfull.onchange(() => {
            this.OnFullscreenChange();
            this.$container.trigger("OnFullscreenChange");
        });

        this.videoElement.onloadedmetadata = () => {
            this.$container.trigger("OnVideoReady");
        };

        this.videoElement.ontimeupdate = () => {
            this.OnTimeUpdate(this.videoElement.currentTime);
        };
        
    }

    Wrap(){
        // Remove the default controls from the video
        this.videoElement.removeAttribute("controls");

        this.$container = this.$video.wrap("<div class='annotator-video-player'></div>").parent();
        // Resize video container to fit the dimensions of the video
        this.$container.width(this.$video.width());
        this.$container.height(this.$video.height());
        // Restyle the video to fill the video container
        this.$video.css('width', '100%');
        this.$video.css('height', '100%');
    }

    PopulateControls(){
        this.controlBar = new VideoPlayerBar(this);
    }

    SetVisible(isVisible, duration = 0){
        this.$container.trigger("OnVisibilityChange", [isVisible, duration]);
    }

    HookUpEvents(){
        
    }

    TogglePlayState(){
        if(this.videoElement.paused){
            this.Play();
        } else {
            this.Pause();
        }
    }

    Play(){
        this.videoElement.play();
        this.SetAutoFade(true);
        this.$container.trigger("OnPlayStateChange", !this.videoElement.paused);
    }

    Pause(){
        this.videoElement.pause();
        this.SetAutoFade(false);
        this.$container.trigger("OnPlayStateChange", !this.videoElement.paused);
    }

    ToggleMuteState(){
        let muted = this.videoElement.muted;
        this.videoElement.muted = !muted;
        this.$container.trigger("OnMuteStateChange", muted);
    }

    SetVolume(volume){
        this.videoElement.volume = volume;
        this.$container.trigger("OnVolumeChange", volume);
    }

    ToggleFullscreen(){
        screenfull.toggle(this.$container[0]);
    }

    OnFullscreenChange(){
        if(screenfull.isFullscreen){
            this.$container.addClass("-webkit-full-screen");
        }
        else{
            this.$container.removeClass("-webkit-full-screen");
        }
    }

    /**
     * Called when the mouse moves in the video container.
     */
    OnMouseMove(){
        // Reset the timer
        clearTimeout(this.mouseTimer);
        this.mouseTimer = 0;

        // Restart fading if allowed to
        if(this.allowAutoFade){
             this.RestartFading();
        }
    }

    OnTimeUpdate(time){
        this.$container.trigger("OnTimeUpdate", time);
    }

    RestartFading(){
        // Restore visibility
        this.SetVisible(true, this.fadeDuration);

        // Start the timer over again
        this.mouseTimer = setTimeout(()=>{
            this.SetVisible(false, this.fadeDuration);
        }, this.idleSecondsBeforeFade * 1000);
    }

    SetAutoFade(allow) {
        this.allowAutoFade = allow;
        
        // Reset the mouse timer
        clearTimeout(this.mouseTimer);
        this.mouseTimer = 0;

        // Make elements visible
        this.SetVisible(true);

        // Restart the fading behavior if desired
        if(allow){
            this.RestartFading();
        }
        
    }

    // IsPlaying(){
    //     // http://stackoverflow.com/a/31133401
    //     return !!(this.videoElement.currentTime > 0 && !this.videoElement.paused && 
    //               !this.videoElement.ended && this.videoElement.readyState > 2);
    // }

    // From https://gist.github.com/Nateowami/7a947e93f09c45a1097e783dc00560e1
    GetVideoDimensions() {
        let video = this.videoElement;
        // Ratio of the video's intrisic dimensions
        let videoRatio = video.videoWidth / video.videoHeight;
        // The width and height of the video element
        let width = video.offsetWidth;
        let height = video.offsetHeight;
        // The ratio of the element's width to its height
        let elementRatio = width / height;
        // If the video element is short and wide
        if(elementRatio > videoRatio) width = height * videoRatio;
        // It must be tall and thin, or exactly equal to the original ratio
        else height = width / videoRatio;

        return {
            width: width,
            height: height
        };
    }

}

export { AnnotatorVideoPlayer };