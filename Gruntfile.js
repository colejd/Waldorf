module.exports = function (grunt) {

    grunt.initConfig({
        browserify: {
            dist: {
                options: {
                    browserifyOptions: {
                        // Enable inline sourcemap generation so that
                        // stack traces reference the original files' lines
                        debug: true
                    },
                    transform: [
                        ["babelify", {
                            loose: "all"
                        }]
                    ]
                },
                files: {
                    // if the source file has an extension of es6 then
                    // we change the name of the source file accordingly.
                    // The result file's extension is always .js
                    "./dist/annotator-frontend.js": ["./modules/main.js"]
                }
            }
        },
        sass: {
            dist: {
                files: {
                    './dist/annotator-frontend.css': './sass/main.scss'
                }
            }
        },
        watch: {
            scripts: {
                //Build packed file when any source files change
                files: ["./modules/**/*.js"],
                tasks: ["browserify", "extract_sourcemap"]
            },
            styles: {
                //Build packed file when any style files change
                files: ["./sass/**/*.scss"],
                tasks: ["sass"]
            },
            system: {
                files: ["./Gruntfile.js", "./package.json"],
                tasks: ["build"]
            }
            // ,postbuild: {
            //     files: ["./dist/*.js"],
            //     tasks: ["extract_sourcemap"]
            // }
        },
        browserSync: {
            default_options: {
                bsFiles: {
                    // BrowserSync will reload if any of the following files are changed.
                    src: [
                        "./testpage/**/*.js",
                        "./testpage/**/*.html",
                        "./testpage/**/*.css",
                        "./dist/**/*.css"
                    ]
                },
                options: {
                    watchTask: true,
                    server: {
                        baseDir: "./",
                        index: "./testpage/index.html"
                    }
                }
            }
        },
        extract_sourcemap: {
            // Task to extract the inline sourcemap from the built file
            // so that Chrome can use it for debug purposes (stack traces
            // will point to original source files)
            files: {
                './dist': ['./dist/annotator-frontend.js'],
            },
        }
    });

    grunt.loadNpmTasks("grunt-browserify");
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks('grunt-browser-sync');
    grunt.loadNpmTasks('grunt-extract-sourcemap');

    grunt.registerTask("build", ["sass", "browserify"]);
    grunt.registerTask("preview", ["build", "browserSync", "watch"]);
};