import { GetFormattedTime } from "../utils/time.js";

class SeekbarTooltip {
    constructor($parent, player){
        this.$parent = $parent;
        this.player = player;

        this.$tooltip = $("<div class='annotator-seekbar-tooltip'></div>").appendTo($parent);
        this.text = "Test";
        this.$content = $("<p>" + this.text + "</p>").appendTo(this.$tooltip);
        
        this.hoverOffset = -10;
        this.padding = 5;
        
        this.Hide();

        this.$parent.mousemove((event) => {
            this.Show();

            //Add and update tooltip on mouse movement to show where the mouse is hovering.
            let mouseX = event.pageX - player.$container.offset().left;
            let percent = mouseX / this.$parent.width();
            let timeAtCursor = percent * player.videoElement.duration;
            this.Move(mouseX, 0);
            this.SetContent(GetFormattedTime(timeAtCursor));

        });

        this.$parent.mouseout(() => {
            this.Hide();
        });

    }

    Move(x, y) {

        // Get initial positions
        let left = x - (this.GetWidth() / 2);
        let top = y - (this.GetHeight()) + this.hoverOffset;
        
        // Offset if necessary (keep on-screen)
        if (left - this.padding < 0) {
            left = this.padding;
        }
        
        if ( (left + this.padding + this.GetWidth()) > this.$parent.width() ) {
            left = this.$parent.width() - this.GetWidth() - this.padding;
        }
        
        // Apply positions
        this.$tooltip.css({
            top: top,
            left: left
        });
    }

    GetWidth() {
        return this.$tooltip.width();
    }

    GetHeight() {
        return this.$tooltip.height();
    }

    Show() {
        this.$tooltip.show();
    }

    Hide() {
        this.$tooltip.hide();
    }

    SetContent(text) {
        //console.log(text);
        this.$content.text(text);
    }



}

export { SeekbarTooltip };