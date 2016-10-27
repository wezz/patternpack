module.exports = function (grunt) {
  "use strict";

  var _ = require("lodash");
  var log = require("./gruntLogHelper.js")(grunt);
  var gruntfilePath = grunt.option("gruntfile") || ".";
  var basePath = require("path").dirname(gruntfilePath);
  var autoprefixer = require("autoprefixer");

  var gruntFileConfig = basePath + "/gruntfileConfig.json";
  var config = grunt.file.readJSON(gruntFileConfig);

  function root(path) {
    return getPath(config.root, path);
  }

  function integrate(path) {
    return getPath(config.integrate, path)
  }

  function release(path) {
    return getPath(config.release, path);
  }

  function build(path) {
    return getPath(config.build, path);
  }

  function src(path) {
    return getPath(config.src, path);
  }

  function assets(path) {
    return getPath(config.assets, path);
  }

  function theme(path) {
    return getPath(config.theme, path);
  }

  function data(path) {
    return getPath(config.data, path);
  }

  function getPath(configPath, path) {
    path = path || "";
    return configPath + path;
  }

  // return an array of paths with the src prepended
  // this should return the array in the same order it was configured
  // this is important because the styles may need to be processed in a
  // specific order for css cascading needs.
  function allPatternStructurePaths(paths)
  {
  	var result = []
  	if (typeof paths === "string")
  	{
  		result = _.map(config.patternStructure, function (structure)
  		{
  			return getPath(config.src + "/" + structure.path, paths);
  		});
  	}
  	else
  	{
  		for (let key in paths)
  		{
  			let path = paths[key];
  			let isExclude = (path.indexOf('!') === 0);
  			let excludeString = isExclude ? '!' : '';
  			path = path.substr((isExclude) ? 1 : 0);
  			result = result.concat(result,_.map(config.patternStructure, function (structure)
  			{
  				return getPath(excludeString + config.src + "/" + structure.path, path);
  			}));
  		}
  	}
  	return result;
  }

  function getBuildTasks(tasksConfig) {
    var buildTasks = ["clean:build", "build-styles"];
    var patternsTasks = ["build-patterns"];
    var patternLibraryTasks = ["build-site"];

    if (tasksConfig.library) {
      buildTasks = buildTasks.concat(patternLibraryTasks);
    }

    if (tasksConfig.patterns) {
      buildTasks = buildTasks.concat(patternsTasks);
    }

    log.verbose("PatternPack Grunt Tasks:");
    log.verbose(buildTasks);
    return buildTasks;
  }

  function getStyleTasks(cssPreprocessorConfig) {
    var sassTasks = ["sass_globbing:sass", "sass"];
    var lessTasks = ["sass_globbing:less", "less"];
    var cssTasks = ["postcss", "copy:css"];
    var tasks = [];

    if (cssPreprocessorConfig === "sass") {
      tasks = tasks.concat(sassTasks);
    } else if (cssPreprocessorConfig === "less") {
      tasks = tasks.concat(lessTasks);
    }

    tasks = tasks.concat(cssTasks);

    log.verbose("PatternPack CSS Preprocessor Tasks:");
    log.verbose(tasks);
    return tasks;
  }

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),

    gitadd: {
      task: {
        options: {
          all: true
        }
      }
    },

    bump: {
      options: {
        files: [
          root("/bower.json"),
          root("/package.json")
        ],
        updateConfigs: ["pkg"],
        commitFiles: ["-a"],
        push: false
      }
    },

    // Concurent tasks
    concurrent: {
      build: ["styles", "assemble"]
    },

    // Build HTML with Assemble.io
    assemble: {
      options: {
        patternStructure: config.patternStructure,
        helpers: [theme("/assemble-helpers/*.js"), "assemble-helpers/assemble-helper-*.js"],
        partials: theme("/partials/*.hbs"),
        postprocess: require("pretty"),
        data: data("/**/*.{json,yml}")
      },
      // Build the pattern library (fully functioning website)
      patternlibrary: {
        options: {
          assets: build("/pattern-library/assets"),
          layout: theme("/layouts/_pattern-library.hbs")
        },
        files: [
          {
            expand: true,
            cwd: src(),
            src: ["**/*.{md,hbs}", "!_pattern-library/**"],
            dest: build("/pattern-library/")
          }
        ]
      },
      // Bulid the patterns as raw html only (designed to be embedded in another website)
      patterns: {
        files: [
          {
            expand: true,
            cwd: src(),
            src: ["**/*.{md,hbs}", "!_pattern-library/**"],
            dest: build("/patterns/")
          }
        ]
      }
    },

    // Remove existing build artifacts
    clean: {
      options: {
        force: true
      },
      build: build(),
      release: release()
    },

    // Copy the artifacts for release
    copy: {
      release: {
        expand: true,
        cwd: build(),
        src: [
          "**"
        ],
        dest: release()
      },
      integrate: {
        expand: true,
        cwd: build(),
        src: [
          "**",
          "!pattern-library/theme-assets/**"
        ],
        dest: integrate()
      },
      css: {
        expand: true,
        cwd: assets(),
        src: [
          "css/**"
        ],
        dest: build("/pattern-library/assets")
      },
      assets: {
        expand: true,
        cwd: assets(),
        src: [
          "**",
          "!sass/**"
        ],
        dest: build("/pattern-library/assets")
      },
      themeAssets: {
        expand: true,
        cwd: theme(),
        src: [
          "theme-assets/**"
        ],
        dest: build("/pattern-library")
      }
    },

    // Build styles
    sass: {
      options: {
        sourceMap: true,
        sourceMapContents: true,
        outputStyle: "compressed"
      },
      patterns: {
        files: [
          {
            src: assets("/sass/" + config.css.fileName + ".scss"),
            dest: assets("/css/" + config.css.fileName + ".css")
          }
        ]
      }
    },

    less: {
      options: {
        sourceMap: true,
        outputSourceFiles: true,
        compress: true
      },
      patterns: {
      	files: (function ()
      	{
      		var result = [];
      		if (typeof config.css.targets === "object")
      		{
      			for (let key in config.css.targets)
      			{
      				result.push({
      					src: assets("/less/_patternpack-patterns-" + key + ".less"),
      					dest: assets("/css/"+ key + ".css")
      				});
      			}
      		}
      		else
      		{
      			result.push(
				{
					src: assets("/less/" + config.css.fileName + ".less"),
					dest: assets("/css/" + config.css.fileName + ".css")
				});
      		}

      		return result;
      	})()
      }
    },

    // Import all sass styles defined for patterns
    // Use the pattern structures to ensure that the styles are processed
    // in the specific order the user configures.
    "sass_globbing":
	{
		sass:
		{
			src: allPatternStructurePaths("/**/*.scss"),
			dest: assets("/sass/_patternpack-patterns.scss")
		  },
		less:
		(function ()
		{
			if (typeof config.css.targets === "object")
			{
				var result = {};
				for (let key in config.css.targets)
				{
					result[assets("/less/_patternpack-patterns-" + key + ".less")] = allPatternStructurePaths(config.css.targets[key]);
					
				}
				return { "files": result };
			}
			else
			{
				return {
					src: allPatternStructurePaths("/**/*.less"),
					dest: assets("/less/_patternpack-patterns.less")
				};
			}
		})()
    },

    // Run PostCSS Autoprefixer on any CSS in the assets directory
    // Using the configured Autoprefixer options (defaults to last 2 versions)
    postcss: {
      options: {
        map: true,
        processors: [
          autoprefixer(
            config.css.autoprefixer
          )
        ]
      },
      build: {
        src: assets("/css/*.css")
      }
    },

    // Run tasks when files change
    watch: {
      assemble: {
        files: [
          theme("/**/*.{md,hbs}"),
          src("/**/*.{md,hbs}")
        ],
        tasks: ["build-site"]
      },
      sass: {
        files: src("/**/*.scss"),
        tasks: ["build-styles", "copy:css"]
      },
      less: {
        files: src("/**/*.less"),
        tasks: ["build-styles", "copy:css"]
      },
      livereload: {
        files: build("/pattern-library/**"),
        options: {
          livereload: true
        }
      }
    },

    // Web server
    connect: {
      options: {
        base: build("/pattern-library"),
        hostname: "*"
      },
      server: {
        options: config.server
      }
    },

    eslint: {
      target: [
        "**/*.js",
        "!node_modules/**"
      ]
    }
  });

  var loadTaskConfig = {
    // The globbing pattern used to locate the desired grunt tasks
    pattern: [
      "grunt-*",
      "assemble"
    ],
    // The list of dependencies to include
    // ["dependencies", "optionalDependencies"]
    scope: ["dependencies"]
  };

  // If the root configuration exists it indicates that patternpack is
  // running from the context of another grunt process.  In this case
  // we should use load-grunt-parent-tasks to ensure the npm packages
  // are loaded correctly.  Otherwise, just load the tasks like normal.
  if (config.root) {
    // Load the tasks using the load-grunt-parent-tasks module.
    // This allows the grunt tasks to still be loaded when the
    // calling pattern library happens to contain one of the
    // dependencies used by pattern pack.  For more info:
    // https://www.npmjs.com/package/load-grunt-parent-tasks
    log.verbose("load parent tasks");
    require("load-grunt-parent-tasks")(grunt, loadTaskConfig);
  } else {
    log.verbose("load tasks");
    require("load-grunt-tasks")(grunt, loadTaskConfig);
  }

  // Modular tasks
  // These smaller grunt tasks organize work into logical groups
  // and are typically composed together into workflows
  grunt.registerTask("build-styles", getStyleTasks(config.css.preprocessor));
  grunt.registerTask("build-patterns", ["assemble:patterns"]);
  grunt.registerTask("build-pages", ["assemble:patternlibrary"]);
  grunt.registerTask("build-site", ["build-pages", "copy:assets", "copy:themeAssets"]);

  grunt.registerTask("server", ["connect", "watch"]);

  grunt.registerTask("release-patch", ["build", "clean:release", "copy:release", "gitadd", "bump:patch"]);
  grunt.registerTask("release-minor", ["build", "clean:release", "copy:release", "gitadd", "bump:minor"]);
  grunt.registerTask("release-major", ["build", "clean:release", "copy:release", "gitadd", "bump:major"]);

  // Main tasks
  grunt.registerTask("integrate", ["build", "copy:integrate"]);
  grunt.registerTask("release", ["release-patch"]);
  grunt.registerTask("build", getBuildTasks(config.publish));
  grunt.registerTask("default", ["build", "server"]);
};
