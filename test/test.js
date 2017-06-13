var http = require('http');

/*eslint no-console: "off"*/
module.exports = function init(options) {
  var port = options.port || 9999;
  http.createServer(function(req, res) {
    res.end('Congratulations on the successful starting!!!');
  }).listen(port, function() {
    console.log('visit: http://localhost' + (port == 80 ? '' : ':' + port) + '/');
  });
};