var fs = require("fs")
var path = require("path")

var temp = require('temp')
var async = require("async")
var _ = require("underscore")

var loadDir = require("organic-dna-fsloader").loadDir
var DNA = require("organic-dna")
var save = require("organic-dna-save")
var fold = require("organic-dna-fold")

var cp = require("cp-r")
var inquirer = require("inquirer")

var exec = require("child_process").exec

module.exports = function(angel){
  require("angelabilities-exec")(angel)
  angel.on("stack update :source", function(angel){
    temp.track();

    var upstreamDirPath;

    var tasks = [
      // clone to a temporary folder
      function(next){
        console.info("cloning upstream source ...")
        temp.mkdir('upstream', function(err, dirPath) {
          if(err) return next(err)
          angel.sh("git clone "+angel.cmdData.source+" "+dirPath, function(err){
            if(err) return next(err)
            upstreamDirPath = dirPath
            var child = exec("npm install", {
              cwd: upstreamDirPath,
              env: process.env
            }, next)
            child.stdout.pipe(process.stdout)
            child.stderr.pipe(process.stderr)
          })
        })
      },

      // apply upgrades on a temprory folder
      function(next){
        fs.readdir(path.join(upstreamDirPath, "upgrades"), function(err, entries){
          var questions = [/*{
            type: "input",
            name: "username",
            message: "username"
          }*/]
          entries.forEach(function(entry){
            questions.push({
              type: "input",
              name: entry,
              message: "used "+entry+"? [y,n]",
              default: "n"
            })
          })
          inquirer.prompt(questions, function(answers) {
            var mergeList = []
            for(var key in answers)
              if(answers[key] == "y")
                mergeList.push(key)
            async.eachSeries(mergeList, function(item, nextItem){
              console.info("upgrading upstream "+item+" ...")
              var child = exec("node ./node_modules/.bin/angel stack add ./upgrades/"+item, {
                cwd: upstreamDirPath,
                env: process.env
              }, nextItem)
              child.stdout.pipe(process.stdout)
              child.stderr.pipe(process.stderr)
            }, next)
          })
        })
      },

      // merge dna
      function(next){
        console.info("merging dna ...")
        var upstreamDNA = new DNA()
        var currentDNA = new DNA()
        loadDir(upstreamDNA, path.join(upstreamDirPath, "dna"), function(err){
          if(err) return next(err)
          loadDir(currentDNA, path.join(process.cwd(), "dna"), function(err){
            if(err) return next(err)
            fold(currentDNA, upstreamDNA)
            save(currentDNA, path.join(process.cwd(), "dna"), function(err){
              if(err) return next(err)
              next()
            })
          })
        })
      },

      // update package.json & npm install
      function(next){
        console.info("updating package.json (dev)dependencies ...")
        var currentPackageJSONPath = path.join(process.cwd(), "package.json")
        var upstreamPackageJSON = require(path.join(upstreamDirPath, "package.json"))
        var currentPackageJSON = require(currentPackageJSONPath)
        _.extend(currentPackageJSON.dependencies, upstreamPackageJSON.dependencies)
        _.extend(currentPackageJSON.devDependencies, upstreamPackageJSON.devDependencies)
        fs.writeFile(currentPackageJSONPath, JSON.stringify(currentPackageJSON, null, 2), function(err){
          if(err) return next(err)
          angel.sh("npm install", next)
        })
      },

      // copy over context baseline 
      function(next){
        fs.readdir(path.join(upstreamDirPath, "context"), function(err, entries){
          var questions = [/*{
            type: "input",
            name: "username",
            message: "username"
          }*/]
          entries.forEach(function(entry){
            questions.push({
              type: "input",
              name: entry,
              message: "merge "+entry+"? [y,n]",
              default: "n"
            })
          })
          inquirer.prompt(questions, function(answers) {
            var mergeList = []
            for(var key in answers)
              if(answers[key] == "y")
                mergeList.push(key)
            async.eachSeries(mergeList, function(item, nextItem){
              var src = path.join(upstreamDirPath, "context", item)
              var dest = path.join(process.cwd(), "context", item)
              console.info("copy ", src, " - over ->", dest)
              cp(src, dest).read(nextItem)
            }, next)
          })
        })
        
      },

      // start tests
      function(next){
        angel.sh("npm test", next)
      }
    ]

    async.eachSeries(tasks, function(task, next){
      task(next)
    }, function(err){
      if(err) {
        console.error(err)
        process.exit(1)
        return
      }
      console.info("all done, git diff & go")
    })
  })
  .example("angel stack update https://github.com/outbounder/organic-stem-skeleton.git")
}