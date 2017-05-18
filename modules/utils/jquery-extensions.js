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

// https://jsfiddle.net/mekwall/tUTyH/
$.fn.copyCssTo = function(elm, cpattr){
    var $from = $(this),
        $to = $(elm),
        attr = $from.attr("style").split(";"),
        oattr = {};
        
    $.each(attr, function(i,a){
        var css = a.split(":"),
            name = css[0].trim();
        if (css[1]) {
            oattr[name] = css[1].trim();
        }
    });

    if (cpattr) {
        if ($.type(cpattr) != "array") {
            cpattr = [cpattr];
        }
        $.each(cpattr, function(i,a){
            if (oattr[a]) {
                $to.css(a, oattr[a]);
            } else if ($from.css(a)) {
                $to.css(a, $from.css(a));
            }
        });
    } else {
        $.each(oattr, function(i,a){
            $to.css(i, a);
        });
        $to.attr("class", $from.attr("class"));
    }
};