/**
 * Manages the user session for communicating with the backend.
 */

class SessionManager {

    constructor(annotator){
        console.log("Creating SessionManager...");
        this.annotator = annotator;
        this.modalOpen = false;

        $("head").append(`<style>
    label, input { display:block; }
    input.text { margin-bottom:12px; width:95%; padding: .4em; }
    fieldset { padding:0; border:0; margin-top:25px; }
    h1 { font-size: 1.2em; margin: .6em 0; }
    div#users-contain { width: 350px; margin: 20px 0; }
    div#users-contain table { margin: 1em 0; border-collapse: collapse; width: 100%; }
    div#users-contain table td, div#users-contain table th { border: 1px solid #eee; padding: .6em 10px; text-align: left; }
    .ui-dialog .ui-state-error { padding: .3em; }
    .validateTips { border: 1px solid transparent; padding: 0.3em; }
  </style>`);

        // Inject the button for logging in/out into the toolbar
        this.$userButton = $("<button>Log In</button>").button({
            icon: "fa fa-user",
            showLabel: false
        }).click(() => {
            this.PresentModal();
        });
        this.annotator.player.controlBar.RegisterElement(this.$userButton, 1, 'flex-end');

        //this.$dialog.dialog("open");

        console.log("SessionManager created.");

    }

    ShowLoginModal(){
        // Create the dialog
        let $container = $("<div title='Log In'></div>"); // Outermost HTML
        let $headText = $container.html("<p class='validateTips'>All fields are required.</p>");
        let $form = $("<form></form>").appendTo($container);
        $("<label for='username'>Username</label>").appendTo($form);
        let $usernameField = $("<input type='text' name='username' value='' class='text ui-widget-content ui-corner-all'>").appendTo($form);
        $("<label for='password'>Password</label>").appendTo($form);
        let $passwordField = $("<input type='password' name='password' value='' class='text ui-widget-content ui-corner-all'>").appendTo($form);
        $form.wrapInner("<fieldset />");

        let $dialog = $container.dialog({
            autoOpen: true,
            draggable: false,
            modal: true,
            buttons: {
                "Log In": () => {
                    this.annotator.server.LogIn($usernameField.val(), $passwordField.val()).done(() => {
                        $dialog.dialog("close");
                    });
                },
                Cancel: () => {
                    $dialog.dialog("close");
                }
            },
            close: () => {
                $dialog.find("form")[ 0 ].reset();
                $dialog.find("input").removeClass( "ui-state-error" );
                this.OnModalClose();
            }
        });
    }

    ShowLogoutModal(){
        let $container = $("<div title='Log Out'></div>");
        let $headText = $container.html("<p class='validateTips'>Are you sure you want to log out?</p>");
        let $dialog = $container.dialog({
            autoOpen: true,
            draggable: false,
            modal: true,
            buttons: {
                "Log Out": () => {
                    this.annotator.server.LogOut().done(() => {
                        $dialog.dialog("close");
                    });
                },
                Cancel: () => {
                    $dialog.dialog("close");
                }
            },
            close: () => {
                this.OnModalClose();
            }
        });
    }

    PresentModal(){
        // Early out if the modal is already open
        if(this.modalOpen) return;

        if(this.annotator.server.LoggedIn()){
            this.ShowLogoutModal();
        } else {
            this.ShowLoginModal();
        }

        this.OnModalOpen();
    }

    OnModalOpen(){
        this.$userButton.button("disable");
        this.modalOpen = true;
    }

    OnModalClose(){
        this.$userButton.button("enable");
        this.modalOpen = false;
    }

}

export { SessionManager };