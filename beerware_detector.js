var express = require('express');
var url = require('url');
var https = require('https');

var gapi = 'api.github.com';

var app = express.createServer(express.logger());

function license_checking (license_res) {
   var data = '' ;

   license_res.on('data', function(chunk) {
      data += chunk;
   });

   license_res.on('end', function() {
      //console.log(data) ;
      if (data.match(/THE BEER-WARE LICENSE/)) {
         number++;
      }
      req_num++;
         console.log('Yeah I get here some time. req_max = ' + req_max + ', req_num = ' + req_num);
      if (req_num >= req_max) {
         console.log('Yeah I get here some time. req_max = ' + req_max + ', req_num = ' + req_num);
         global_res.end(JSON.stringify({count: number}));
      }
   });
}

function tree_checking (tree_res, current_repos) {
   var data = '';

   tree_res.on('data', function(chunk) {
      data += chunk;
   });

   tree_res.on('end', function() {
      tree = JSON.parse(data) ;
      //console.log(tree_res.headers +':' +tree) ;
      // Remove the repos from the total repos to check
      var flag_remove_repos = true ;
      // Look for a /LICENSE/ file
      for (var key in tree.tree) {
         //console.log(tree.tree[key].path);
         if (tree.tree[key].path.match(/LICENSE/)) {
            flag_remove_repos = false ;
            var license_opts = {
               host: 'raw.github.com',
      path: '/' + user + '/' + current_repos + '/master/' + tree.tree[key].path,
      method: 'GET'
            };

            console.log(license_opts.path) ;

            var license_req = https.request(license_opts, function(license_res) {
               license_checking(license_res, current_repos) ;
            }) ;
            license_req.end();
         }
      }
      if (flag_remove_repos) {
         req_max--;
         console.log('Yeah I get here some time. req_max = ' + req_max + ', req_num = ' + req_num);
         if (req_num >= req_max) {
            console.log('Yeah I get here some time. req_max = ' + req_max + ', req_num = ' + req_num);
            global_res.end(JSON.stringify({count: number}));
         }
      }
   }) ;
}

function commit_checking (commit_res, current_repos) {
   var data = '';

   commit_res.on('data', function(chunk) {
      data += chunk;
   });

   commit_res.on('end', function() {
      commit = JSON.parse(data) ;
      //console.log(commit) ;
      // Now we can FINALLY get the tree
      //console.log(commit.commit.tree.url);
      var tree_url = url.parse(commit.commit.tree.url) ;
      var tree_opts = {
         host: tree_url.host,
      path: tree_url.pathname,
      method: 'GET'
      };

      var tree_req = https.request(tree_opts, function(tree_res) {
         tree_checking(tree_res, current_repos) ;
      }) ;
      tree_req.end();
   });
}

function branche_checking (branche_res, current_repos) {
   var data = '';
   branche_res.on('data', function(chunk) {
      data += chunk;
   });

   branche_res.on('end', function(){
      //console.log('Test if a master branch is here') ;
      branches = JSON.parse(data);
      var flag_remove_repos = true ;
      for(var key in branches) {
         // If the branch is the master branch, we need to go deeper
         if (branches[key].name == "master") {
            flag_remove_repos = false ;
            var commit_url = url.parse(branches[key].commit.url) ;
            var commit_opts = {
               host: commit_url.host,
      path: commit_url.pathname,
      method: "GET"
            }
            //Get the tree structure
            var commit_req = https.request(commit_opts, function(commit_res) {
               commit_checking(commit_res, current_repos) ;
            });
            commit_req.end();
         }
      }
if (flag_remove_repos) {
         req_max--;
         console.log('Yeah I get here some time. req_max = ' + req_max + ', req_num = ' + req_num);
         if (req_num >= req_max) {
            console.log('Yeah I get here some time. req_max = ' + req_max + ', req_num = ' + req_num);
            global_res.end(JSON.stringify({count: number}));
         }
      }
   });
}

function repos_checking(repos_res) {
   var data = "" ;
   repos_res.setEncoding('utf8');
   // get the chunk
   repos_res.on('data', function (chunk) {
      //console.log('Receive chunk');
      data += chunk;
   });
   // handle them
   repos_res.on('end',function() {
      //console.log('Print repos');
      repos = JSON.parse(data);
      // Go throught the array of repos
      req_max = repos.length ;

      for (var key in repos) {
         // The repos is a fork, we have one less repos to verify !
         if ( repos[key].fork ) {
            req_max--;
               console.log('Yeah I get here some time. req_max = ' + req_max + ', req_num = ' + req_num);
            if (req_num >= req_max) {
               console.log('Yeah I get here some time. req_max = ' + req_max + ', req_num = ' + req_num);
               global_res.end(JSON.stringify({count: number}));
            }
         }
         // Loop on the original repos
         else {
            // parse the url of the repos
            var repos_url = url.parse(repos[key].url) ;
            // opts to get the branch
            var branche_opts = {
               host: repos_url.host,
               path: repos_url.pathname + "/branches",
               method: "GET"
            };
            // Request the branch detail of the repos
            //console.log('Launch branches requests');
            (function(repos_name){
               var branch_req = https.request(branche_opts, function(branche_res) {
                  branche_checking(branche_res, repos_name) ;
               });
               branch_req.end();
            })(repos[key].name) ;
         }
      }
   });
}

app.get('/:user', function(req, res) {
   // res.writeHead(200, {'Content-Type': 'text/plain'});
   global_res = res ;
   user = req.params.user ;
   req_num = 0;
   req_max = 0;
   number = 0;
   //res.write('Hello World! ' + user);
   var repos ;
   console.log('Set opts');
   var repos_opts = {
      host: gapi,
path: '/users/'+user+'/repos',
method: "GET"
   };
   console.log('Launch repos requests');
   var repos_req = https.request(repos_opts, repos_checking );
   repos_req.end();
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
   console.log("Listening on " + port);
});
