/**
 * Sets the visibility of the element while disabling interaction.
 * Doesn't mess with jQuery's positioning calculations like show()
 * and hide().
 */
$.fn.makeVisible = function(show) {
    if(show){
        $(this).css({
            "visibility": "visible",
            "pointer-events": ""
        });
    } else {
        $(this).css({
            "visibility": "hidden",
            "pointer-events": "none"
        });
    }
    
}