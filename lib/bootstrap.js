var program = require('commander');
var util = require('./util');

util.setSudoGid();
program
	.command('run <main>')
	.action(function (main) {
		main = require(main);
		if (typeof main == 'function') {
			main(util.parseJSON(program.data, true));
		}
	});

program
	.option('-d, --data [data]', 'data', String, null)
	.parse(process.argv);

	

