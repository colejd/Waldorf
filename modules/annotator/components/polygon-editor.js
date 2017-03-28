
/**
 * Manages the creating or editing of a single polygon on the video.
 * Consists of a toolbar, an overlay, and the polygon inside the overlay.
 * 
 * 
 * Click to place or remove a point
 * 
 * 
 */
class PolygonEditor {
    constructor(annotator){
        this.annotator = annotator;
        this.baseZ = 2147483649 + 5;
        this.breadcrumbs = [];
        //this.newPolyPoints = [];

        // Create the video overlay
        this.$clickSurface = $("<div class='annotator-edit-overlay annotator-vp-click-surface'></div>").appendTo(this.annotator.player.$container);
        this.$clickSurface.css("z-index", this.baseZ);
        this.$clickSurface.click((event) => {
            this.OnClick(event);
        });
        this.ResizeOverlay();
        this.annotator.player.$container.on("OnFullscreenChange", (event, setFullscreen) => this.ResizeOverlay());

        // Create the toolbar up top
        this.$bar = $("<div class='annotator-vp-post'></div>").appendTo(this.annotator.player.$container);
        this.$postToolbar = $("<div class='flex-toolbar'></div>").appendTo(this.$bar);
        // Invisible expanding divider
        this.$postToolbar.append($("<div><p style='color:white'>Edit Polygon</p></div>").css("flex-grow", 1).css("order", 0));

        // Create the confirm button
        this.$confirmButton = $("<div>Finish polygon</div>").button({
            icon: "ui-icon-check",
            showLabel: false
        });
        this.$confirmButton.attr('title', "Finish polygon");
        this.$confirmButton.click(() => {
            this.Done();
            this.annotator.$container.trigger("OnPolygonEditingEnded");
        });
        this.RegisterElement(this.$confirmButton, this.$postToolbar, 2, 'flex-end');

        // Create the cancel button
        this.$cancelButton = $("<div>Cancel polygon editing</div>").button({
            icon: "ui-icon-close",
            showLabel: false
        });
        this.$cancelButton.attr('title', "Cancel polygon editing");
        this.$cancelButton.click(() => {
            //Restore the original state
            this.Restore();
            this.Done();
            this.annotator.$container.trigger("OnPolygonEditingEnded");
        });
        this.RegisterElement(this.$cancelButton, this.$postToolbar, 1, 'flex-end');

        this.Done();
    }

    OnClick(event){
        // Add a breadcrumb on click
        let target = $(event.currentTarget);
        let x = event.pageX - target.offset().left;
        let y = event.pageY - target.offset().top;
        
        let xPercent = (x / target.width()) * 100;
        let yPercent = (y / target.height()) * 100;
        
        this.AddBreadcrumb(xPercent, yPercent);
        
        //this.newPolyPoints.push([xPercent.toFixed(3), yPercent.toFixed(3)]);
        this.UpdatePolyClipping();
    }

    AddBreadcrumb(xPercent, yPercent){
        let $breadcrumb = $("<div class='breadcrumb'></div>");
        $breadcrumb.appendTo(this.$clickSurface);
        $breadcrumb.css("position", "absolute");

        // Percentage representations of breadcrumb width and height
        let offPercentX = ($breadcrumb.outerWidth() / this.$clickSurface.width()) * 100;
        let offPercentY = ($breadcrumb.outerHeight() / this.$clickSurface.height()) * 100;

        $breadcrumb.css("left", (xPercent - (offPercentX / 2)).toString() + "%");
        $breadcrumb.css("top", (yPercent - (offPercentY / 2)).toString() + "%");
        $breadcrumb.css("z-index", this.baseZ + 1);

        $breadcrumb.click((event) => {
            // Remove the breadcrumb on click
            event.stopPropagation();
            $breadcrumb.remove();
            this.breadcrumbs.splice(this.breadcrumbs.indexOf($breadcrumb), 1);
            this.UpdatePolyClipping();
        });
        
        this.breadcrumbs.push($breadcrumb);
    }

    /**
     * Gets the center point of the set of breadcrumbs.
     * Represented as an (x, y) pair which denote percentage
     * distance of the midpoint from the top and left of the click surface.
     */
    GetCentroid(breadcrumbs){
        let sumX = 0.0;
        let sumY = 0.0;
        let numPoints = 0;

        // Average the x and y to get the center point.
        for(let $breadcrumb of breadcrumbs){
            let percentages = this.GetCenterPercentage($breadcrumb);
            sumX += percentages.x;
            sumY += percentages.y;
            numPoints += 1;
        }

        return {
            x: sumX / numPoints,
            y: sumY / numPoints
        }
    }

    /**
     * Gets the clockwise ordering of all the breadcrumbs.
     * from http://stackoverflow.com/a/6989383
     */
    GetClockwiseOrdering(){
        let crumbs = this.breadcrumbs;
        let center = this.GetCentroid(crumbs);

        let less = ($a, $b) => {
            let a = this.GetCenterPercentage($a);
            let b = this.GetCenterPercentage($b);

            if (a.x - center.x >= 0 && b.x - center.x < 0)
                return true;
            if (a.x - center.x < 0 && b.x - center.x >= 0)
                return false;
            if (a.x - center.x == 0 && b.x - center.x == 0) {
                if (a.y - center.y >= 0 || b.y - center.y >= 0)
                    return a.y > b.y;
                return b.y > a.y;
            }

            // compute the cross product of vectors (center -> a) x (center -> b)
            let det = (a.x - center.x) * (b.y - center.y) - (b.x - center.x) * (a.y - center.y);
            if (det < 0)
                return true;
            if (det > 0)
                return false;

            // points a and b are on the same line from the center
            // check which point is closer to the center
            let d1 = (a.x - center.x) * (a.x - center.x) + (a.y - center.y) * (a.y - center.y);
            let d2 = (b.x - center.x) * (b.x - center.x) + (b.y - center.y) * (b.y - center.y);
            return d1 > d2;
        }
        crumbs.sort((a, b) => {
            return less(a, b);
        });

        // Extract the coordinates from the crumbs and put them in the array
        let points = [];
        for(let crumb of crumbs){
            let point = this.GetCenterPercentage(crumb);
            points.push([point.x, point.y]);
        }

        return points;
    }

    /**
     * Gets the center of the breadcrumb as an (x, y) pair
     * representing the percentage distance from the top and left
     * of the click surface (0% - 100%).
     */
    GetCenterPercentage($breadcrumb){
        let elem = $breadcrumb.get(0);

        let topPercent = parseFloat(elem.style.top);
        let leftPercent = parseFloat(elem.style.left);

        // Percentage values for the dimensions of the breadcrumb relative to the click surface
        let offPercentX = ($breadcrumb.outerWidth() / this.$clickSurface.width()) * 100;
        let offPercentY = ($breadcrumb.outerHeight() / this.$clickSurface.height()) * 100;

        return {
            x: leftPercent + (offPercentX / 2.0),
            y: topPercent + (offPercentY / 2.0)
        }
    }

    Reset(){
        
        // Remove all breadcrumbs
        for(let $breadcrumb of this.breadcrumbs){
            $breadcrumb.remove();
        }
        this.breadcrumbs = [];

        // Remove the poly if it already exists
        if(this.$poly != null){
            this.$poly.remove();
        }
    }

    Restore(){
        this.InitPoly(this.originalJSON);
    }

    InitPoly(pointsJSON = null){
        this.Reset();

        // Create the poly object
        this.$poly = $("<div class='annotator-edit-poly'></div>").appendTo(this.$clickSurface);

        // If JSON was specified, generate breadcrumbs from it.
        if(pointsJSON != null){
            // Parse the points array from the annotation
            let pointsData = JSON.parse(pointsJSON);

            // Put down the breadcrumbs
            for(let point of pointsData){
                this.AddBreadcrumb(point[0], point[1]);
            }
        }

        this.UpdatePolyClipping();

        this.originalJSON = pointsJSON;
    }

    UpdatePolyClipping(){
        if(this.breadcrumbs.length < 3){
            return;
        }
        let orderedPoints = this.GetClockwiseOrdering();

        this.$poly.clipPath(orderedPoints, {
            isPercentage: true,
            svgDefId: 'annotatorPolyEditorSvg'
        });

    }

    /**
     * Gets an array of percentages representing the x and y percentages of each
     * point in the polygon, in clockwise order.
     */
    GetJSON(){
        // Extract the coordinates from the crumbs and put them in the array
        let points = [];
        for(let crumb of this.breadcrumbs){
            let point = this.GetCenterPercentage(crumb);
            points.push([point.x.toString(), point.y.toString()]);
        }

        return JSON.stringify(points);
    }

    BeginEditing(){
        this.$clickSurface.show();
        this.$bar.show();
    }

    Done(){
        this.$clickSurface.hide();
        this.$bar.hide();
    }

    ResizeOverlay(){
        // Resize video overlay to fit actual video dimensions
        let videoDims = this.annotator.player.GetVideoDimensions();
        this.$clickSurface.css('width', videoDims.width);
        this.$clickSurface.css('height', videoDims.height);
        let heightDiff = (this.annotator.player.$video.height() - videoDims.height) / 2;
        this.$clickSurface.css('top', heightDiff);
    }

    RegisterElement($element, $container, order, justification = 'flex-start'){
        $element.css('order', order);
        $element.css('align-self', justification);
        // Sets grow [shrink] [basis]
        //$element.css('flex', '0 0 auto');
        $container.append($element);
    }

}

export { PolygonEditor };