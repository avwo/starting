var program = require('commander');
var util = require('./util');

util.setSudoGid();
program
	.command('run <main>')
	.action(function (main) {
		require(main)(util.parseJSON(decodeURIComponent(program.data), true));
	});

program
	.option('-d, --data [data]', 'data', String, null)
	.parse(process.argv);

	

