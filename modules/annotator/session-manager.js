let sha1 = require('sha1');

/**
 * Manages the user session for communicating with the backend.
 */
class SessionManager {

    constructor(annotator){
        console.log("Creating SessionManager...");
        this.annotator = annotator;
        this.modalOpen = false;

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
        let $container = $("<div class='session-modal' title='Log In'></div>"); // Outermost HTML
        let $headText = $("<p class='validateTips'>All fields are required.</p>").appendTo($container);
        let $form = $("<form></form>").appendTo($container);

        let $usernameField;
        let $passwordField;

        if (this.annotator.apiKey){
            $("<label for='username'>Email Address</label>").appendTo($form);
            $usernameField = $("<input type='text' name='username' value='' class='text ui-widget-content ui-corner-all'>").appendTo($form);
        }
        else {
            $("<label for='username'>Username</label>").appendTo($form);
            $usernameField = $("<input type='text' name='username' value='' class='text ui-widget-content ui-corner-all'>").appendTo($form);
            $("<label for='password'>Password</label>").appendTo($form);
            $passwordField = $("<input type='password' name='password' value='' class='text ui-widget-content ui-corner-all'>").appendTo($form);
        }
        
        $form.wrapInner("<fieldset />");

        let login = () => {
            if(this.annotator.apiKey){
                let userName = sha1($usernameField.val());
                this.annotator.server.LogIn(userName).done(() => {
                    console.log("API key login success");
                    $dialog.dialog("close");
                }).fail(() => {
                    $headText.html("<p>Invalid email address.</p>");
                    $headText.css("color", "red");
                });
            }
            else {
                let userPass = sha1($passwordField.val());
                this.annotator.server.LogIn($usernameField.val(), userPass).done(() => {
                    $dialog.dialog("close");
                }).fail(() => {
                    $headText.html("<p>Invalid username or password.</p>");
                    $headText.css("color", "red");
                });
            }
            
        }

        let $dialog = $container.dialog({
            autoOpen: true,
            draggable: false,
            modal: true,
            buttons: {
                "Log In": login,
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

        // Turn off fullscreen if it's on
        this.annotator.player.SetFullscreen(false);

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