var express = require('express');
var https = require('https');

var gapi = 'api.github.com';

var app = express.createServer(express.logger());

app.get('/:user', function(req, res) {
   // res.writeHead(200, {'Content-Type': 'text/plain'});
   user = req.params.user ;
   var req_num = 0;
   var req_max = 0;
   var number = 0;
   //res.write('Hello World! ' + user);
   var repos ;
   console.log('Set options');
   var repos_opts = {
      host: gapi,
   path: '/users/'+user+'/repos',
   method: "GET"
   };
   console.log('Launch repos requests');
   var repos_req = https.request(repos_opts, function(repos_res) {
      var data = "" ;
      repos_res.setEncoding('utf8');
      // get the chunk
      repos_res.on('data', function (chunk) {
         console.log('Receive chunk');
         data += chunk;
      });
      // handle them
      repos_res.on('end',function() {
         console.log('Print repos');
         repos = JSON.parse(data);
         //res.writeHead(200, {'Content-Type': 'text/plain'});
         //res.end(repos) ;
         //res.end(JSON.stringify(repos));
         // Go throught the array and get the branch of the repos
         req_max = repos.length ;
         for (var key in repos) {
            // Option to get the branch
            var branche_opts = {
               host: gapi,
         path: '/repos/'+user+'/'+repos[key].name+'/branches',
         method: "GET"
            };
            // Request the branch
            console.log('Launch branches requests');
            var branch_req = https.request(branche_opts, function(branche_res) {
               var data = '';
               branche_res.on('data', function(chunk) {
                  data += chunk;
               });

               branche_res.on('end', function(){
                  branches = JSON.parse(data);
                  for(var key in branches) {
                     if (branches[key].name == "master") {
                        number++;
                     }
                  }
                  req_num++;
                  if (req_num >= req_max) {
                     res.end(JSON.stringify({master: number}));
                  }
               });
            });
            branch_req.end()
         }
      });
   });
   repos_req.end();
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
   console.log("Listening on " + port);
});
