
/**
 * Manages the creating or editing of a single polygon on the video.
 * Consists of a toolbar, an overlay, and the polygon inside the overlay.
 *
 * Click to place or remove a draggable point. Points should be
 * put down in clockwise order.
 */
class PolygonEditor {
    constructor(annotator){
        this.annotator = annotator;
        this.baseZ = 2147483649 + 5;
        this.$breadcrumbs = [];

        // Create the video overlay
        this.$clickSurface = $("<div class='annotator-edit-overlay annotator-vp-click-surface'></div>").appendTo(this.annotator.player.$container);
        this.$clickSurface.css("z-index", this.baseZ);
        this.$clickSurface.click((event) => {
            this.OnSurfaceClick(event);
        });

        // Create the poly object
        this.$poly = $("<div class='annotator-edit-poly'></div>").appendTo(this.annotator.player.$container);
        this.$poly.css("z-index", this.$clickSurface.css("z-index") + 1);

        this.ResizeOverlay();
        this.annotator.player.$container.on("OnFullscreenChange", (event, setFullscreen) => this.ResizeOverlay());

        // Create the toolbar up top
        this.$bar = $("<div class='annotator-vp-post'></div>").appendTo(this.annotator.player.$container);
        this.$postToolbar = $("<div class='flex-toolbar'></div>").appendTo(this.$bar);
        // Invisible expanding divider
        this.$postToolbar.append($("<div><p style='color:white'>Edit Polygon</p></div>").css("flex-grow", 1).css("order", 0));

        // Create undo button
        this.$undoButton = $("<button>Remove Last Point</button>").button({
            icon: "fa fa-undo",
            showLabel: false
        });
        this.$undoButton.css("margin-right", "15px");
        this.$undoButton.attr('title', "Remove last point");
        this.$undoButton.click(() => {
            this.RemoveLastBreadcrumb();
        });
        this.RegisterElement(this.$undoButton, this.$postToolbar, 1, 'flex-end');

        // Create the confirm button
        this.$confirmButton = $("<button>Finish polygon</button>").button({
            icon: "fa fa-check",
            showLabel: false
        });
        this.$confirmButton.attr('title', "Finish polygon");
        this.$confirmButton.addClass("annotator-confirm-button");
        this.$confirmButton.click(() => {
            this.originalJSON = this.GetJSON();
            this.Done();
            this.annotator.$container.trigger("OnPolygonEditingEnded");
        });
        this.RegisterElement(this.$confirmButton, this.$postToolbar, 3, 'flex-end');

        // Create the cancel button
        this.$cancelButton = $("<button>Cancel polygon editing</button>").button({
            icon: "fa fa-remove",
            showLabel: false
        });
        this.$cancelButton.addClass("annotator-cancel-button");
        this.$cancelButton.attr('title', "Cancel polygon editing");
        this.$cancelButton.click(() => {
            //Restore the original state
            this.Restore();
            this.Done();
            this.annotator.$container.trigger("OnPolygonEditingEnded");
        });
        this.RegisterElement(this.$cancelButton, this.$postToolbar, 2, 'flex-end');

        this.Done();
    }

    OnSurfaceClick(event){
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

    /**
     * Creates a new breadcrumb at the given (x, y) point on the
     * clickSurface, where x and y are percentages from 0 to 100.
     */
    AddBreadcrumb(xPercent, yPercent){
        let $breadcrumb = $("<div class='breadcrumb'></div>");
        $breadcrumb.appendTo(this.$clickSurface);
        $breadcrumb.css("position", "absolute");

        // Percentage representations of breadcrumb width and height
        let offPercentX = ($breadcrumb.outerWidth() / this.$clickSurface.width()) * 100;
        let offPercentY = ($breadcrumb.outerHeight() / this.$clickSurface.height()) * 100;

        $breadcrumb.css("left", (xPercent - (offPercentX / 2)).toString() + "%");
        $breadcrumb.css("top", (yPercent - (offPercentY / 2)).toString() + "%");
        $breadcrumb.css("z-index", this.baseZ + 5);

        
        $breadcrumb.draggable({ 
            //containment: "parent",
            drag: () => {
                // Recalculate percentages (mangled by jQuery UI draggable code)
                // See http://stackoverflow.com/a/23673462
                var l = ( 100 * parseFloat($breadcrumb.css("left")) / parseFloat($breadcrumb.parent().css("width")) )+ "%" ;
                var t = ( 100 * parseFloat($breadcrumb.css("top")) / parseFloat($breadcrumb.parent().css("height")) )+ "%" ;
                $breadcrumb.css("left" , l);
                $breadcrumb.css("top" , t);
                this.UpdatePolyClipping();
            }
        });
        $breadcrumb.click((event) => {
            // Remove the breadcrumb on click
            event.stopPropagation();
            $breadcrumb.remove();
            this.$breadcrumbs.splice(this.$breadcrumbs.indexOf($breadcrumb), 1);
            this.UpdatePolyClipping();
            this.UpdateBreadcrumbColoring();
        });
        
        this.$breadcrumbs.push($breadcrumb);

        //this.UpdatePolyClipping();
        this.UpdateBreadcrumbColoring();
    }

    /**
     * Removes the last-placed breadcrumb from the list
     * and updates the view.
     */
    RemoveLastBreadcrumb(){
        let $removed = this.$breadcrumbs.pop();
        $removed.remove();
        this.UpdatePolyClipping();
        this.UpdateBreadcrumbColoring();
    }

    /**
     * Gets the center of the breadcrumb as an (x, y) pair
     * representing the percentage distance from the top and left
     * of the click surface (0% - 100%).
     */
    GetCenterPercentage($breadcrumb){

        let topPercent = ($breadcrumb.position().top / $breadcrumb.parent().height()) * 100;
        let leftPercent = ($breadcrumb.position().left / $breadcrumb.parent().width()) * 100;

        // Percentage values for the dimensions of the breadcrumb relative to the click surface
        let offPercentX = ($breadcrumb.outerWidth() / $breadcrumb.parent().width()) * 100;
        let offPercentY = ($breadcrumb.outerHeight() / $breadcrumb.parent().height()) * 100;

        return {
            x: leftPercent + (offPercentX / 2.0),
            y: topPercent + (offPercentY / 2.0)
        }
    }

    Reset(){
        
        // Remove all breadcrumbs
        for(let $breadcrumb of this.$breadcrumbs){
            $breadcrumb.remove();
        }
        this.$breadcrumbs = [];

        // Remove the poly if it already exists
        // if(this.$poly != null){
        //     this.$poly.remove();
        // }
    }

    Restore(){
        this.InitPoly(this.originalJSON);
    }

    InitPoly(pointsJSON = null){
        this.Reset();

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
        if(this.$breadcrumbs.length < 3){
            this.$poly.clipPath([], {
                svgDefId: 'annotatorPolyEditorSvg'
            });
            return;
        }

        let points = this.$breadcrumbs.map(($crumb) => {
            let pos = this.GetCenterPercentage($crumb);
            return [pos.x, pos.y];
        });

        this.$poly.clipPath(points, {
            isPercentage: true,
            svgDefId: 'annotatorPolyEditorSvg'
        });

    }

    UpdateBreadcrumbColoring(){
        for(let i = 0; i < this.$breadcrumbs.length; i++){
            let $crumb = this.$breadcrumbs[i];
            // Recolor each breadcrumb
            let color = "#000000";

            if (i == this.$breadcrumbs.length - 1) {
                color = "#FF0000";
            }
            else if (i == 0){
                color = "#00FF00";
            }
            this.$breadcrumbs[i].css("border-color", color);
        }
    }

    /**
     * Gets an array of percentages representing the x and y percentages of each
     * point in the polygon.
     */
    GetJSON(){
        // Extract the coordinates from the crumbs and put them in the array
        let points = [];
        for(let crumb of this.$breadcrumbs){
            let point = this.GetCenterPercentage(crumb);
            points.push([point.x.toString(), point.y.toString()]);
        }

        return JSON.stringify(points);
    }

    BeginEditing(){
        this.$clickSurface.show();
        this.$poly.show();
        this.$bar.show();
        this.UpdatePolyClipping();
    }

    Done(){
        this.$clickSurface.hide();
        this.$poly.hide();
        this.$bar.hide();
    }

    ResizeOverlay(){
        // Resize video overlay to fit actual video dimensions
        let videoDims = this.annotator.player.GetVideoDimensions();
        this.$clickSurface.css('width', videoDims.width);
        this.$clickSurface.css('height', videoDims.height);
        let heightDiff = (this.annotator.player.$video.height() - videoDims.height) / 2;
        this.$clickSurface.css('top', heightDiff);

        this.$poly.width(videoDims.width);
        this.$poly.height(videoDims.height);
        this.$poly.css("top", heightDiff);
    }

    RegisterElement($element, $container, order, justification = 'flex-start'){
        $element.css('order', order);
        $element.css('align-self', justification);
        // Sets grow [shrink] [basis]
        //$element.css('flex', '0 0 auto');
        $container.append($element);
    }

    ShowJustPolygon(){
        this.$poly.show();
        //this.UpdatePolyClipping();
    }

}

export { PolygonEditor };