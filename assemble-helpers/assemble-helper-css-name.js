module.exports.register = function (Handlebars, options, params) {
  "use strict";

  var grunt = require("grunt")

  var gruntfilePath = grunt.option("gruntfile") || ".";
  var basePath = require("path").dirname(gruntfilePath);
  var gruntFileConfig = basePath + "/gruntfileConfig.json";
  var config = grunt.file.readJSON(gruntFileConfig);

  Handlebars.registerHelper("cssFileName", function ()
  {
  	return (config.css.fileName) ? config.css.fileName + ".css" : null;
  })

  Handlebars.registerHelper("cssFiles", function ()
  {
  	var files = "";
  	if (typeof config.css.fileName === "string")
  	{
  		files += '<link href="' + this.assets +'/css/'+ config.css.fileName +'.css" rel="stylesheet" />\n';
  	}
  	if (typeof config.css.targets === "object")
  	{
  		for (let key in config.css.targets)
  		{
  			files += '<link href="' + this.assets + '/css/' + key + '.css" rel="stylesheet" />\n';
  		}
  	}
  	return files;
  });
};
