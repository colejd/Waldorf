(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _annotationJs = require("./annotation.js");

var AnnotationManager = (function () {
    function AnnotationManager() {
        _classCallCheck(this, AnnotationManager);

        this.annotations = [];
    }

    AnnotationManager.prototype.PopulateFromJSON = function PopulateFromJSON(json) {
        if (json.annotations.length == 0) {
            console.warn("JSON contains no annotations.");
        }

        this.annotations = json.annotations.map(function (object) {
            return new _annotationJs.Annotation(object);
        });
    };

    AnnotationManager.prototype.AnnotationsAtTime = function AnnotationsAtTime(time) {

        var timeMS = time * 1000 | 0;

        // If the last time requested is asked for again, just give back the cached result
        // if(timeMS == this.lastTimeRequested){
        //     console.log("Using cache");
        //     return this.cachedResults;
        // }
        // this.lastTimeRequested = timeMS;

        // Filter all loaded annotations that fit within the range query.
        var filtered = this.annotations.filter(function (item) {
            return item.data.beginTime <= timeMS && timeMS <= item.data.endTime;
        });

        // Cache the results
        // this.cachedResults = filtered;

        return filtered;
    };

    return AnnotationManager;
})();

exports.AnnotationManager = AnnotationManager;

},{"./annotation.js":2}],2:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Annotation = (function () {
    function Annotation(json) {
        _classCallCheck(this, Annotation);

        // We could extend the JSON object directly but I'm worried about
        // name collisions. We'll just make it a property of the class.
        this.data = json.data;
        this.metadata = json.metadata;
    }

    Annotation.prototype.ToHTML = function ToHTML() {
        var lines = "";

        // Represent data
        lines += "<strong><em>{Data}</em></strong><br>";
        for (var propName in this.data) {
            var propValue = this.data[propName];
            lines += "&emsp;<em>[" + propName + "]</em><br>&emsp;&emsp;" + propValue + "<br>";
        }

        // Represent metadata
        lines += "<strong><em>{Metadata}</em></strong><br>";
        for (var propName in this.metadata) {
            var propValue = this.metadata[propName];
            lines += "&emsp;<em>[" + propName + "]</em><br>&emsp;&emsp;" + propValue + "<br>";
        }
        return lines;
    };

    return Annotation;
})();

exports.Annotation = Annotation;

},{}],3:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _serverInterfaceJs = require("./server-interface.js");

var _annotationManagerJs = require("./annotation-manager.js");

var _componentsTickBarJs = require("./components/tick-bar.js");

var _utilsPreferenceManagerJs = require("../utils/preference-manager.js");

var VideoAnnotator = (function () {
    function VideoAnnotator(player) {
        var _this = this;

        _classCallCheck(this, VideoAnnotator);

        console.log("[Annotator] created for video.");

        this.player = player;
        this.Wrap();
        this.PopulateControls();

        this.server = new _serverInterfaceJs.ServerInterface();
        this.server.SetBaseURL("http://130.111.199.37:3000"); // External
        //this.server.SetBaseURL("http://192.168.1.83:3000"); // Internal

        this.annotationManager = new _annotationManagerJs.AnnotationManager();

        this.server.FetchAnnotations('location', this.player.videoElement.currentSrc, function (json) {
            _this.annotationManager.PopulateFromJSON(json);
            _this.OnAnnotationsLoaded();
        });

        this.player.$container.on("OnTimeUpdate", function (event, time) {
            _this.OnTimeUpdate(time);
        });
    }

    VideoAnnotator.prototype.Preload = function Preload() {};

    /**
     * Creates the divs that surround the video player.
     */

    VideoAnnotator.prototype.Wrap = function Wrap() {
        this.$container = $(this.player.$container).wrap("<div class='annotator-container'></div>").parent();

        // Set the container to the width of the video player
        this.$container.width(this.player.$container.width());
    };

    VideoAnnotator.prototype.PopulateControls = function PopulateControls() {
        var _this2 = this;

        // Create the video overlay
        this.$videoOverlay = $("<div class='annotator-video-overlay'></div>").appendTo(this.player.$container);
        this.ResizeOverlay();
        this.player.$container.on("OnFullscreenChange", function (event, setFullscreen) {
            _this2.ResizeOverlay();
        });

        // Create the tick bar
        this.tickBar = new _componentsTickBarJs.TickBar(this);

        // Create the info container
        this.$info = $("<div class='annotator-info'></div>").appendTo(this.$container);
    };

    VideoAnnotator.prototype.OnAnnotationsLoaded = function OnAnnotationsLoaded() {
        // Populate the TickBar
        this.tickBar.LoadAnnotations(this.annotationManager);

        //TODO: Send annotation loaded event
    };

    VideoAnnotator.prototype.ResizeOverlay = function ResizeOverlay() {
        // Resize video overlay to fit actual video dimensions
        var videoDims = this.player.GetVideoDimensions();
        this.$videoOverlay.css('width', videoDims.width);
        this.$videoOverlay.css('height', videoDims.height);
        var heightDiff = (this.player.$video.height() - videoDims.height) / 2;
        this.$videoOverlay.css('top', heightDiff);
    };

    VideoAnnotator.prototype.OnTimeUpdate = function OnTimeUpdate(time) {
        var annotationsNow = this.annotationManager.AnnotationsAtTime(time);

        // Update the info container
        this.$info.html("<p>Showing " + annotationsNow.length + " annotations (" + this.annotationManager.annotations.length + " total).</p>");
        // Add each annotation to the readout
        for (var i = 0; i < annotationsNow.length; i++) {
            this.$info.append("<p><strong>Annotation " + (i + 1) + ":</strong><br>" + annotationsNow[i].ToHTML() + "</p>");
        }
    };

    return VideoAnnotator;
})();

exports.VideoAnnotator = VideoAnnotator;

},{"../utils/preference-manager.js":8,"./annotation-manager.js":1,"./components/tick-bar.js":4,"./server-interface.js":5}],4:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TickBar = (function () {
    function TickBar(annotator) {
        _classCallCheck(this, TickBar);

        this.annotator = annotator;

        // Create the element
        this.$tickBar = $("<div class='annotator-tickbar'></div>");
        this.annotator.player.controlBar.$container.append(this.$tickBar);
    }

    TickBar.prototype.LoadAnnotations = function LoadAnnotations(annotationManager) {
        var annotations = annotationManager.annotations;
        // Remove any children of the tick bar
        this.$tickBar.empty();

        for (var i = 0; i < annotations.length; i++) {
            var anno = annotations[i];
            var $tick = $("<div class='annotator-tickbar-tick'></div>").appendTo(this.$tickBar);

            var beginTime = anno.data.beginTime / 1000;
            var beginPercent = beginTime / this.annotator.player.videoElement.duration;
            $tick.css('left', (beginPercent * 100).toString() + "%");

            var endTime = anno.data.endTime / 1000;
            var endPercent = endTime / this.annotator.player.videoElement.duration;
            $tick.css('width', ((endPercent - beginPercent) * 100).toString() + "%");
        }
    };

    return TickBar;
})();

exports.TickBar = TickBar;

},{}],5:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ServerInterface = (function () {
    function ServerInterface() {
        _classCallCheck(this, ServerInterface);
    }

    ServerInterface.prototype.SetBaseURL = function SetBaseURL(url) {
        this.baseURL = url;
    };

    ServerInterface.prototype.FetchAnnotations = function FetchAnnotations(searchKey, searchParam, callback) {
        var _data;

        $.ajax({
            url: this.baseURL + "/annotators/getAnnotationsByLocation",
            type: "GET",
            data: (_data = {}, _data[searchKey] = searchParam, _data),
            dataType: "json",
            async: true,
            success: function success(data) {
                console.log("Fetched " + data.annotations.length + " annotations for " + searchKey + ": \"" + searchParam + "\".");
                callback(data);
            },
            error: function error(data) {
                console.error("Error fetching annotations for " + searchKey + ": \"" + searchParam + "\".");
            }
        });
    };

    ServerInterface.prototype.PostAnnotation = function PostAnnotation() {};

    ServerInterface.prototype.DeleteAnnotation = function DeleteAnnotation() {};

    ServerInterface.prototype.DeprecateAnnotation = function DeprecateAnnotation() {};

    ServerInterface.prototype.EditAnnotation = function EditAnnotation() {};

    return ServerInterface;
})();

exports.ServerInterface = ServerInterface;

},{}],6:[function(require,module,exports){
module.exports={
    "configFile": "annotator-config.json"
}
},{}],7:[function(require,module,exports){
(function (global){
/*
Entry point for the whole project. Any jQuery extensions should
be registered here.
*/

// Import JQuery for other plugins to use
"use strict";

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _jquery = (typeof window !== "undefined" ? window['jquery'] : typeof global !== "undefined" ? global['jquery'] : null);

var jquery = _interopRequireWildcard(_jquery);

var _utilsPreferenceManagerJs = require("./utils/preference-manager.js");

var _utilsRequirementsJs = require("./utils/requirements.js");

var _videoPlayerVideoPlayerJs = require("./video-player/video-player.js");

var _annotatorAnnotatorJs = require("./annotator/annotator.js");

//Start running when the window finishes loading
window.addEventListener('load', function () {
    _utilsRequirementsJs.VerifyRequirements();
});

$.fn.annotate = function () {
    // Error out early if "this" is not a video
    if ($(this).prop('tagName').toLowerCase() != "video") {
        console.error("Cannot wrap a non-video element!");
        return;
    }

    _utilsPreferenceManagerJs.preferences.GetJSON(function (data) {
        //console.log(data);
    });

    // Wrap self with custom video player
    var player = new _videoPlayerVideoPlayerJs.AnnotatorVideoPlayer($(this));
    player.$container.on("OnVideoReady", function () {
        // Add annotator once video has loaded
        var annotator = new _annotatorAnnotatorJs.VideoAnnotator(player);
    });
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./annotator/annotator.js":3,"./utils/preference-manager.js":8,"./utils/requirements.js":9,"./video-player/video-player.js":12}],8:[function(require,module,exports){
// Bring in build config options
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var metaconfig = require("../config.json");

var PreferenceManager = (function () {
    function PreferenceManager() {
        _classCallCheck(this, PreferenceManager);
    }

    PreferenceManager.prototype.GetJSON = function GetJSON(callback) {
        var _this = this;

        //let loc = window.location.pathname;
        //let dir = loc.substring(0, loc.lastIndexOf('/'));

        var dir = "./dist/";
        //console.log(dir + metaconfig.configFile);

        if (this.cachedJSON != null) {
            callback(this.cached);
        } else {
            $.ajax({
                dataType: "json",
                url: dir + metaconfig.configFile,
                success: function success(data) {
                    _this.cachedJSON = data;
                    callback(_this.cachedJSON);
                }
            });
        }
    };

    return PreferenceManager;
})();

var preferences = new PreferenceManager();
exports.preferences = preferences;

},{"../config.json":6}],9:[function(require,module,exports){
/**
 * Returns false if running on an unsupported platform or missing jQuery, otherwise true.
 * 
 */
"use strict";

exports.__esModule = true;
function VerifyRequirements() {

    // Stop running if we're on an unsupported platform (mobile for now)
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        console.error("Platform is unsupported!");
        var unsupportedDiv = document.createElement("div");
        unsupportedDiv.appendChild(document.createTextNode("Your platform is unsupported!"));
        document.body.appendChild(unsupportedDiv);
        return false;
    }

    // Check if we don't have jQuery loaded
    if (!window.jQuery) {
        console.error("JQuery must be present!");
        var unsupportedDiv = document.createElement("div");
        unsupportedDiv.appendChild(document.createTextNode("Your platform is unsupported!"));
        document.body.appendChild(unsupportedDiv);
        return false;
    }

    return true;
}

exports.VerifyRequirements = VerifyRequirements;

},{}],10:[function(require,module,exports){
// http://stackoverflow.com/a/34841026
"use strict";

exports.__esModule = true;
function GetFormattedTime(timeInSeconds) {
    var time = timeInSeconds | 0; //Truncate to integer
    var hours = Math.floor(time / 3600) % 24;
    var minutes = Math.floor(time / 60) % 60;
    var seconds = time % 60;
    var formatted = [hours, minutes, seconds].map(function (v) {
        return v < 10 ? "0" + v : v;
    }).filter(function (v, i) {
        return v !== "00" || i > 0;
    }).join(":");

    if (formatted.charAt(0) == "0") {
        formatted = formatted.substr(1);
    }

    return formatted;
}

// From http://stackoverflow.com/a/9640417/7138792
function GetSecondsFromHMS(hms) {
    var p = hms.split(':'),
        s = 0,
        m = 1;

    while (p.length > 0) {
        s += m * parseInt(p.pop(), 10);
        m *= 60;
    }

    return s;
}

exports.GetFormattedTime = GetFormattedTime;
exports.GetSecondsFromHMS = GetSecondsFromHMS;

},{}],11:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _utilsTimeJs = require("../utils/time.js");

var VideoPlayerBar = (function () {
    function VideoPlayerBar(player) {
        var _this = this;

        _classCallCheck(this, VideoPlayerBar);

        this.player = player;
        this.$container = $("<div class='video-player-toolbar flex-toolbar'></div>").appendTo(player.$container);

        this.PopulateElements();

        this.scrubbingTimeSlider = false;
        this.videoPlayingBeforeTimeScrub = false;

        // Hook up to events from video player
        this.player.$container.on("OnVisibilityChange", function (event, isVisible, duration) {
            _this.SetVisible(isVisible, duration);
        });

        this.player.$container.on("OnPlayStateChange", function (event, playing) {
            _this.OnPlayStateChange(playing);
        });

        this.player.$container.on("OnTimeUpdate", function (event, time) {
            _this.OnTimeUpdate(time);
        });

        this.player.$container.on("OnMuteStateChange", function (event, muted) {
            _this.OnMuteStateChange(muted);
        });

        this.player.$container.on("OnVolumeChange", function (event, volume) {
            _this.OnVolumeChange(volume);
        });
    }

    VideoPlayerBar.prototype.PopulateElements = function PopulateElements() {
        var _this2 = this;

        this.$seekBar = $("<div id='seek-bar'><div id='seek-handle' class='ui-slider-handle'></div></div>");
        var seekSlider = this.$seekBar.slider({
            min: 0.0,
            max: 1.0,
            step: 0.001
        });
        seekSlider.on("slide", function () {
            _this2.UpdateVideoTime();
        });
        seekSlider.on("slidestart", function () {
            _this2.TimeDragStarted();
        });
        seekSlider.on("slidestop", function () {
            _this2.TimeDragFinished();
            _this2.UpdateVideoTime(); // Update visuals
        });
        this.$container.append(this.$seekBar);

        this.$seekProgress = $("<div id='seek-fill'></div>");
        this.$container.append(this.$seekProgress);

        // Play button
        this.$playButton = $("<div>Play</div>").button({
            icon: "ui-icon-play",
            showLabel: false
        }).click(function () {
            _this2.player.TogglePlayState();
        });
        this.RegisterElement(this.$playButton, -4);

        // Time text
        this.$timeText = $("<p>0:00/0:00</p>");
        this.RegisterElement(this.$timeText, -3);

        // Mute button
        this.$muteButton = $("<div>Mute</div>").button({
            icon: "ui-icon-volume-on",
            showLabel: false
        }).click(function () {
            _this2.player.ToggleMuteState();
        });
        this.RegisterElement(this.$muteButton, -2);

        // Volume bar
        this.$volumeBar = $("<div id='volume-bar'><div id='volume-handle' class='ui-slider-handle'></div></div>");
        this.$volumeBar.slider({
            range: "min",
            max: 1.0,
            value: 1.0,
            step: 0.05
        }).on("slide", function () {
            _this2.player.SetVolume(_this2.$volumeBar.slider("value"));
        });
        this.RegisterElement(this.$volumeBar, -1);

        // Fullscreen button
        this.$fullScreenButton = $("<div>Fullscreen</div>").button({
            icon: "ui-icon-arrow-4-diag",
            showLabel: false
        }).click(function () {
            _this2.player.ToggleFullscreen();
        });
        this.RegisterElement(this.$fullScreenButton, 2, 'flex-end');

        // Create empty element between left floating and right floating toolbar items to space them out properly
        this.$container.append($("<div></div>").css("flex-grow", 1).css("order", 0));

        //Initialize controls
        this.OnTimeUpdate();
        this.$volumeBar.slider("value", this.player.videoElement.volume);
    };

    VideoPlayerBar.prototype.RegisterElement = function RegisterElement($element, order) {
        var justification = arguments.length <= 2 || arguments[2] === undefined ? 'flex-start' : arguments[2];

        $element.css('order', order);
        $element.css('align-self', justification);
        // Sets grow [shrink] [basis]
        //$element.css('flex', '0 0 auto');
        this.$container.append($element);
    };

    VideoPlayerBar.prototype.SetVisible = function SetVisible(isVisible, duration) {
        //console.log(isVisible + " " + duration);
        if (isVisible) {
            this.$container.fadeTo(duration, 1.0);
        } else {
            this.$container.stop(true, true);
            this.$container.fadeTo(duration, 0.0);
        }
    };

    VideoPlayerBar.prototype.UpdateVideoTime = function UpdateVideoTime() {
        // Calculate the new time
        var time = this.player.videoElement.duration * this.$seekBar.slider("value");
        this.player.videoElement.currentTime = time;
    };

    VideoPlayerBar.prototype.TimeDragStarted = function TimeDragStarted() {
        this.videoPlayingBeforeTimeScrub = !this.player.videoElement.paused;
        this.player.videoElement.pause();
    };

    VideoPlayerBar.prototype.TimeDragFinished = function TimeDragFinished() {
        // Start playing the video again if it was playing before the scrub started
        if (this.videoPlayingBeforeTimeScrub) {
            this.player.videoElement.play();
        }
    };

    ///
    /// ----- Event Listeners -----
    /// The following update the visual state of the bar
    /// upon changes to the video player. These are hooked
    /// up in the constructor.
    ///

    VideoPlayerBar.prototype.OnPlayStateChange = function OnPlayStateChange(playing) {
        this.$playButton.button("option", {
            icon: playing ? "ui-icon-pause" : "ui-icon-play"
        });
    };

    VideoPlayerBar.prototype.OnTimeUpdate = function OnTimeUpdate(time) {
        var duration = this.player.videoElement.duration;

        // Update the time text
        this.$timeText.text(_utilsTimeJs.GetFormattedTime(time) + "/" + _utilsTimeJs.GetFormattedTime(duration));

        var progress = time / duration;
        this.$seekProgress.width((progress * 100).toString() + "%");
    };

    VideoPlayerBar.prototype.OnVolumeChange = function OnVolumeChange(volume) {
        this.$volumeBar.slider("value", volume);
    };

    VideoPlayerBar.prototype.OnMuteStateChange = function OnMuteStateChange(muted) {
        this.$muteButton.button("option", {
            icon: muted ? "ui-icon-volume-on" : "ui-icon-volume-off"
        });
    };

    return VideoPlayerBar;
})();

exports.VideoPlayerBar = VideoPlayerBar;

},{"../utils/time.js":10}],12:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _videoPlayerBarJs = require("./video-player-bar.js");

var _screenfull = require("screenfull");

var screenfull = _interopRequireWildcard(_screenfull);

//import 'jquery-ui/dist/jquery-ui.js';

var AnnotatorVideoPlayer = (function () {
    function AnnotatorVideoPlayer($video) {
        var _this = this;

        _classCallCheck(this, AnnotatorVideoPlayer);

        console.log("[AnnotatorVideoPlayer] created for video.");

        this.$video = $video;
        this.videoElement = this.$video.get(0);

        this.Wrap();
        this.PopulateControls();
        this.SetVisible(true);

        // Hook up events
        this.HookUpEvents();

        // Need to manually keep track of fullscreen state since
        // screenfull isn't working for this purpose
        this.isFullscreen = false;

        // Play / pause the video when clicked.
        this.$video.on("click", function () {
            _this.TogglePlayState();
        });

        this.allowAutoFade = true;
        /// Inactivity timer for the mouse.
        this.mouseTimer = null;
        /// Set to true if the time slider is currently being dragged by the user.
        this.draggingTimeSlider = false;
        /// Seconds before the UI fades due to mouse inactivity.
        this.idleSecondsBeforeFade = 3;
        this.fadeDuration = 300;

        this.$container.mousemove(function () {
            _this.OnMouseMove();
        });
        this.SetAutoFade(true);

        $(document).on(screenfull.raw.fullscreenchange, function () {
            _this.$container.trigger("OnFullscreenChange", _this.isFullscreen);
        });

        this.videoElement.onloadedmetadata = function () {
            _this.$container.trigger("OnVideoReady");
        };

        this.$video.on("timeupdate", function (event) {
            _this.OnTimeUpdate(_this.videoElement.currentTime);
        });
    }

    AnnotatorVideoPlayer.prototype.Wrap = function Wrap() {
        // Remove the default controls from the video
        this.videoElement.removeAttribute("controls");

        this.$container = this.$video.wrap("<div class='annotator-video-player'></div>").parent();
        // Resize video container to fit the dimensions of the video
        this.$container.width(this.$video.width());
        this.$container.height(this.$video.height());
        // Restyle the video to fill the video container
        this.$video.css('width', '100%');
        this.$video.css('height', '100%');
    };

    AnnotatorVideoPlayer.prototype.PopulateControls = function PopulateControls() {
        this.controlBar = new _videoPlayerBarJs.VideoPlayerBar(this);
    };

    AnnotatorVideoPlayer.prototype.SetVisible = function SetVisible(isVisible) {
        var duration = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

        this.$container.trigger("OnVisibilityChange", [isVisible, duration]);
    };

    AnnotatorVideoPlayer.prototype.HookUpEvents = function HookUpEvents() {};

    AnnotatorVideoPlayer.prototype.TogglePlayState = function TogglePlayState() {
        if (this.videoElement.paused) {
            this.Play();
        } else {
            this.Pause();
        }
    };

    AnnotatorVideoPlayer.prototype.Play = function Play() {
        this.videoElement.play();
        this.SetAutoFade(true);
        this.$container.trigger("OnPlayStateChange", !this.videoElement.paused);
    };

    AnnotatorVideoPlayer.prototype.Pause = function Pause() {
        this.videoElement.pause();
        this.SetAutoFade(false);
        this.$container.trigger("OnPlayStateChange", !this.videoElement.paused);
    };

    AnnotatorVideoPlayer.prototype.ToggleMuteState = function ToggleMuteState() {
        var muted = this.videoElement.muted;
        this.videoElement.muted = !muted;
        this.$container.trigger("OnMuteStateChange", muted);
    };

    AnnotatorVideoPlayer.prototype.SetVolume = function SetVolume(volume) {
        this.videoElement.volume = volume;
        this.$container.trigger("OnVolumeChange", volume);
    };

    AnnotatorVideoPlayer.prototype.ToggleFullscreen = function ToggleFullscreen() {
        if (this.isFullscreen) {
            screenfull.exit();
            this.$container.removeClass("-webkit-full-screen");
        } else {
            screenfull.request(this.$container[0]);
            this.$container.addClass("-webkit-full-screen");
        }
        this.isFullscreen = !this.isFullscreen;

        //this.$container.trigger("OnFullscreenChange", this.isFullscreen);
    };

    /**
     * Called when the mouse moves in the video container.
     */

    AnnotatorVideoPlayer.prototype.OnMouseMove = function OnMouseMove() {
        // Reset the timer
        if (this.mouseTimer) {
            clearTimeout(this.mouseTimer);
            this.mouseTimer = 0;
        }

        // Restart fading if allowed to
        if (this.allowAutoFade) {
            this.RestartFading();
        }
    };

    AnnotatorVideoPlayer.prototype.OnTimeUpdate = function OnTimeUpdate(time) {
        this.$container.trigger("OnTimeUpdate", time);
    };

    AnnotatorVideoPlayer.prototype.RestartFading = function RestartFading() {
        var _this2 = this;

        // Restore visibility
        this.SetVisible(true, this.fadeDuration);

        // Start the timer over again
        this.mouseTimer = setTimeout(function () {
            _this2.SetVisible(false, _this2.fadeDuration);
        }, this.idleSecondsBeforeFade * 1000);
    };

    AnnotatorVideoPlayer.prototype.SetAutoFade = function SetAutoFade(allow) {
        // If we're stopping autofade and the animation is running,
        // cancel it. Then reset the timer
        if (!allow && this.mouseTimer) {
            clearTimeout(this.mouseTimer);
            this.mouseTimer = 0;
            this.SetVisible(true);
        }

        this.allowAutoFade = allow;

        if (allow) {
            this.RestartFading();
        }
    };

    // IsPlaying(){
    //     // http://stackoverflow.com/a/31133401
    //     return !!(this.videoElement.currentTime > 0 && !this.videoElement.paused &&
    //               !this.videoElement.ended && this.videoElement.readyState > 2);
    // }

    // From https://gist.github.com/Nateowami/7a947e93f09c45a1097e783dc00560e1

    AnnotatorVideoPlayer.prototype.GetVideoDimensions = function GetVideoDimensions() {
        var video = this.videoElement;
        // Ratio of the video's intrisic dimensions
        var videoRatio = video.videoWidth / video.videoHeight;
        // The width and height of the video element
        var width = video.offsetWidth;
        var height = video.offsetHeight;
        // The ratio of the element's width to its height
        var elementRatio = width / height;
        // If the video element is short and wide
        if (elementRatio > videoRatio) width = height * videoRatio;
        // It must be tall and thin, or exactly equal to the original ratio
        else height = width / videoRatio;

        return {
            width: width,
            height: height
        };
    };

    return AnnotatorVideoPlayer;
})();

exports.AnnotatorVideoPlayer = AnnotatorVideoPlayer;

},{"./video-player-bar.js":11,"screenfull":13}],13:[function(require,module,exports){
/*!
* screenfull
* v3.0.0 - 2015-11-24
* (c) Sindre Sorhus; MIT License
*/
(function () {
	'use strict';

	var isCommonjs = typeof module !== 'undefined' && module.exports;
	var keyboardAllowed = typeof Element !== 'undefined' && 'ALLOW_KEYBOARD_INPUT' in Element;

	var fn = (function () {
		var val;
		var valLength;

		var fnMap = [
			[
				'requestFullscreen',
				'exitFullscreen',
				'fullscreenElement',
				'fullscreenEnabled',
				'fullscreenchange',
				'fullscreenerror'
			],
			// new WebKit
			[
				'webkitRequestFullscreen',
				'webkitExitFullscreen',
				'webkitFullscreenElement',
				'webkitFullscreenEnabled',
				'webkitfullscreenchange',
				'webkitfullscreenerror'

			],
			// old WebKit (Safari 5.1)
			[
				'webkitRequestFullScreen',
				'webkitCancelFullScreen',
				'webkitCurrentFullScreenElement',
				'webkitCancelFullScreen',
				'webkitfullscreenchange',
				'webkitfullscreenerror'

			],
			[
				'mozRequestFullScreen',
				'mozCancelFullScreen',
				'mozFullScreenElement',
				'mozFullScreenEnabled',
				'mozfullscreenchange',
				'mozfullscreenerror'
			],
			[
				'msRequestFullscreen',
				'msExitFullscreen',
				'msFullscreenElement',
				'msFullscreenEnabled',
				'MSFullscreenChange',
				'MSFullscreenError'
			]
		];

		var i = 0;
		var l = fnMap.length;
		var ret = {};

		for (; i < l; i++) {
			val = fnMap[i];
			if (val && val[1] in document) {
				for (i = 0, valLength = val.length; i < valLength; i++) {
					ret[fnMap[0][i]] = val[i];
				}
				return ret;
			}
		}

		return false;
	})();

	var screenfull = {
		request: function (elem) {
			var request = fn.requestFullscreen;

			elem = elem || document.documentElement;

			// Work around Safari 5.1 bug: reports support for
			// keyboard in fullscreen even though it doesn't.
			// Browser sniffing, since the alternative with
			// setTimeout is even worse.
			if (/5\.1[\.\d]* Safari/.test(navigator.userAgent)) {
				elem[request]();
			} else {
				elem[request](keyboardAllowed && Element.ALLOW_KEYBOARD_INPUT);
			}
		},
		exit: function () {
			document[fn.exitFullscreen]();
		},
		toggle: function (elem) {
			if (this.isFullscreen) {
				this.exit();
			} else {
				this.request(elem);
			}
		},
		raw: fn
	};

	if (!fn) {
		if (isCommonjs) {
			module.exports = false;
		} else {
			window.screenfull = false;
		}

		return;
	}

	Object.defineProperties(screenfull, {
		isFullscreen: {
			get: function () {
				return Boolean(document[fn.fullscreenElement]);
			}
		},
		element: {
			enumerable: true,
			get: function () {
				return document[fn.fullscreenElement];
			}
		},
		enabled: {
			enumerable: true,
			get: function () {
				// Coerce to boolean in case of old WebKit
				return Boolean(document[fn.fullscreenEnabled]);
			}
		}
	});

	if (isCommonjs) {
		module.exports = screenfull;
	} else {
		window.screenfull = screenfull;
	}
})();

},{}]},{},[7])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvam9uYXRoYW5jb2xlL0Rldi9Qcm9qZWN0cy9Xb3JrL2Fubm90YXRvci1mcm9udGVuZC9tb2R1bGVzL2Fubm90YXRvci9hbm5vdGF0aW9uLW1hbmFnZXIuanMiLCIvVXNlcnMvam9uYXRoYW5jb2xlL0Rldi9Qcm9qZWN0cy9Xb3JrL2Fubm90YXRvci1mcm9udGVuZC9tb2R1bGVzL2Fubm90YXRvci9hbm5vdGF0aW9uLmpzIiwiL1VzZXJzL2pvbmF0aGFuY29sZS9EZXYvUHJvamVjdHMvV29yay9hbm5vdGF0b3ItZnJvbnRlbmQvbW9kdWxlcy9hbm5vdGF0b3IvYW5ub3RhdG9yLmpzIiwiL1VzZXJzL2pvbmF0aGFuY29sZS9EZXYvUHJvamVjdHMvV29yay9hbm5vdGF0b3ItZnJvbnRlbmQvbW9kdWxlcy9hbm5vdGF0b3IvY29tcG9uZW50cy90aWNrLWJhci5qcyIsIi9Vc2Vycy9qb25hdGhhbmNvbGUvRGV2L1Byb2plY3RzL1dvcmsvYW5ub3RhdG9yLWZyb250ZW5kL21vZHVsZXMvYW5ub3RhdG9yL3NlcnZlci1pbnRlcmZhY2UuanMiLCJtb2R1bGVzL2NvbmZpZy5qc29uIiwiL1VzZXJzL2pvbmF0aGFuY29sZS9EZXYvUHJvamVjdHMvV29yay9hbm5vdGF0b3ItZnJvbnRlbmQvbW9kdWxlcy9tYWluLmpzIiwiL1VzZXJzL2pvbmF0aGFuY29sZS9EZXYvUHJvamVjdHMvV29yay9hbm5vdGF0b3ItZnJvbnRlbmQvbW9kdWxlcy91dGlscy9wcmVmZXJlbmNlLW1hbmFnZXIuanMiLCIvVXNlcnMvam9uYXRoYW5jb2xlL0Rldi9Qcm9qZWN0cy9Xb3JrL2Fubm90YXRvci1mcm9udGVuZC9tb2R1bGVzL3V0aWxzL3JlcXVpcmVtZW50cy5qcyIsIi9Vc2Vycy9qb25hdGhhbmNvbGUvRGV2L1Byb2plY3RzL1dvcmsvYW5ub3RhdG9yLWZyb250ZW5kL21vZHVsZXMvdXRpbHMvdGltZS5qcyIsIi9Vc2Vycy9qb25hdGhhbmNvbGUvRGV2L1Byb2plY3RzL1dvcmsvYW5ub3RhdG9yLWZyb250ZW5kL21vZHVsZXMvdmlkZW8tcGxheWVyL3ZpZGVvLXBsYXllci1iYXIuanMiLCIvVXNlcnMvam9uYXRoYW5jb2xlL0Rldi9Qcm9qZWN0cy9Xb3JrL2Fubm90YXRvci1mcm9udGVuZC9tb2R1bGVzL3ZpZGVvLXBsYXllci92aWRlby1wbGF5ZXIuanMiLCJub2RlX21vZHVsZXMvc2NyZWVuZnVsbC9kaXN0L3NjcmVlbmZ1bGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7NEJDQTJCLGlCQUFpQjs7SUFFdEMsaUJBQWlCO0FBQ1IsYUFEVCxpQkFBaUIsR0FDTjs4QkFEWCxpQkFBaUI7O0FBRWYsWUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7S0FDekI7O0FBSEMscUJBQWlCLFdBS25CLGdCQUFnQixHQUFBLDBCQUFDLElBQUksRUFBQztBQUNsQixZQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBQztBQUM3QixtQkFBTyxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1NBQ2pEOztBQUVELFlBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBQyxNQUFNLEVBQUs7QUFDaEQsbUJBQU8sNkJBQWUsTUFBTSxDQUFDLENBQUM7U0FDakMsQ0FBQyxDQUFDO0tBRU47O0FBZEMscUJBQWlCLFdBZ0JuQixpQkFBaUIsR0FBQSwyQkFBQyxJQUFJLEVBQUM7O0FBR25CLFlBQUksTUFBTSxHQUFHLEFBQUMsSUFBSSxHQUFHLElBQUksR0FBSSxDQUFDLENBQUM7Ozs7Ozs7Ozs7QUFVL0IsWUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBUyxJQUFJLEVBQUM7QUFDakQsbUJBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksTUFBTSxJQUFJLE1BQU0sSUFBSSxJ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TSxFQUFFLE1BQU07U0FDakIsQ0FBQztLQUNMOztXQWpNQyxvQkFBb0I7OztRQXFNakIsb0JBQW9CLEdBQXBCLG9CQUFvQjs7O0FDMU03QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCB7IEFubm90YXRpb24gfSBmcm9tIFwiLi9hbm5vdGF0aW9uLmpzXCI7XG5cbmNsYXNzIEFubm90YXRpb25NYW5hZ2VyIHtcbiAgICBjb25zdHJ1Y3Rvcigpe1xuICAgICAgICB0aGlzLmFubm90YXRpb25zID0gW107XG4gICAgfVxuXG4gICAgUG9wdWxhdGVGcm9tSlNPTihqc29uKXtcbiAgICAgICAgaWYgKGpzb24uYW5ub3RhdGlvbnMubGVuZ3RoID09IDApe1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFwiSlNPTiBjb250YWlucyBubyBhbm5vdGF0aW9ucy5cIik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmFubm90YXRpb25zID0ganNvbi5hbm5vdGF0aW9ucy5tYXAoKG9iamVjdCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBBbm5vdGF0aW9uKG9iamVjdCk7XG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgQW5ub3RhdGlvbnNBdFRpbWUodGltZSl7XG5cblxuICAgICAgICBsZXQgdGltZU1TID0gKHRpbWUgKiAxMDAwKSB8IDA7XG5cbiAgICAgICAgLy8gSWYgdGhlIGxhc3QgdGltZSByZXF1ZXN0ZWQgaXMgYXNrZWQgZm9yIGFnYWluLCBqdXN0IGdpdmUgYmFjayB0aGUgY2FjaGVkIHJlc3VsdFxuICAgICAgICAvLyBpZih0aW1lTVMgPT0gdGhpcy5sYXN0VGltZVJlcXVlc3RlZCl7XG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZyhcIlVzaW5nIGNhY2hlXCIpO1xuICAgICAgICAvLyAgICAgcmV0dXJuIHRoaXMuY2FjaGVkUmVzdWx0cztcbiAgICAgICAgLy8gfVxuICAgICAgICAvLyB0aGlzLmxhc3RUaW1lUmVxdWVzdGVkID0gdGltZU1TO1xuXG4gICAgICAgIC8vIEZpbHRlciBhbGwgbG9hZGVkIGFubm90YXRpb25zIHRoYXQgZml0IHdpdGhpbiB0aGUgcmFuZ2UgcXVlcnkuXG4gICAgICAgIGxldCBmaWx0ZXJlZCA9IHRoaXMuYW5ub3RhdGlvbnMuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgICAgICAgcmV0dXJuIGl0ZW0uZGF0YS5iZWdpblRpbWUgPD0gdGltZU1TICYmIHRpbWVNUyA8PSBpdGVtLmRhdGEuZW5kVGltZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2FjaGUgdGhlIHJlc3VsdHNcbiAgICAgICAgLy8gdGhpcy5jYWNoZWRSZXN1bHRzID0gZmlsdGVyZWQ7XG5cbiAgICAgICAgcmV0dXJuIGZpbHRlcmVkO1xuICAgIH1cblxufVxuXG5leHBvcnQgeyBBbm5vdGF0aW9uTWFuYWdlciB9OyIsIlxuY2xhc3MgQW5ub3RhdGlvbntcbiAgICBjb25zdHJ1Y3Rvcihqc29uKXtcbiAgICAgICAgLy8gV2UgY291bGQgZXh0ZW5kIHRoZSBKU09OIG9iamVjdCBkaXJlY3RseSBidXQgSSdtIHdvcnJpZWQgYWJvdXRcbiAgICAgICAgLy8gbmFtZSBjb2xsaXNpb25zLiBXZSdsbCBqdXN0IG1ha2UgaXQgYSBwcm9wZXJ0eSBvZiB0aGUgY2xhc3MuXG4gICAgICAgIHRoaXMuZGF0YSA9IGpzb24uZGF0YTtcbiAgICAgICAgdGhpcy5tZXRhZGF0YSA9IGpzb24ubWV0YWRhdGE7XG4gICAgfVxuXG4gICAgVG9IVE1MKCkge1xuICAgICAgICBsZXQgbGluZXMgPSBcIlwiXG4gICAgICAgIFxuICAgICAgICAvLyBSZXByZXNlbnQgZGF0YVxuICAgICAgICBsaW5lcyArPSBcIjxzdHJvbmc+PGVtPntEYXRhfTwvZW0+PC9zdHJvbmc+PGJyPlwiO1xuICAgICAgICBmb3IobGV0IHByb3BOYW1lIGluIHRoaXMuZGF0YSkge1xuICAgICAgICAgICAgbGV0IHByb3BWYWx1ZSA9IHRoaXMuZGF0YVtwcm9wTmFtZV07XG4gICAgICAgICAgICBsaW5lcyArPSBcIiZlbXNwOzxlbT5bXCIgKyBwcm9wTmFtZSArIFwiXTwvZW0+PGJyPiZlbXNwOyZlbXNwO1wiICsgcHJvcFZhbHVlICsgXCI8YnI+XCI7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlcHJlc2VudCBtZXRhZGF0YVxuICAgICAgICBsaW5lcyArPSBcIjxzdHJvbmc+PGVtPntNZXRhZGF0YX08L2VtPjwvc3Ryb25nPjxicj5cIjtcbiAgICAgICAgZm9yKGxldCBwcm9wTmFtZSBpbiB0aGlzLm1ldGFkYXRhKSB7XG4gICAgICAgICAgICBsZXQgcHJvcFZhbHVlID0gdGhpcy5tZXRhZGF0YVtwcm9wTmFtZV07XG4gICAgICAgICAgICBsaW5lcyArPSBcIiZlbXNwOzxlbT5bXCIgKyBwcm9wTmFtZSArIFwiXTwvZW0+PGJyPiZlbXNwOyZlbXNwO1wiICsgcHJvcFZhbHVlICsgXCI8YnI+XCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpbmVzO1xuICAgIH1cblxufVxuXG5leHBvcnQgeyBBbm5vdGF0aW9uIH07IiwiaW1wb3J0IHsgU2VydmVySW50ZXJmYWNlIH0gZnJvbSBcIi4vc2VydmVyLWludGVyZmFjZS5qc1wiO1xuaW1wb3J0IHsgQW5ub3RhdGlvbk1hbmFnZXIgfSBmcm9tIFwiLi9hbm5vdGF0aW9uLW1hbmFnZXIuanNcIjtcbmltcG9ydCB7IFRpY2tCYXIgfSBmcm9tIFwiLi9jb21wb25lbnRzL3RpY2stYmFyLmpzXCI7XG5pbXBvcnQgeyBwcmVmZXJlbmNlcyB9IGZyb20gXCIuLi91dGlscy9wcmVmZXJlbmNlLW1hbmFnZXIuanNcIjtcblxuY2xhc3MgVmlkZW9Bbm5vdGF0b3Ige1xuICAgIGNvbnN0cnVjdG9yKHBsYXllcil7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiW0Fubm90YXRvcl0gY3JlYXRlZCBmb3IgdmlkZW8uXCIpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5wbGF5ZXIgPSBwbGF5ZXI7XG4gICAgICAgIHRoaXMuV3JhcCgpO1xuICAgICAgICB0aGlzLlBvcHVsYXRlQ29udHJvbHMoKTtcblxuICAgICAgICB0aGlzLnNlcnZlciA9IG5ldyBTZXJ2ZXJJbnRlcmZhY2UoKTtcbiAgICAgICAgdGhpcy5zZXJ2ZXIuU2V0QmFzZVVSTChcImh0dHA6Ly8xMzAuMTExLjE5OS4zNzozMDAwXCIpOyAvLyBFeHRlcm5hbFxuICAgICAgICAvL3RoaXMuc2VydmVyLlNldEJhc2VVUkwoXCJodHRwOi8vMTkyLjE2OC4xLjgzOjMwMDBcIik7IC8vIEludGVybmFsXG4gICAgICAgIFxuICAgICAgICB0aGlzLmFubm90YXRpb25NYW5hZ2VyID0gbmV3IEFubm90YXRpb25NYW5hZ2VyKCk7XG5cbiAgICAgICAgdGhpcy5zZXJ2ZXIuRmV0Y2hBbm5vdGF0aW9ucygnbG9jYXRpb24nLCB0aGlzLnBsYXllci52aWRlb0VsZW1lbnQuY3VycmVudFNyYywgKGpzb24pPT57XG4gICAgICAgICAgICB0aGlzLmFubm90YXRpb25NYW5hZ2VyLlBvcHVsYXRlRnJvbUpTT04oanNvbik7XG4gICAgICAgICAgICB0aGlzLk9uQW5ub3RhdGlvbnNMb2FkZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5wbGF5ZXIuJGNvbnRhaW5lci5vbihcIk9uVGltZVVwZGF0ZVwiLCAoZXZlbnQsIHRpbWUpID0+IHtcbiAgICAgICAgICAgIHRoaXMuT25UaW1lVXBkYXRlKHRpbWUpO1xuICAgICAgICB9KTtcblxuICAgIH1cblxuICAgIFByZWxvYWQoKXtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgdGhlIGRpdnMgdGhhdCBzdXJyb3VuZCB0aGUgdmlkZW8gcGxheWVyLlxuICAgICAqL1xuICAgIFdyYXAoKXtcbiAgICAgICAgdGhpcy4kY29udGFpbmVyID0gJCh0aGlzLnBsYXllci4kY29udGFpbmVyKS53cmFwKFwiPGRpdiBjbGFzcz0nYW5ub3RhdG9yLWNvbnRhaW5lcic+PC9kaXY+XCIpLnBhcmVudCgpO1xuXG4gICAgICAgIC8vIFNldCB0aGUgY29udGFpbmVyIHRvIHRoZSB3aWR0aCBvZiB0aGUgdmlkZW8gcGxheWVyXG4gICAgICAgIHRoaXMuJGNvbnRhaW5lci53aWR0aCh0aGlzLnBsYXllci4kY29udGFpbmVyLndpZHRoKCkpO1xuICAgIH1cblxuICAgIFBvcHVsYXRlQ29udHJvbHMoKXtcbiAgICAgICAgLy8gQ3JlYXRlIHRoZSB2aWRlbyBvdmVybGF5XG4gICAgICAgIHRoaXMuJHZpZGVvT3ZlcmxheSA9ICQoXCI8ZGl2IGNsYXNzPSdhbm5vdGF0b3ItdmlkZW8tb3ZlcmxheSc+PC9kaXY+XCIpLmFwcGVuZFRvKHRoaXMucGxheWVyLiRjb250YWluZXIpO1xuICAgICAgICB0aGlzLlJlc2l6ZU92ZXJsYXkoKTtcbiAgICAgICAgdGhpcy5wbGF5ZXIuJGNvbnRhaW5lci5vbihcIk9uRnVsbHNjcmVlbkNoYW5nZVwiLCAoZXZlbnQsIHNldEZ1bGxzY3JlZW4pID0+IHtcbiAgICAgICAgICAgIHRoaXMuUmVzaXplT3ZlcmxheSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIHRpY2sgYmFyXG4gICAgICAgIHRoaXMudGlja0JhciA9IG5ldyBUaWNrQmFyKHRoaXMpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgaW5mbyBjb250YWluZXJcbiAgICAgICAgdGhpcy4kaW5mbyA9ICQoXCI8ZGl2IGNsYXNzPSdhbm5vdGF0b3ItaW5mbyc+PC9kaXY+XCIpLmFwcGVuZFRvKHRoaXMuJGNvbnRhaW5lcik7XG5cbiAgICB9XG5cbiAgICBPbkFubm90YXRpb25zTG9hZGVkKCl7XG4gICAgICAgIC8vIFBvcHVsYXRlIHRoZSBUaWNrQmFyXG4gICAgICAgIHRoaXMudGlja0Jhci5Mb2FkQW5ub3RhdGlvbnModGhpcy5hbm5vdGF0aW9uTWFuYWdlcik7XG5cbiAgICAgICAgLy9UT0RPOiBTZW5kIGFubm90YXRpb24gbG9hZGVkIGV2ZW50XG4gICAgfVxuXG4gICAgUmVzaXplT3ZlcmxheSgpe1xuICAgICAgICAvLyBSZXNpemUgdmlkZW8gb3ZlcmxheSB0byBmaXQgYWN0dWFsIHZpZGVvIGRpbWVuc2lvbnNcbiAgICAgICAgbGV0IHZpZGVvRGltcyA9IHRoaXMucGxheWVyLkdldFZpZGVvRGltZW5zaW9ucygpO1xuICAgICAgICB0aGlzLiR2aWRlb092ZXJsYXkuY3NzKCd3aWR0aCcsIHZpZGVvRGltcy53aWR0aCk7XG4gICAgICAgIHRoaXMuJHZpZGVvT3ZlcmxheS5jc3MoJ2hlaWdodCcsIHZpZGVvRGltcy5oZWlnaHQpO1xuICAgICAgICBsZXQgaGVpZ2h0RGlmZiA9ICh0aGlzLnBsYXllci4kdmlkZW8uaGVpZ2h0KCkgLSB2aWRlb0RpbXMuaGVpZ2h0KSAvIDI7XG4gICAgICAgIHRoaXMuJHZpZGVvT3ZlcmxheS5jc3MoJ3RvcCcsIGhlaWdodERpZmYpO1xuXG4gICAgfVxuXG4gICAgT25UaW1lVXBkYXRlKHRpbWUpe1xuICAgICAgICBsZXQgYW5ub3RhdGlvbnNOb3cgPSB0aGlzLmFubm90YXRpb25NYW5hZ2VyLkFubm90YXRpb25zQXRUaW1lKHRpbWUpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgaW5mbyBjb250YWluZXJcbiAgICAgICAgdGhpcy4kaW5mby5odG1sKFwiPHA+U2hvd2luZyBcIiArIGFubm90YXRpb25zTm93Lmxlbmd0aCArIFwiIGFubm90YXRpb25zIChcIiArIHRoaXMuYW5ub3RhdGlvbk1hbmFnZXIuYW5ub3RhdGlvbnMubGVuZ3RoICsgXCIgdG90YWwpLjwvcD5cIik7XG4gICAgICAgIC8vIEFkZCBlYWNoIGFubm90YXRpb24gdG8gdGhlIHJlYWRvdXRcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbm5vdGF0aW9uc05vdy5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICB0aGlzLiRpbmZvLmFwcGVuZChcIjxwPjxzdHJvbmc+QW5ub3RhdGlvbiBcIiArIChpICsgMSkgKyBcIjo8L3N0cm9uZz48YnI+XCIgKyBhbm5vdGF0aW9uc05vd1tpXS5Ub0hUTUwoKSArIFwiPC9wPlwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5cbmV4cG9ydCB7IFZpZGVvQW5ub3RhdG9yIH07IiwiXG5jbGFzcyBUaWNrQmFyIHtcbiAgICBjb25zdHJ1Y3Rvcihhbm5vdGF0b3Ipe1xuICAgICAgICB0aGlzLmFubm90YXRvciA9IGFubm90YXRvcjtcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIGVsZW1lbnRcbiAgICAgICAgdGhpcy4kdGlja0JhciA9ICQoXCI8ZGl2IGNsYXNzPSdhbm5vdGF0b3ItdGlja2Jhcic+PC9kaXY+XCIpO1xuICAgICAgICB0aGlzLmFubm90YXRvci5wbGF5ZXIuY29udHJvbEJhci4kY29udGFpbmVyLmFwcGVuZCh0aGlzLiR0aWNrQmFyKTtcbiAgICB9XG5cbiAgICBMb2FkQW5ub3RhdGlvbnMoYW5ub3RhdGlvbk1hbmFnZXIpe1xuICAgICAgICBsZXQgYW5ub3RhdGlvbnMgPSBhbm5vdGF0aW9uTWFuYWdlci5hbm5vdGF0aW9ucztcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBjaGlsZHJlbiBvZiB0aGUgdGljayBiYXJcbiAgICAgICAgdGhpcy4kdGlja0Jhci5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGFubm90YXRpb25zLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgIGxldCBhbm5vID0gYW5ub3RhdGlvbnNbaV07XG4gICAgICAgICAgICBsZXQgJHRpY2sgPSAkKFwiPGRpdiBjbGFzcz0nYW5ub3RhdG9yLXRpY2tiYXItdGljayc+PC9kaXY+XCIpLmFwcGVuZFRvKHRoaXMuJHRpY2tCYXIpO1xuICAgICAgICAgICAgXG5cbiAgICAgICAgICAgIGxldCBiZWdpblRpbWUgPSBhbm5vLmRhdGEuYmVnaW5UaW1lIC8gMTAwMDtcbiAgICAgICAgICAgIGxldCBiZWdpblBlcmNlbnQgPSBiZWdpblRpbWUgLyB0aGlzLmFubm90YXRvci5wbGF5ZXIudmlkZW9FbGVtZW50LmR1cmF0aW9uO1xuICAgICAgICAgICAgJHRpY2suY3NzKCdsZWZ0JywgKGJlZ2luUGVyY2VudCAqIDEwMCkudG9TdHJpbmcoKSArIFwiJVwiKTtcblxuXG4gICAgICAgICAgICBsZXQgZW5kVGltZSA9IGFubm8uZGF0YS5lbmRUaW1lIC8gMTAwMDtcbiAgICAgICAgICAgIGxldCBlbmRQZXJjZW50ID0gZW5kVGltZSAvIHRoaXMuYW5ub3RhdG9yLnBsYXllci52aWRlb0VsZW1lbnQuZHVyYXRpb247XG4gICAgICAgICAgICAkdGljay5jc3MoJ3dpZHRoJywgKChlbmRQZXJjZW50IC0gYmVnaW5QZXJjZW50KSAqIDEwMCkudG9TdHJpbmcoKSArIFwiJVwiKTtcbiAgICAgICAgfVxuICAgIH1cblxufVxuXG5cbmV4cG9ydCB7IFRpY2tCYXIgfTsiLCJcbmNsYXNzIFNlcnZlckludGVyZmFjZSB7XG4gICAgY29uc3RydWN0b3IoKXtcblxuICAgIH1cblxuICAgIFNldEJhc2VVUkwodXJsKXtcbiAgICAgICAgdGhpcy5iYXNlVVJMID0gdXJsO1xuICAgIH1cblxuICAgIEZldGNoQW5ub3RhdGlvbnMoc2VhcmNoS2V5LCBzZWFyY2hQYXJhbSwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgIHVybDogdGhpcy5iYXNlVVJMICsgXCIvYW5ub3RhdG9ycy9nZXRBbm5vdGF0aW9uc0J5TG9jYXRpb25cIixcbiAgICAgICAgICAgIHR5cGU6IFwiR0VUXCIsXG4gICAgICAgICAgICBkYXRhOiB7IFtzZWFyY2hLZXldOiBzZWFyY2hQYXJhbSB9LFxuICAgICAgICAgICAgZGF0YVR5cGU6IFwianNvblwiLFxuICAgICAgICAgICAgYXN5bmM6IHRydWUsXG4gICAgICAgICAgICBzdWNjZXNzOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRmV0Y2hlZCBcIiArIGRhdGEuYW5ub3RhdGlvbnMubGVuZ3RoICsgXCIgYW5ub3RhdGlvbnMgZm9yIFwiICsgc2VhcmNoS2V5ICsgXCI6IFxcXCJcIiArIHNlYXJjaFBhcmFtICsgXCJcXFwiLlwiKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhkYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgZmV0Y2hpbmcgYW5ub3RhdGlvbnMgZm9yIFwiICsgc2VhcmNoS2V5ICsgXCI6IFxcXCJcIiArIHNlYXJjaFBhcmFtICsgXCJcXFwiLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgUG9zdEFubm90YXRpb24oKXtcblxuICAgIH1cblxuICAgIERlbGV0ZUFubm90YXRpb24oKXtcblxuICAgIH1cblxuICAgIERlcHJlY2F0ZUFubm90YXRpb24oKXtcblxuICAgIH1cblxuICAgIEVkaXRBbm5vdGF0aW9uKCl7XG5cbiAgICB9XG5cbn1cblxuXG5leHBvcnQgeyBTZXJ2ZXJJbnRlcmZhY2UgfTsiLCJtb2R1bGUuZXhwb3J0cz17XG4gICAgXCJjb25maWdGaWxlXCI6IFwiYW5ub3RhdG9yLWNvbmZpZy5qc29uXCJcbn0iLCIvKlxuRW50cnkgcG9pbnQgZm9yIHRoZSB3aG9sZSBwcm9qZWN0LiBBbnkgalF1ZXJ5IGV4dGVuc2lvbnMgc2hvdWxkXG5iZSByZWdpc3RlcmVkIGhlcmUuXG4qL1xuXG4vLyBJbXBvcnQgSlF1ZXJ5IGZvciBvdGhlciBwbHVnaW5zIHRvIHVzZVxuaW1wb3J0ICogYXMganF1ZXJ5IGZyb20gXCJqcXVlcnlcIjtcblxuaW1wb3J0IHsgcHJlZmVyZW5jZXMgfSBmcm9tIFwiLi91dGlscy9wcmVmZXJlbmNlLW1hbmFnZXIuanNcIjtcbmltcG9ydCB7IFZlcmlmeVJlcXVpcmVtZW50cyB9IGZyb20gXCIuL3V0aWxzL3JlcXVpcmVtZW50cy5qc1wiO1xuaW1wb3J0IHsgQW5ub3RhdG9yVmlkZW9QbGF5ZXIgfSBmcm9tIFwiLi92aWRlby1wbGF5ZXIvdmlkZW8tcGxheWVyLmpzXCI7XG5pbXBvcnQgeyBWaWRlb0Fubm90YXRvciB9IGZyb20gXCIuL2Fubm90YXRvci9hbm5vdGF0b3IuanNcIjtcblxuXG4vL1N0YXJ0IHJ1bm5pbmcgd2hlbiB0aGUgd2luZG93IGZpbmlzaGVzIGxvYWRpbmdcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24oKXtcbiAgICBWZXJpZnlSZXF1aXJlbWVudHMoKTtcbn0pO1xuXG4kLmZuLmFubm90YXRlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gRXJyb3Igb3V0IGVhcmx5IGlmIFwidGhpc1wiIGlzIG5vdCBhIHZpZGVvXG4gICAgaWYoJCh0aGlzKS5wcm9wKCd0YWdOYW1lJykudG9Mb3dlckNhc2UoKSAhPSBcInZpZGVvXCIpe1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiQ2Fubm90IHdyYXAgYSBub24tdmlkZW8gZWxlbWVudCFcIik7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBwcmVmZXJlbmNlcy5HZXRKU09OKChkYXRhKSA9PiB7XG4gICAgICAgIC8vY29uc29sZS5sb2coZGF0YSk7XG4gICAgfSk7XG4gICAgXG4gICAgLy8gV3JhcCBzZWxmIHdpdGggY3VzdG9tIHZpZGVvIHBsYXllclxuICAgIGxldCBwbGF5ZXIgPSBuZXcgQW5ub3RhdG9yVmlkZW9QbGF5ZXIoJCh0aGlzKSk7XG4gICAgcGxheWVyLiRjb250YWluZXIub24oXCJPblZpZGVvUmVhZHlcIiwgKCk9PntcbiAgICAgICAgLy8gQWRkIGFubm90YXRvciBvbmNlIHZpZGVvIGhhcyBsb2FkZWRcbiAgICAgICAgbGV0IGFubm90YXRvciA9IG5ldyBWaWRlb0Fubm90YXRvcihwbGF5ZXIpO1xuICAgIH0pO1xuXG59OyIsIi8vIEJyaW5nIGluIGJ1aWxkIGNvbmZpZyBvcHRpb25zXG5sZXQgbWV0YWNvbmZpZyA9IHJlcXVpcmUoXCIuLi9jb25maWcuanNvblwiKTtcblxuY2xhc3MgUHJlZmVyZW5jZU1hbmFnZXIge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuXG4gICAgfVxuXG4gICAgR2V0SlNPTihjYWxsYmFjayl7XG5cbiAgICAgICAgLy9sZXQgbG9jID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lO1xuICAgICAgICAvL2xldCBkaXIgPSBsb2Muc3Vic3RyaW5nKDAsIGxvYy5sYXN0SW5kZXhPZignLycpKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBkaXIgPSBcIi4vZGlzdC9cIjtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhkaXIgKyBtZXRhY29uZmlnLmNvbmZpZ0ZpbGUpO1xuXG4gICAgICAgIGlmKHRoaXMuY2FjaGVkSlNPTiAhPSBudWxsKXtcbiAgICAgICAgICAgIGNhbGxiYWNrKHRoaXMuY2FjaGVkKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCIsXG4gICAgICAgICAgICAgICAgdXJsOiBkaXIgKyBtZXRhY29uZmlnLmNvbmZpZ0ZpbGUsXG4gICAgICAgICAgICAgICAgc3VjY2VzczogKGRhdGEpPT57XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkSlNPTiA9IGRhdGE7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHRoaXMuY2FjaGVkSlNPTik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgIH1cblxufVxuXG5leHBvcnQgbGV0IHByZWZlcmVuY2VzID0gbmV3IFByZWZlcmVuY2VNYW5hZ2VyKCk7IiwiLyoqXG4gKiBSZXR1cm5zIGZhbHNlIGlmIHJ1bm5pbmcgb24gYW4gdW5zdXBwb3J0ZWQgcGxhdGZvcm0gb3IgbWlzc2luZyBqUXVlcnksIG90aGVyd2lzZSB0cnVlLlxuICogXG4gKi9cbmZ1bmN0aW9uIFZlcmlmeVJlcXVpcmVtZW50cygpIHtcbiAgICBcbiAgICAvLyBTdG9wIHJ1bm5pbmcgaWYgd2UncmUgb24gYW4gdW5zdXBwb3J0ZWQgcGxhdGZvcm0gKG1vYmlsZSBmb3Igbm93KVxuICAgIGlmKCAvQW5kcm9pZHx3ZWJPU3xpUGhvbmV8aVBhZHxpUG9kfEJsYWNrQmVycnl8SUVNb2JpbGV8T3BlcmEgTWluaS9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkgKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJQbGF0Zm9ybSBpcyB1bnN1cHBvcnRlZCFcIik7XG4gICAgICAgIGxldCB1bnN1cHBvcnRlZERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHVuc3VwcG9ydGVkRGl2LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFwiWW91ciBwbGF0Zm9ybSBpcyB1bnN1cHBvcnRlZCFcIikpO1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHVuc3VwcG9ydGVkRGl2KTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIHdlIGRvbid0IGhhdmUgalF1ZXJ5IGxvYWRlZFxuICAgIGlmKCF3aW5kb3cualF1ZXJ5KXtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkpRdWVyeSBtdXN0IGJlIHByZXNlbnQhXCIpO1xuICAgICAgICBsZXQgdW5zdXBwb3J0ZWREaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB1bnN1cHBvcnRlZERpdi5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShcIllvdXIgcGxhdGZvcm0gaXMgdW5zdXBwb3J0ZWQhXCIpKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh1bnN1cHBvcnRlZERpdik7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgICBcbn1cblxuZXhwb3J0IHsgVmVyaWZ5UmVxdWlyZW1lbnRzIH07IiwiLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMzQ4NDEwMjZcbmZ1bmN0aW9uIEdldEZvcm1hdHRlZFRpbWUodGltZUluU2Vjb25kcyl7XG4gICAgbGV0IHRpbWUgPSB0aW1lSW5TZWNvbmRzIHwgMDsgLy9UcnVuY2F0ZSB0byBpbnRlZ2VyXG4gICAgbGV0IGhvdXJzICAgPSBNYXRoLmZsb29yKHRpbWUgLyAzNjAwKSAlIDI0XG4gICAgbGV0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKHRpbWUgLyA2MCkgJSA2MFxuICAgIGxldCBzZWNvbmRzID0gdGltZSAlIDYwXG4gICAgbGV0IGZvcm1hdHRlZCA9IFtob3VycyxtaW51dGVzLHNlY29uZHNdXG4gICAgICAgIC5tYXAodiA9PiB2IDwgMTAgPyBcIjBcIiArIHYgOiB2KVxuICAgICAgICAuZmlsdGVyKCh2LGkpID0+IHYgIT09IFwiMDBcIiB8fCBpID4gMClcbiAgICAgICAgLmpvaW4oXCI6XCIpXG5cbiAgICBpZiAoZm9ybWF0dGVkLmNoYXJBdCgwKSA9PSBcIjBcIikge1xuICAgICAgICBmb3JtYXR0ZWQgPSBmb3JtYXR0ZWQuc3Vic3RyKDEpO1xuICAgIH1cblxuICAgIHJldHVybiBmb3JtYXR0ZWQ7XG59XG5cbi8vIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvOTY0MDQxNy83MTM4NzkyXG5mdW5jdGlvbiBHZXRTZWNvbmRzRnJvbUhNUyhobXMpe1xuICAgIGxldCBwID0gaG1zLnNwbGl0KCc6JyksXG4gICAgICAgIHMgPSAwLCBtID0gMTtcblxuICAgIHdoaWxlIChwLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcyArPSBtICogcGFyc2VJbnQocC5wb3AoKSwgMTApO1xuICAgICAgICBtICo9IDYwO1xuICAgIH1cblxuICAgIHJldHVybiBzO1xufVxuXG5leHBvcnQgeyBHZXRGb3JtYXR0ZWRUaW1lLCBHZXRTZWNvbmRzRnJvbUhNUyB9OyIsImltcG9ydCB7IEdldEZvcm1hdHRlZFRpbWUgfSBmcm9tIFwiLi4vdXRpbHMvdGltZS5qc1wiO1xuXG5jbGFzcyBWaWRlb1BsYXllckJhciB7XG5cbiAgICBjb25zdHJ1Y3RvcihwbGF5ZXIpe1xuICAgICAgICB0aGlzLnBsYXllciA9IHBsYXllcjsgXG4gICAgICAgIHRoaXMuJGNvbnRhaW5lciA9ICQoXCI8ZGl2IGNsYXNzPSd2aWRlby1wbGF5ZXItdG9vbGJhciBmbGV4LXRvb2xiYXInPjwvZGl2PlwiKS5hcHBlbmRUbyhwbGF5ZXIuJGNvbnRhaW5lcik7XG5cbiAgICAgICAgdGhpcy5Qb3B1bGF0ZUVsZW1lbnRzKCk7XG5cbiAgICAgICAgdGhpcy5zY3J1YmJpbmdUaW1lU2xpZGVyID0gZmFsc2U7XG4gICAgICAgIHRoaXMudmlkZW9QbGF5aW5nQmVmb3JlVGltZVNjcnViID0gZmFsc2U7XG5cbiAgICAgICAgLy8gSG9vayB1cCB0byBldmVudHMgZnJvbSB2aWRlbyBwbGF5ZXJcbiAgICAgICAgdGhpcy5wbGF5ZXIuJGNvbnRhaW5lci5vbihcIk9uVmlzaWJpbGl0eUNoYW5nZVwiLCAoZXZlbnQsIGlzVmlzaWJsZSwgZHVyYXRpb24pPT57XG4gICAgICAgICAgICB0aGlzLlNldFZpc2libGUoaXNWaXNpYmxlLCBkdXJhdGlvbik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMucGxheWVyLiRjb250YWluZXIub24oXCJPblBsYXlTdGF0ZUNoYW5nZVwiLCAoZXZlbnQsIHBsYXlpbmcpID0+IHtcbiAgICAgICAgICAgIHRoaXMuT25QbGF5U3RhdGVDaGFuZ2UocGxheWluZyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMucGxheWVyLiRjb250YWluZXIub24oXCJPblRpbWVVcGRhdGVcIiwgKGV2ZW50LCB0aW1lKSA9PiB7XG4gICAgICAgICAgICB0aGlzLk9uVGltZVVwZGF0ZSh0aW1lKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5wbGF5ZXIuJGNvbnRhaW5lci5vbihcIk9uTXV0ZVN0YXRlQ2hhbmdlXCIsIChldmVudCwgbXV0ZWQpID0+IHtcbiAgICAgICAgICAgIHRoaXMuT25NdXRlU3RhdGVDaGFuZ2UobXV0ZWQpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnBsYXllci4kY29udGFpbmVyLm9uKFwiT25Wb2x1bWVDaGFuZ2VcIiwgKGV2ZW50LCB2b2x1bWUpID0+IHtcbiAgICAgICAgICAgIHRoaXMuT25Wb2x1bWVDaGFuZ2Uodm9sdW1lKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgIH1cblxuICAgIFBvcHVsYXRlRWxlbWVudHMoKXtcblxuICAgICAgICB0aGlzLiRzZWVrQmFyID0gJChcIjxkaXYgaWQ9J3NlZWstYmFyJz48ZGl2IGlkPSdzZWVrLWhhbmRsZScgY2xhc3M9J3VpLXNsaWRlci1oYW5kbGUnPjwvZGl2PjwvZGl2PlwiKTtcbiAgICAgICAgbGV0IHNlZWtTbGlkZXIgPSB0aGlzLiRzZWVrQmFyLnNsaWRlcih7XG4gICAgICAgICAgICBtaW46IDAuMCxcbiAgICAgICAgICAgIG1heDogMS4wLFxuICAgICAgICAgICAgc3RlcDogMC4wMDFcbiAgICAgICAgfSk7XG4gICAgICAgIHNlZWtTbGlkZXIub24oXCJzbGlkZVwiLCAoKT0+e1xuICAgICAgICAgICAgdGhpcy5VcGRhdGVWaWRlb1RpbWUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNlZWtTbGlkZXIub24oXCJzbGlkZXN0YXJ0XCIsICgpPT57XG4gICAgICAgICAgICB0aGlzLlRpbWVEcmFnU3RhcnRlZCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgc2Vla1NsaWRlci5vbihcInNsaWRlc3RvcFwiLCAoKT0+IHtcbiAgICAgICAgICAgIHRoaXMuVGltZURyYWdGaW5pc2hlZCgpO1xuICAgICAgICAgICAgdGhpcy5VcGRhdGVWaWRlb1RpbWUoKTsgIC8vIFVwZGF0ZSB2aXN1YWxzXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLiRjb250YWluZXIuYXBwZW5kKHRoaXMuJHNlZWtCYXIpO1xuXG4gICAgICAgIHRoaXMuJHNlZWtQcm9ncmVzcyA9ICQoXCI8ZGl2IGlkPSdzZWVrLWZpbGwnPjwvZGl2PlwiKTtcbiAgICAgICAgdGhpcy4kY29udGFpbmVyLmFwcGVuZCh0aGlzLiRzZWVrUHJvZ3Jlc3MpO1xuXG4gICAgICAgIC8vIFBsYXkgYnV0dG9uXG4gICAgICAgIHRoaXMuJHBsYXlCdXR0b24gPSAkKFwiPGRpdj5QbGF5PC9kaXY+XCIpLmJ1dHRvbih7XG4gICAgICAgICAgICBpY29uOiBcInVpLWljb24tcGxheVwiLFxuICAgICAgICAgICAgc2hvd0xhYmVsOiBmYWxzZVxuICAgICAgICB9KS5jbGljaygoKT0+e1xuICAgICAgICAgICAgdGhpcy5wbGF5ZXIuVG9nZ2xlUGxheVN0YXRlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLlJlZ2lzdGVyRWxlbWVudCh0aGlzLiRwbGF5QnV0dG9uLCAtNCk7XG5cbiAgICAgICAgLy8gVGltZSB0ZXh0XG4gICAgICAgIHRoaXMuJHRpbWVUZXh0ID0gJChcIjxwPjA6MDAvMDowMDwvcD5cIilcbiAgICAgICAgdGhpcy5SZWdpc3RlckVsZW1lbnQodGhpcy4kdGltZVRleHQsIC0zKTtcblxuICAgICAgICAvLyBNdXRlIGJ1dHRvblxuICAgICAgICB0aGlzLiRtdXRlQnV0dG9uID0gJChcIjxkaXY+TXV0ZTwvZGl2PlwiKS5idXR0b24oe1xuICAgICAgICAgICAgaWNvbjogXCJ1aS1pY29uLXZvbHVtZS1vblwiLFxuICAgICAgICAgICAgc2hvd0xhYmVsOiBmYWxzZSxcbiAgICAgICAgfSkuY2xpY2soKCk9PntcbiAgICAgICAgICAgIHRoaXMucGxheWVyLlRvZ2dsZU11dGVTdGF0ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5SZWdpc3RlckVsZW1lbnQodGhpcy4kbXV0ZUJ1dHRvbiwgLTIpO1xuXG4gICAgICAgIC8vIFZvbHVtZSBiYXJcbiAgICAgICAgdGhpcy4kdm9sdW1lQmFyID0gJChcIjxkaXYgaWQ9J3ZvbHVtZS1iYXInPjxkaXYgaWQ9J3ZvbHVtZS1oYW5kbGUnIGNsYXNzPSd1aS1zbGlkZXItaGFuZGxlJz48L2Rpdj48L2Rpdj5cIik7XG4gICAgICAgIHRoaXMuJHZvbHVtZUJhci5zbGlkZXIoe1xuICAgICAgICAgICAgcmFuZ2U6IFwibWluXCIsXG4gICAgICAgICAgICBtYXg6IDEuMCxcbiAgICAgICAgICAgIHZhbHVlOiAxLjAsXG4gICAgICAgICAgICBzdGVwOiAwLjA1XG4gICAgICAgIH0pLm9uKFwic2xpZGVcIiwgKCk9PntcbiAgICAgICAgICAgIHRoaXMucGxheWVyLlNldFZvbHVtZSh0aGlzLiR2b2x1bWVCYXIuc2xpZGVyKFwidmFsdWVcIikpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5SZWdpc3RlckVsZW1lbnQodGhpcy4kdm9sdW1lQmFyLCAtMSk7XG5cbiAgICAgICAgLy8gRnVsbHNjcmVlbiBidXR0b25cbiAgICAgICAgdGhpcy4kZnVsbFNjcmVlbkJ1dHRvbiA9ICQoXCI8ZGl2PkZ1bGxzY3JlZW48L2Rpdj5cIikuYnV0dG9uKHtcbiAgICAgICAgICAgIGljb246IFwidWktaWNvbi1hcnJvdy00LWRpYWdcIixcbiAgICAgICAgICAgIHNob3dMYWJlbDogZmFsc2VcbiAgICAgICAgfSkuY2xpY2soKCk9PntcbiAgICAgICAgICAgIHRoaXMucGxheWVyLlRvZ2dsZUZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuUmVnaXN0ZXJFbGVtZW50KHRoaXMuJGZ1bGxTY3JlZW5CdXR0b24sIDIsICdmbGV4LWVuZCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGVtcHR5IGVsZW1lbnQgYmV0d2VlbiBsZWZ0IGZsb2F0aW5nIGFuZCByaWdodCBmbG9hdGluZyB0b29sYmFyIGl0ZW1zIHRvIHNwYWNlIHRoZW0gb3V0IHByb3Blcmx5XG4gICAgICAgIHRoaXMuJGNvbnRhaW5lci5hcHBlbmQoJChcIjxkaXY+PC9kaXY+XCIpLmNzcyhcImZsZXgtZ3Jvd1wiLCAxKS5jc3MoXCJvcmRlclwiLCAwKSk7XG5cbiAgICAgICAgLy9Jbml0aWFsaXplIGNvbnRyb2xzXG4gICAgICAgIHRoaXMuT25UaW1lVXBkYXRlKCk7XG4gICAgICAgIHRoaXMuJHZvbHVtZUJhci5zbGlkZXIoXCJ2YWx1ZVwiLCB0aGlzLnBsYXllci52aWRlb0VsZW1lbnQudm9sdW1lKTtcbiAgICB9XG5cbiAgICBSZWdpc3RlckVsZW1lbnQoJGVsZW1lbnQsIG9yZGVyLCBqdXN0aWZpY2F0aW9uID0gJ2ZsZXgtc3RhcnQnKXtcbiAgICAgICAgJGVsZW1lbnQuY3NzKCdvcmRlcicsIG9yZGVyKTtcbiAgICAgICAgJGVsZW1lbnQuY3NzKCdhbGlnbi1zZWxmJywganVzdGlmaWNhdGlvbik7XG4gICAgICAgIC8vIFNldHMgZ3JvdyBbc2hyaW5rXSBbYmFzaXNdXG4gICAgICAgIC8vJGVsZW1lbnQuY3NzKCdmbGV4JywgJzAgMCBhdXRvJyk7XG4gICAgICAgIHRoaXMuJGNvbnRhaW5lci5hcHBlbmQoJGVsZW1lbnQpO1xuICAgIH1cblxuICAgIFNldFZpc2libGUoaXNWaXNpYmxlLCBkdXJhdGlvbil7XG4gICAgICAgIC8vY29uc29sZS5sb2coaXNWaXNpYmxlICsgXCIgXCIgKyBkdXJhdGlvbik7XG4gICAgICAgIGlmKGlzVmlzaWJsZSl7XG4gICAgICAgICAgICB0aGlzLiRjb250YWluZXIuZmFkZVRvKGR1cmF0aW9uLCAxLjApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy4kY29udGFpbmVyLnN0b3AodHJ1ZSwgdHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLiRjb250YWluZXIuZmFkZVRvKGR1cmF0aW9uLCAwLjApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgVXBkYXRlVmlkZW9UaW1lKCl7XG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aGUgbmV3IHRpbWVcbiAgICAgICAgbGV0IHRpbWUgPSB0aGlzLnBsYXllci52aWRlb0VsZW1lbnQuZHVyYXRpb24gKiB0aGlzLiRzZWVrQmFyLnNsaWRlcihcInZhbHVlXCIpO1xuICAgICAgICB0aGlzLnBsYXllci52aWRlb0VsZW1lbnQuY3VycmVudFRpbWUgPSB0aW1lO1xuICAgIH1cblxuICAgIFRpbWVEcmFnU3RhcnRlZCgpe1xuICAgICAgICB0aGlzLnZpZGVvUGxheWluZ0JlZm9yZVRpbWVTY3J1YiA9ICF0aGlzLnBsYXllci52aWRlb0VsZW1lbnQucGF1c2VkO1xuICAgICAgICB0aGlzLnBsYXllci52aWRlb0VsZW1lbnQucGF1c2UoKTtcbiAgICB9XG5cbiAgICBUaW1lRHJhZ0ZpbmlzaGVkKCl7XG4gICAgICAgIC8vIFN0YXJ0IHBsYXlpbmcgdGhlIHZpZGVvIGFnYWluIGlmIGl0IHdhcyBwbGF5aW5nIGJlZm9yZSB0aGUgc2NydWIgc3RhcnRlZFxuICAgICAgICBpZiAodGhpcy52aWRlb1BsYXlpbmdCZWZvcmVUaW1lU2NydWIpe1xuICAgICAgICAgICAgdGhpcy5wbGF5ZXIudmlkZW9FbGVtZW50LnBsYXkoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vL1xuICAgIC8vLyAtLS0tLSBFdmVudCBMaXN0ZW5lcnMgLS0tLS1cbiAgICAvLy8gVGhlIGZvbGxvd2luZyB1cGRhdGUgdGhlIHZpc3VhbCBzdGF0ZSBvZiB0aGUgYmFyXG4gICAgLy8vIHVwb24gY2hhbmdlcyB0byB0aGUgdmlkZW8gcGxheWVyLiBUaGVzZSBhcmUgaG9va2VkXG4gICAgLy8vIHVwIGluIHRoZSBjb25zdHJ1Y3Rvci5cbiAgICAvLy9cblxuICAgIE9uUGxheVN0YXRlQ2hhbmdlKHBsYXlpbmcpe1xuICAgICAgICB0aGlzLiRwbGF5QnV0dG9uLmJ1dHRvbihcIm9wdGlvblwiLCB7XG4gICAgICAgICAgICBpY29uOiBwbGF5aW5nID8gXCJ1aS1pY29uLXBhdXNlXCIgOiBcInVpLWljb24tcGxheVwiXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIE9uVGltZVVwZGF0ZSh0aW1lKXtcbiAgICAgICAgbGV0IGR1cmF0aW9uID0gdGhpcy5wbGF5ZXIudmlkZW9FbGVtZW50LmR1cmF0aW9uO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgdGltZSB0ZXh0XG4gICAgICAgIHRoaXMuJHRpbWVUZXh0LnRleHQoR2V0Rm9ybWF0dGVkVGltZSh0aW1lKSArIFwiL1wiICsgR2V0Rm9ybWF0dGVkVGltZShkdXJhdGlvbikpO1xuXG4gICAgICAgIGxldCBwcm9ncmVzcyA9IHRpbWUgLyBkdXJhdGlvbjtcbiAgICAgICAgdGhpcy4kc2Vla1Byb2dyZXNzLndpZHRoKChwcm9ncmVzcyAqIDEwMCkudG9TdHJpbmcoKSArIFwiJVwiKTtcbiAgICB9XG5cbiAgICBPblZvbHVtZUNoYW5nZSh2b2x1bWUpe1xuICAgICAgICB0aGlzLiR2b2x1bWVCYXIuc2xpZGVyKFwidmFsdWVcIiwgdm9sdW1lKTtcbiAgICB9XG5cbiAgICBPbk11dGVTdGF0ZUNoYW5nZShtdXRlZCl7XG4gICAgICAgIHRoaXMuJG11dGVCdXR0b24uYnV0dG9uKFwib3B0aW9uXCIsIHtcbiAgICAgICAgICAgIGljb246IG11dGVkID8gXCJ1aS1pY29uLXZvbHVtZS1vblwiIDogXCJ1aS1pY29uLXZvbHVtZS1vZmZcIlxuICAgICAgICB9KTtcbiAgICB9XG5cbn1cblxuZXhwb3J0IHsgVmlkZW9QbGF5ZXJCYXIgfSIsImltcG9ydCB7IFZpZGVvUGxheWVyQmFyIH0gZnJvbSBcIi4vdmlkZW8tcGxheWVyLWJhci5qc1wiO1xuaW1wb3J0ICogYXMgc2NyZWVuZnVsbCBmcm9tIFwic2NyZWVuZnVsbFwiO1xuXG4vL2ltcG9ydCAnanF1ZXJ5LXVpL2Rpc3QvanF1ZXJ5LXVpLmpzJztcblxuY2xhc3MgQW5ub3RhdG9yVmlkZW9QbGF5ZXIge1xuICAgIGNvbnN0cnVjdG9yKCR2aWRlbyl7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiW0Fubm90YXRvclZpZGVvUGxheWVyXSBjcmVhdGVkIGZvciB2aWRlby5cIik7XG5cbiAgICAgICAgdGhpcy4kdmlkZW8gPSAkdmlkZW87XG4gICAgICAgIHRoaXMudmlkZW9FbGVtZW50ID0gdGhpcy4kdmlkZW8uZ2V0KDApO1xuXG4gICAgICAgIHRoaXMuV3JhcCgpO1xuICAgICAgICB0aGlzLlBvcHVsYXRlQ29udHJvbHMoKTtcbiAgICAgICAgdGhpcy5TZXRWaXNpYmxlKHRydWUpO1xuXG4gICAgICAgIC8vIEhvb2sgdXAgZXZlbnRzXG4gICAgICAgIHRoaXMuSG9va1VwRXZlbnRzKCk7XG5cbiAgICAgICAgLy8gTmVlZCB0byBtYW51YWxseSBrZWVwIHRyYWNrIG9mIGZ1bGxzY3JlZW4gc3RhdGUgc2luY2UgXG4gICAgICAgIC8vIHNjcmVlbmZ1bGwgaXNuJ3Qgd29ya2luZyBmb3IgdGhpcyBwdXJwb3NlXG4gICAgICAgIHRoaXMuaXNGdWxsc2NyZWVuID0gZmFsc2U7XG5cbiAgICAgICAgLy8gUGxheSAvIHBhdXNlIHRoZSB2aWRlbyB3aGVuIGNsaWNrZWQuXG4gICAgICAgIHRoaXMuJHZpZGVvLm9uKFwiY2xpY2tcIiwgKCk9PntcbiAgICAgICAgICAgIHRoaXMuVG9nZ2xlUGxheVN0YXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWxsb3dBdXRvRmFkZSA9IHRydWU7XG4gICAgICAgIC8vLyBJbmFjdGl2aXR5IHRpbWVyIGZvciB0aGUgbW91c2UuXG4gICAgICAgIHRoaXMubW91c2VUaW1lciA9IG51bGw7XG4gICAgICAgIC8vLyBTZXQgdG8gdHJ1ZSBpZiB0aGUgdGltZSBzbGlkZXIgaXMgY3VycmVudGx5IGJlaW5nIGRyYWdnZWQgYnkgdGhlIHVzZXIuXG4gICAgICAgIHRoaXMuZHJhZ2dpbmdUaW1lU2xpZGVyID0gZmFsc2U7XG4gICAgICAgIC8vLyBTZWNvbmRzIGJlZm9yZSB0aGUgVUkgZmFkZXMgZHVlIHRvIG1vdXNlIGluYWN0aXZpdHkuXG4gICAgICAgIHRoaXMuaWRsZVNlY29uZHNCZWZvcmVGYWRlID0gMztcbiAgICAgICAgdGhpcy5mYWRlRHVyYXRpb24gPSAzMDA7XG5cbiAgICAgICAgdGhpcy4kY29udGFpbmVyLm1vdXNlbW92ZSgoKT0+e1xuICAgICAgICAgICAgdGhpcy5Pbk1vdXNlTW92ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5TZXRBdXRvRmFkZSh0cnVlKTtcblxuICAgICAgICAkKGRvY3VtZW50KS5vbihzY3JlZW5mdWxsLnJhdy5mdWxsc2NyZWVuY2hhbmdlLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRjb250YWluZXIudHJpZ2dlcihcIk9uRnVsbHNjcmVlbkNoYW5nZVwiLCB0aGlzLmlzRnVsbHNjcmVlbik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMudmlkZW9FbGVtZW50Lm9ubG9hZGVkbWV0YWRhdGEgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRjb250YWluZXIudHJpZ2dlcihcIk9uVmlkZW9SZWFkeVwiKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLiR2aWRlby5vbihcInRpbWV1cGRhdGVcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICB0aGlzLk9uVGltZVVwZGF0ZSh0aGlzLnZpZGVvRWxlbWVudC5jdXJyZW50VGltZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICB9XG5cbiAgICBXcmFwKCl7XG4gICAgICAgIC8vIFJlbW92ZSB0aGUgZGVmYXVsdCBjb250cm9scyBmcm9tIHRoZSB2aWRlb1xuICAgICAgICB0aGlzLnZpZGVvRWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoXCJjb250cm9sc1wiKTtcblxuICAgICAgICB0aGlzLiRjb250YWluZXIgPSB0aGlzLiR2aWRlby53cmFwKFwiPGRpdiBjbGFzcz0nYW5ub3RhdG9yLXZpZGVvLXBsYXllcic+PC9kaXY+XCIpLnBhcmVudCgpO1xuICAgICAgICAvLyBSZXNpemUgdmlkZW8gY29udGFpbmVyIHRvIGZpdCB0aGUgZGltZW5zaW9ucyBvZiB0aGUgdmlkZW9cbiAgICAgICAgdGhpcy4kY29udGFpbmVyLndpZHRoKHRoaXMuJHZpZGVvLndpZHRoKCkpO1xuICAgICAgICB0aGlzLiRjb250YWluZXIuaGVpZ2h0KHRoaXMuJHZpZGVvLmhlaWdodCgpKTtcbiAgICAgICAgLy8gUmVzdHlsZSB0aGUgdmlkZW8gdG8gZmlsbCB0aGUgdmlkZW8gY29udGFpbmVyXG4gICAgICAgIHRoaXMuJHZpZGVvLmNzcygnd2lkdGgnLCAnMTAwJScpO1xuICAgICAgICB0aGlzLiR2aWRlby5jc3MoJ2hlaWdodCcsICcxMDAlJyk7XG4gICAgfVxuXG4gICAgUG9wdWxhdGVDb250cm9scygpe1xuICAgICAgICB0aGlzLmNvbnRyb2xCYXIgPSBuZXcgVmlkZW9QbGF5ZXJCYXIodGhpcyk7XG4gICAgfVxuXG4gICAgU2V0VmlzaWJsZShpc1Zpc2libGUsIGR1cmF0aW9uID0gMCl7XG4gICAgICAgIHRoaXMuJGNvbnRhaW5lci50cmlnZ2VyKFwiT25WaXNpYmlsaXR5Q2hhbmdlXCIsIFtpc1Zpc2libGUsIGR1cmF0aW9uXSk7XG4gICAgfVxuXG4gICAgSG9va1VwRXZlbnRzKCl7XG4gICAgICAgIFxuICAgIH1cblxuICAgIFRvZ2dsZVBsYXlTdGF0ZSgpe1xuICAgICAgICBpZih0aGlzLnZpZGVvRWxlbWVudC5wYXVzZWQpe1xuICAgICAgICAgICAgdGhpcy5QbGF5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLlBhdXNlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBQbGF5KCl7XG4gICAgICAgIHRoaXMudmlkZW9FbGVtZW50LnBsYXkoKTtcbiAgICAgICAgdGhpcy5TZXRBdXRvRmFkZSh0cnVlKTtcbiAgICAgICAgdGhpcy4kY29udGFpbmVyLnRyaWdnZXIoXCJPblBsYXlTdGF0ZUNoYW5nZVwiLCAhdGhpcy52aWRlb0VsZW1lbnQucGF1c2VkKTtcbiAgICB9XG5cbiAgICBQYXVzZSgpe1xuICAgICAgICB0aGlzLnZpZGVvRWxlbWVudC5wYXVzZSgpO1xuICAgICAgICB0aGlzLlNldEF1dG9GYWRlKGZhbHNlKTtcbiAgICAgICAgdGhpcy4kY29udGFpbmVyLnRyaWdnZXIoXCJPblBsYXlTdGF0ZUNoYW5nZVwiLCAhdGhpcy52aWRlb0VsZW1lbnQucGF1c2VkKTtcbiAgICB9XG5cbiAgICBUb2dnbGVNdXRlU3RhdGUoKXtcbiAgICAgICAgbGV0IG11dGVkID0gdGhpcy52aWRlb0VsZW1lbnQubXV0ZWQ7XG4gICAgICAgIHRoaXMudmlkZW9FbGVtZW50Lm11dGVkID0gIW11dGVkO1xuICAgICAgICB0aGlzLiRjb250YWluZXIudHJpZ2dlcihcIk9uTXV0ZVN0YXRlQ2hhbmdlXCIsIG11dGVkKTtcbiAgICB9XG5cbiAgICBTZXRWb2x1bWUodm9sdW1lKXtcbiAgICAgICAgdGhpcy52aWRlb0VsZW1lbnQudm9sdW1lID0gdm9sdW1lO1xuICAgICAgICB0aGlzLiRjb250YWluZXIudHJpZ2dlcihcIk9uVm9sdW1lQ2hhbmdlXCIsIHZvbHVtZSk7XG4gICAgfVxuXG4gICAgVG9nZ2xlRnVsbHNjcmVlbigpe1xuICAgICAgICBpZih0aGlzLmlzRnVsbHNjcmVlbil7XG4gICAgICAgICAgICBzY3JlZW5mdWxsLmV4aXQoKTtcbiAgICAgICAgICAgIHRoaXMuJGNvbnRhaW5lci5yZW1vdmVDbGFzcyhcIi13ZWJraXQtZnVsbC1zY3JlZW5cIik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHNjcmVlbmZ1bGwucmVxdWVzdCh0aGlzLiRjb250YWluZXJbMF0pO1xuICAgICAgICAgICAgdGhpcy4kY29udGFpbmVyLmFkZENsYXNzKFwiLXdlYmtpdC1mdWxsLXNjcmVlblwiKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlzRnVsbHNjcmVlbiA9ICF0aGlzLmlzRnVsbHNjcmVlbjtcblxuICAgICAgICAvL3RoaXMuJGNvbnRhaW5lci50cmlnZ2VyKFwiT25GdWxsc2NyZWVuQ2hhbmdlXCIsIHRoaXMuaXNGdWxsc2NyZWVuKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsZWQgd2hlbiB0aGUgbW91c2UgbW92ZXMgaW4gdGhlIHZpZGVvIGNvbnRhaW5lci5cbiAgICAgKi9cbiAgICBPbk1vdXNlTW92ZSgpe1xuICAgICAgICAvLyBSZXNldCB0aGUgdGltZXJcbiAgICAgICAgaWYodGhpcy5tb3VzZVRpbWVyKXtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLm1vdXNlVGltZXIpO1xuICAgICAgICAgICAgdGhpcy5tb3VzZVRpbWVyID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlc3RhcnQgZmFkaW5nIGlmIGFsbG93ZWQgdG9cbiAgICAgICAgaWYodGhpcy5hbGxvd0F1dG9GYWRlKXtcbiAgICAgICAgICAgICB0aGlzLlJlc3RhcnRGYWRpbmcoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIE9uVGltZVVwZGF0ZSh0aW1lKXtcbiAgICAgICAgdGhpcy4kY29udGFpbmVyLnRyaWdnZXIoXCJPblRpbWVVcGRhdGVcIiwgdGltZSk7XG4gICAgfVxuXG4gICAgUmVzdGFydEZhZGluZygpe1xuICAgICAgICAvLyBSZXN0b3JlIHZpc2liaWxpdHlcbiAgICAgICAgdGhpcy5TZXRWaXNpYmxlKHRydWUsIHRoaXMuZmFkZUR1cmF0aW9uKTtcblxuICAgICAgICAvLyBTdGFydCB0aGUgdGltZXIgb3ZlciBhZ2FpblxuICAgICAgICB0aGlzLm1vdXNlVGltZXIgPSBzZXRUaW1lb3V0KCgpPT57XG4gICAgICAgICAgICB0aGlzLlNldFZpc2libGUoZmFsc2UsIHRoaXMuZmFkZUR1cmF0aW9uKTtcbiAgICAgICAgfSwgdGhpcy5pZGxlU2Vjb25kc0JlZm9yZUZhZGUgKiAxMDAwKTtcbiAgICB9XG5cbiAgICBTZXRBdXRvRmFkZShhbGxvdykge1xuICAgICAgICAvLyBJZiB3ZSdyZSBzdG9wcGluZyBhdXRvZmFkZSBhbmQgdGhlIGFuaW1hdGlvbiBpcyBydW5uaW5nLFxuICAgICAgICAvLyBjYW5jZWwgaXQuIFRoZW4gcmVzZXQgdGhlIHRpbWVyXG4gICAgICAgIGlmKCFhbGxvdyAmJiB0aGlzLm1vdXNlVGltZXIpe1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMubW91c2VUaW1lcik7XG4gICAgICAgICAgICB0aGlzLm1vdXNlVGltZXIgPSAwO1xuICAgICAgICAgICAgdGhpcy5TZXRWaXNpYmxlKHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmFsbG93QXV0b0ZhZGUgPSBhbGxvdztcblxuICAgICAgICBpZihhbGxvdyl7XG4gICAgICAgICAgICB0aGlzLlJlc3RhcnRGYWRpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICB9XG5cbiAgICAvLyBJc1BsYXlpbmcoKXtcbiAgICAvLyAgICAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMzExMzM0MDFcbiAgICAvLyAgICAgcmV0dXJuICEhKHRoaXMudmlkZW9FbGVtZW50LmN1cnJlbnRUaW1lID4gMCAmJiAhdGhpcy52aWRlb0VsZW1lbnQucGF1c2VkICYmIFxuICAgIC8vICAgICAgICAgICAgICAgIXRoaXMudmlkZW9FbGVtZW50LmVuZGVkICYmIHRoaXMudmlkZW9FbGVtZW50LnJlYWR5U3RhdGUgPiAyKTtcbiAgICAvLyB9XG5cbiAgICAvLyBGcm9tIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL05hdGVvd2FtaS83YTk0N2U5M2YwOWM0NWExMDk3ZTc4M2RjMDA1NjBlMVxuICAgIEdldFZpZGVvRGltZW5zaW9ucygpIHtcbiAgICAgICAgbGV0IHZpZGVvID0gdGhpcy52aWRlb0VsZW1lbnQ7XG4gICAgICAgIC8vIFJhdGlvIG9mIHRoZSB2aWRlbydzIGludHJpc2ljIGRpbWVuc2lvbnNcbiAgICAgICAgbGV0IHZpZGVvUmF0aW8gPSB2aWRlby52aWRlb1dpZHRoIC8gdmlkZW8udmlkZW9IZWlnaHQ7XG4gICAgICAgIC8vIFRoZSB3aWR0aCBhbmQgaGVpZ2h0IG9mIHRoZSB2aWRlbyBlbGVtZW50XG4gICAgICAgIGxldCB3aWR0aCA9IHZpZGVvLm9mZnNldFdpZHRoO1xuICAgICAgICBsZXQgaGVpZ2h0ID0gdmlkZW8ub2Zmc2V0SGVpZ2h0O1xuICAgICAgICAvLyBUaGUgcmF0aW8gb2YgdGhlIGVsZW1lbnQncyB3aWR0aCB0byBpdHMgaGVpZ2h0XG4gICAgICAgIGxldCBlbGVtZW50UmF0aW8gPSB3aWR0aCAvIGhlaWdodDtcbiAgICAgICAgLy8gSWYgdGhlIHZpZGVvIGVsZW1lbnQgaXMgc2hvcnQgYW5kIHdpZGVcbiAgICAgICAgaWYoZWxlbWVudFJhdGlvID4gdmlkZW9SYXRpbykgd2lkdGggPSBoZWlnaHQgKiB2aWRlb1JhdGlvO1xuICAgICAgICAvLyBJdCBtdXN0IGJlIHRhbGwgYW5kIHRoaW4sIG9yIGV4YWN0bHkgZXF1YWwgdG8gdGhlIG9yaWdpbmFsIHJhdGlvXG4gICAgICAgIGVsc2UgaGVpZ2h0ID0gd2lkdGggLyB2aWRlb1JhdGlvO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB3aWR0aDogd2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQ6IGhlaWdodFxuICAgICAgICB9O1xuICAgIH1cblxufVxuXG5leHBvcnQgeyBBbm5vdGF0b3JWaWRlb1BsYXllciB9OyIsIi8qIVxuKiBzY3JlZW5mdWxsXG4qIHYzLjAuMCAtIDIwMTUtMTEtMjRcbiogKGMpIFNpbmRyZSBTb3JodXM7IE1JVCBMaWNlbnNlXG4qL1xuKGZ1bmN0aW9uICgpIHtcblx0J3VzZSBzdHJpY3QnO1xuXG5cdHZhciBpc0NvbW1vbmpzID0gdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHM7XG5cdHZhciBrZXlib2FyZEFsbG93ZWQgPSB0eXBlb2YgRWxlbWVudCAhPT0gJ3VuZGVmaW5lZCcgJiYgJ0FMTE9XX0tFWUJPQVJEX0lOUFVUJyBpbiBFbGVtZW50O1xuXG5cdHZhciBmbiA9IChmdW5jdGlvbiAoKSB7XG5cdFx0dmFyIHZhbDtcblx0XHR2YXIgdmFsTGVuZ3RoO1xuXG5cdFx0dmFyIGZuTWFwID0gW1xuXHRcdFx0W1xuXHRcdFx0XHQncmVxdWVzdEZ1bGxzY3JlZW4nLFxuXHRcdFx0XHQnZXhpdEZ1bGxzY3JlZW4nLFxuXHRcdFx0XHQnZnVsbHNjcmVlbkVsZW1lbnQnLFxuXHRcdFx0XHQnZnVsbHNjcmVlbkVuYWJsZWQnLFxuXHRcdFx0XHQnZnVsbHNjcmVlbmNoYW5nZScsXG5cdFx0XHRcdCdmdWxsc2NyZWVuZXJyb3InXG5cdFx0XHRdLFxuXHRcdFx0Ly8gbmV3IFdlYktpdFxuXHRcdFx0W1xuXHRcdFx0XHQnd2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4nLFxuXHRcdFx0XHQnd2Via2l0RXhpdEZ1bGxzY3JlZW4nLFxuXHRcdFx0XHQnd2Via2l0RnVsbHNjcmVlbkVsZW1lbnQnLFxuXHRcdFx0XHQnd2Via2l0RnVsbHNjcmVlbkVuYWJsZWQnLFxuXHRcdFx0XHQnd2Via2l0ZnVsbHNjcmVlbmNoYW5nZScsXG5cdFx0XHRcdCd3ZWJraXRmdWxsc2NyZWVuZXJyb3InXG5cblx0XHRcdF0sXG5cdFx0XHQvLyBvbGQgV2ViS2l0IChTYWZhcmkgNS4xKVxuXHRcdFx0W1xuXHRcdFx0XHQnd2Via2l0UmVxdWVzdEZ1bGxTY3JlZW4nLFxuXHRcdFx0XHQnd2Via2l0Q2FuY2VsRnVsbFNjcmVlbicsXG5cdFx0XHRcdCd3ZWJraXRDdXJyZW50RnVsbFNjcmVlbkVsZW1lbnQnLFxuXHRcdFx0XHQnd2Via2l0Q2FuY2VsRnVsbFNjcmVlbicsXG5cdFx0XHRcdCd3ZWJraXRmdWxsc2NyZWVuY2hhbmdlJyxcblx0XHRcdFx0J3dlYmtpdGZ1bGxzY3JlZW5lcnJvcidcblxuXHRcdFx0XSxcblx0XHRcdFtcblx0XHRcdFx0J21velJlcXVlc3RGdWxsU2NyZWVuJyxcblx0XHRcdFx0J21vekNhbmNlbEZ1bGxTY3JlZW4nLFxuXHRcdFx0XHQnbW96RnVsbFNjcmVlbkVsZW1lbnQnLFxuXHRcdFx0XHQnbW96RnVsbFNjcmVlbkVuYWJsZWQnLFxuXHRcdFx0XHQnbW96ZnVsbHNjcmVlbmNoYW5nZScsXG5cdFx0XHRcdCdtb3pmdWxsc2NyZWVuZXJyb3InXG5cdFx0XHRdLFxuXHRcdFx0W1xuXHRcdFx0XHQnbXNSZXF1ZXN0RnVsbHNjcmVlbicsXG5cdFx0XHRcdCdtc0V4aXRGdWxsc2NyZWVuJyxcblx0XHRcdFx0J21zRnVsbHNjcmVlbkVsZW1lbnQnLFxuXHRcdFx0XHQnbXNGdWxsc2NyZWVuRW5hYmxlZCcsXG5cdFx0XHRcdCdNU0Z1bGxzY3JlZW5DaGFuZ2UnLFxuXHRcdFx0XHQnTVNGdWxsc2NyZWVuRXJyb3InXG5cdFx0XHRdXG5cdFx0XTtcblxuXHRcdHZhciBpID0gMDtcblx0XHR2YXIgbCA9IGZuTWFwLmxlbmd0aDtcblx0XHR2YXIgcmV0ID0ge307XG5cblx0XHRmb3IgKDsgaSA8IGw7IGkrKykge1xuXHRcdFx0dmFsID0gZm5NYXBbaV07XG5cdFx0XHRpZiAodmFsICYmIHZhbFsxXSBpbiBkb2N1bWVudCkge1xuXHRcdFx0XHRmb3IgKGkgPSAwLCB2YWxMZW5ndGggPSB2YWwubGVuZ3RoOyBpIDwgdmFsTGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRyZXRbZm5NYXBbMF1baV1dID0gdmFsW2ldO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiByZXQ7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9KSgpO1xuXG5cdHZhciBzY3JlZW5mdWxsID0ge1xuXHRcdHJlcXVlc3Q6IGZ1bmN0aW9uIChlbGVtKSB7XG5cdFx0XHR2YXIgcmVxdWVzdCA9IGZuLnJlcXVlc3RGdWxsc2NyZWVuO1xuXG5cdFx0XHRlbGVtID0gZWxlbSB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG5cblx0XHRcdC8vIFdvcmsgYXJvdW5kIFNhZmFyaSA1LjEgYnVnOiByZXBvcnRzIHN1cHBvcnQgZm9yXG5cdFx0XHQvLyBrZXlib2FyZCBpbiBmdWxsc2NyZWVuIGV2ZW4gdGhvdWdoIGl0IGRvZXNuJ3QuXG5cdFx0XHQvLyBCcm93c2VyIHNuaWZmaW5nLCBzaW5jZSB0aGUgYWx0ZXJuYXRpdmUgd2l0aFxuXHRcdFx0Ly8gc2V0VGltZW91dCBpcyBldmVuIHdvcnNlLlxuXHRcdFx0aWYgKC81XFwuMVtcXC5cXGRdKiBTYWZhcmkvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpIHtcblx0XHRcdFx0ZWxlbVtyZXF1ZXN0XSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZWxlbVtyZXF1ZXN0XShrZXlib2FyZEFsbG93ZWQgJiYgRWxlbWVudC5BTExPV19LRVlCT0FSRF9JTlBVVCk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRleGl0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRkb2N1bWVudFtmbi5leGl0RnVsbHNjcmVlbl0oKTtcblx0XHR9LFxuXHRcdHRvZ2dsZTogZnVuY3Rpb24gKGVsZW0pIHtcblx0XHRcdGlmICh0aGlzLmlzRnVsbHNjcmVlbikge1xuXHRcdFx0XHR0aGlzLmV4aXQoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMucmVxdWVzdChlbGVtKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdHJhdzogZm5cblx0fTtcblxuXHRpZiAoIWZuKSB7XG5cdFx0aWYgKGlzQ29tbW9uanMpIHtcblx0XHRcdG1vZHVsZS5leHBvcnRzID0gZmFsc2U7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHdpbmRvdy5zY3JlZW5mdWxsID0gZmFsc2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0T2JqZWN0LmRlZmluZVByb3BlcnRpZXMoc2NyZWVuZnVsbCwge1xuXHRcdGlzRnVsbHNjcmVlbjoge1xuXHRcdFx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBCb29sZWFuKGRvY3VtZW50W2ZuLmZ1bGxzY3JlZW5FbGVtZW50XSk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRlbGVtZW50OiB7XG5cdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdFx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBkb2N1bWVudFtmbi5mdWxsc2NyZWVuRWxlbWVudF07XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRlbmFibGVkOiB7XG5cdFx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdFx0Z2V0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdC8vIENvZXJjZSB0byBib29sZWFuIGluIGNhc2Ugb2Ygb2xkIFdlYktpdFxuXHRcdFx0XHRyZXR1cm4gQm9vbGVhbihkb2N1bWVudFtmbi5mdWxsc2NyZWVuRW5hYmxlZF0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0aWYgKGlzQ29tbW9uanMpIHtcblx0XHRtb2R1bGUuZXhwb3J0cyA9IHNjcmVlbmZ1bGw7XG5cdH0gZWxzZSB7XG5cdFx0d2luZG93LnNjcmVlbmZ1bGwgPSBzY3JlZW5mdWxsO1xuXHR9XG59KSgpO1xuIl19
