import { GetFormattedTime } from "../utils/time.js";
import { SeekbarTooltip } from "./seekbar-tooltip.js";

class VideoPlayerBar {

    constructor(player){
        this.player = player; 
        this.$container = $("<div class='video-player-toolbar flex-toolbar'></div>").appendTo(player.$container);

        this.PopulateElements();

        this.scrubbingTimeSlider = false;
        this.videoPlayingBeforeTimeScrub = false;

        // Hook up to events from video player
        this.player.$container.on("OnVisibilityChange", 
            (event, isVisible, duration) => this.SetVisible(isVisible, duration)
        );

        this.player.$container.on("OnPlayStateChange", 
            (event, playing) => this.OnPlayStateChange(playing)
        );

        this.player.$container.on("OnTimeUpdate", 
            (event, time) => this.OnTimeUpdate(time)
        );

        this.player.$container.on("OnMuteStateChange", 
            (event, muted) => this.OnMuteStateChange(muted)
        );

        this.player.$container.on("OnVolumeChange", 
            (event, volume) => this.OnVolumeChange(volume)
        );
        
    }

    PopulateElements(){

        this.$seekBar = $("<div id='seek-bar'><div id='seek-handle' class='ui-slider-handle'></div></div>");
        let $seekSlider = this.$seekBar.slider({
            min: 0.0,
            max: 1.0,
            step: 0.001
        });
        $seekSlider.on("slide", () => this.UpdateVideoTime());
        $seekSlider.on("slidestart", () => this.TimeDragStarted());
        $seekSlider.on("slidestop", () => {
            this.TimeDragFinished();
            this.UpdateVideoTime();
        });
        this.$container.append(this.$seekBar);
        this.seekbarTooltip = new SeekbarTooltip(this.$seekBar, this.player);

        this.$seekProgress = $("<div id='seek-fill'></div>");
        this.$container.append(this.$seekProgress);

        // Play button
        this.$playButton = $("<div>Play</div>").button({
            icon: "ui-icon-play",
            showLabel: false
        }).click(() => this.player.TogglePlayState());
        this.RegisterElement(this.$playButton, -4);

        // Time text
        let zero = GetFormattedTime(0);
        this.$timeText = $("<p>${zero}/${zero}</p>");
        this.RegisterElement(this.$timeText, -3);

        // Mute button
        this.$muteButton = $("<div>Mute</div>").button({
            icon: "ui-icon-volume-on",
            showLabel: false,
        }).click(() => this.player.ToggleMuteState());
        this.RegisterElement(this.$muteButton, -2);

        // Volume bar
        this.$volumeBar = $("<div id='volume-bar'><div id='volume-handle' class='ui-slider-handle'></div></div>");
        this.$volumeBar.slider({
            range: "min",
            max: 1.0,
            value: 1.0,
            step: 0.05
        }).on("slide", (event, ui) => this.player.SetVolume(ui.value));
        this.RegisterElement(this.$volumeBar, -1);

        // Fullscreen button
        this.$fullScreenButton = $("<div>Fullscreen</div>").button({
            icon: "ui-icon-arrow-4-diag",
            showLabel: false
        }).click(() => this.player.ToggleFullscreen());
        this.RegisterElement(this.$fullScreenButton, 2, 'flex-end');
        
        // Create empty element between left floating and right floating toolbar items to space them out properly
        this.$container.append($("<div></div>").css("flex-grow", 1).css("order", 0));

        //Initialize controls
        this.OnTimeUpdate();
        this.$volumeBar.slider("value", this.player.videoElement.volume);
    }

    RegisterElement($element, order, justification = 'flex-start'){
        $element.css('order', order);
        $element.css('align-self', justification);
        // Sets grow [shrink] [basis]
        //$element.css('flex', '0 0 auto');
        this.$container.append($element);
    }

    SetVisible(isVisible, duration){
        //console.log(isVisible + " " + duration);
        if(isVisible){
            this.$container.fadeTo(duration, 1.0);
        } else {
            this.$container.stop(true, true);
            this.$container.fadeTo(duration, 0.0);
        }
    }

    UpdateVideoTime(){
        // Calculate the new time
        let time = this.player.videoElement.duration * this.$seekBar.slider("value");
        this.player.videoElement.currentTime = time;
    }

    TimeDragStarted(){
        this.videoPlayingBeforeTimeScrub = !this.player.videoElement.paused;
        this.player.videoElement.pause();
    }

    TimeDragFinished(){
        // Start playing the video again if it was playing before the scrub started
        if (this.videoPlayingBeforeTimeScrub){
            this.player.videoElement.play();
        }
    }

    ///
    /// ----- Event Listeners -----
    /// The following update the visual state of the bar
    /// upon changes to the video player. These are hooked
    /// up in the constructor.
    ///

    OnPlayStateChange(playing){
        this.$playButton.button("option", {
            icon: playing ? "ui-icon-pause" : "ui-icon-play"
        });
    }

    OnTimeUpdate(time){
        let duration = this.player.videoElement.duration;

        // Update the time text
        this.$timeText.text(GetFormattedTime(time) + "/" + GetFormattedTime(duration));

        let progress = time / duration;
        this.$seekProgress.width((progress * 100).toString() + "%");
    }

    OnVolumeChange(volume){
        this.$volumeBar.slider("value", volume);
    }

    OnMuteStateChange(muted){
        this.$muteButton.button("option", {
            icon: muted ? "ui-icon-volume-on" : "ui-icon-volume-off"
        });
    }

}

export { VideoPlayerBar }