var path = require('path');
function getConfig(grunt, options) {
    options = options || {};
    options.dest = options.dest || 'dist/v1';

    var style = require('grunt-cmd-transport').style;

    // grunt-cmd-transport, css to js
    options.css2jsParser = style.init(grunt).css2jsParser;

    // grunt-cmd-concat, js concat css
    options.css2js = style.css2js;

    var pkg = options.pkg || 'package.json';

    if (typeof pkg === 'string' && grunt.file.exists(pkg)) {
        pkg = grunt.file.readJSON(pkg);
        options.pkg = pkg;
    }

    var data = distConfig(grunt, options, pkg);
    // import transport rules
    data.transport = transportConfig(grunt, options, pkg);
    data.clean = {build: ['.build'], dist: [options.dest]};
    return data;
}

function distConfig(grunt, options, pkg) {
    if (!pkg.spm) {
        process.emit('log.warn', 'missing `spm` in package.json');
        process.emit('log.info', 'read the docs at http://docs.spmjs.org/en/package');
        pkg.spm = {};
    }

    var output = pkg.spm.output || {};

    var jsconcats = {};
    var jsmins = [], cssmins = [];
    var copies = [];

    if (Array.isArray(output)) {
        var ret = {};
        output.forEach(function(name) {
            ret[name] = [name];
        });
        output = ret;
    }

    Object.keys(output).forEach(function(name) {
        var outs = output[name];
        if (!Array.isArray(outs)) {
            if (outs === '.') {
                outs = [name];
            } else {
                outs = [outs];
            }
        }

        if (name.indexOf('*') === -1) {
            if (/\.css$/.test(name)) {
                cssmins.push({
                    dest: '.build/dist/' + name,
                    src: outs.map(function(key) {
                        return '.build/tmp/' + key;
                    })
                });

                // copy debug css
                name = name.replace(/\.css$/, '-debug.css');
                copies.push({
                    cwd: '.build/tmp',
                    src: name,
                    expand: true,
                    dest: '.build/dist'
                });

            } else if (/\.js$/.test(name)) {
                // concat js
                jsconcats['.build/tmp/' + name] = outs.map(function(key) {
                    return '.build/src/' + key;
                });

                jsmins.push({
                    src: ['.build/tmp/' + name],
                    dest: '.build/dist/' + name
                });

                // create debugfile
                jsconcats['.build/dist/' + name.replace(/\.js$/, '-debug.js')] = outs.map(function(key) {
                    return '.build/src/' + key.replace(/\.js$/, '-debug.js');
                });
            } else {
                copies.push({
                    cwd: '.build/src',
                    src: name,
                    expand: true,
                    dest: '.build/dist'
                });
            }
        } else {
            copies.push({
                cwd: '.build/src',
                src: name,
                filter: function(src) {
                    if (/-debug\.(js|css)$/.test(src)) {
                        return true;
                    }
                    return !/\.(js|css)$/.test(src);
                },
                expand: true,
                dest: '.build/dist'
            });
            jsmins.push({
                cwd: '.build/src',
                src: name,
                filter: function(src) {
                    if (/-debug.js$/.test(src)) {
                        return false;
                    }
                    return /\.js$/.test(src);
                },
                expand: true,
                dest: '.build/dist'
            });
            cssmins.push({
                cwd: '.build/src',
                src: name,
                filter: function(src) {
                    if (/-debug.css$/.test(src)) {
                        return false;
                    }
                    return /\.css$/.test(src);
                },
                expand: true,
                dest: '.build/dist'
            });
        }
    });

    // for concat
    options.include = grunt.option('include') || pkg.spm.include || 'relative';
    return {
        // 'spm-install': {
        //     options: {
        //         force: options.force
        //     }
        // },
        concat: {
            // options should have css2js
            options: options,
            js: {files: jsconcats},
            css: {
                files: [{
                    cwd: '.build/src',
                    src: '**/*.css',
                    expand: true,
                    dest: '.build/tmp'
                }]
            }
        },
        cssmin: {
            options: {keepSpecialComments: 0},
            css: {files: cssmins}
        },
        uglify: {js: {files: jsmins}},
        copy: {
            build: {files: copies},
            dist: {
                files: [{
                    cwd: '.build/dist',
                    src: '**/*',
                    expand: true,
                    filter: 'isFile',
                    dest: options.dest || 'dist/v1'
                }]
            }
        }
    };
}
function transportConfig(grunt, options, pkg) {
    options = options || {};
    pkg = pkg || {spm: {}};
    if (!pkg.spm) {
        pkg.spm = {};
    }
    options.src = options.src || pkg.spm.source || 'src';
    options.idleading = options.idleading || pkg.spm.idleading;
    if (pkg.family && pkg.name && pkg.version) {
        options.idleading = options.idleading || (pkg.family + '/' + pkg.name + '/' + pkg.version + '/');
    }
    var new_path = path.join(__dirname, '../../');
    console.log(new_path);
    options.paths = [new_path];

    var spmConfig = {
        options: {
            styleBox: pkg.spm.styleBox,
            alias: pkg.spm.alias || {}
        },
        files: [{
            cwd: options.src,
            src: '**/*',
            filter: 'isFile',
            dest: '.build/src'
        }]
    };

    // transport concated css into js
    var cssConfig = {
        options: {
            styleBox: pkg.spm.styleBox,
            alias: pkg.spm.alias || {},
            parsers: {
                '.css': [options.css2jsParser]
            }
        },
        files: [{
            cwd: '.build/tmp',
            src: '**/*.css',
            filter: 'isFile',
            dest: '.build/src'
        }]
    };

    ['paths', 'idleading', 'debug', 'handlebars', 'uglify'].forEach(function(key) {
        if (options.hasOwnProperty(key)) {
            spmConfig.options[key] = options[key];
            cssConfig.options[key] = options[key];
        }
    });
    return {src: spmConfig, css: cssConfig};
}

function parseOptions(options) {
    options = options || {};

    var pkgfile = options.pkgfile || 'package.json';
    var pkg = {};

    if (grunt.file.exists(pkgfile)) {
        pkg = grunt.file.readJSON('package.json');
    }
    options.pkg = pkg;

    // var installpath = spmrc.get('install.path');
    // options.paths = [installpath];
    // if (installpath !== 'sea-modules') {
    //     options.paths.push('sea-modules');
    // }
    // var globalpath = path.join(spmrc.get('user.home'), '.spm', 'sea-modules');
    // options.paths.push(globalpath);

    return options;
}
module.exports = function (grunt) {
     
    process.on('log.warn', function(msg) {
        grunt.log.warn('warn ' + msg);
    });
    process.on('log.info', function(msg) {
        grunt.log.writeln('info ' + msg);
    });



    var pkg = grunt.file.readJSON('package.json');

    // check pkg
    if (!pkg.spm) {
        throw new Error('spm is required in package.json');
    }
    if (!pkg.spm.output) {
        throw new Error('spm.output is required in package.json');
    }

    var scripts = pkg.scripts || {};
    if (scripts.build) {
        if (scripts.build.trim() === 'spm build') {
            throw new Error('spm build error');
        }
        childexec(scripts.build, function() {
            grunt.log.writeln('success build finished.');
        });
    } else {
       
        //grunt.invokeTask('build', options, function(grunt) {

        var config = getConfig(grunt, pkg);
        
        grunt.initConfig(config);


        /**
        * 载入使用到的通过NPM安装的模块
        */

        grunt.loadNpmTasks('grunt-cmd-transport');
        grunt.loadNpmTasks('grunt-cmd-concat');
        grunt.loadNpmTasks('grunt-contrib-uglify');
        grunt.loadNpmTasks('grunt-contrib-copy');
        grunt.loadNpmTasks('grunt-contrib-cssmin');
        grunt.loadNpmTasks('grunt-contrib-clean');



        // grunt.loadNpmTasks('grunt-contrib-copy');
        // grunt.loadNpmTasks('grunt-contrib-uglify');
        // grunt.loadNpmTasks('grunt-contrib-less');
        // grunt.loadNpmTasks('grunt-contrib-cssmin');
        // grunt.loadNpmTasks('grunt-contrib-watch');
        // grunt.loadNpmTasks('grunt-kissy-template');
        // grunt.loadNpmTasks('grunt-kmc');
        // grunt.loadNpmTasks('grunt-contrib-connect');



        grunt.task.options({
            'done': function() {
                grunt.log.writeln('success build finished.');
            }
        });

        grunt.registerTask(
            'build', [
              'clean:build', // delete build direcotry first

            // 'spm-install', // install dependencies

              // build css
              'transport:src',  // src/* -> .build/src/*
              'concat:css',   // .build/src/*.css -> .build/tmp/*.css

              // build js (must be invoke after css build)
              'transport:css',  // .build/tmp/*.css -> .build/src/*.css.js
              'concat:js',  // .build/src/* -> .build/dist/*.js

              // to ./build/dist
              'copy:build',
              'cssmin:css',   // .build/tmp/*.css -> .build/dist/*.css
              'uglify:js',  // .build/tmp/*.js -> .build/dist/*.js

              'clean:dist',
              'copy:dist',  // .build/dist -> dist
              'clean:build'

              // 'spm-newline'
        ]);

        
        grunt.registerTask('default', ['build']);
    }
}