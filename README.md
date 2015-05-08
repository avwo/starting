# starting
command line script
#Installation
	$ npm install starting
#Example
	see test or bin dir
#Usage

  	starting help

#API Reference
1. 配置项目启动参数: `program.setConfig(config)`

> `config.main`: [string || function] 启动后自动执行，并自动传入命令行的options参数对象

> `config.version`: [string || function] 项目版本号

> `config.name`: [string || function] 项目名称，用于显示命令行帮助

> `config.running`: [string || function(`options`)] 启动参数存放的文件路径

> `config.log`:  [string || function(`options`)] 运行时错误日志存放路径

> `config.runCallback`:  [function] 运行run命令后的回调

> `config.startCallback`:  [function(`alreadyInRunning`)] 运行run命令后的回调

> `config.restartCallback`:  [function] 运行run命令后的回调

> `config.stopCallback`:  [function(`err | true | undefined`)] 运行run命令后的回调

2. 设置项目命令行参数: `var program = require('starting')`

	参考[commander](https://github.com/tj/commander)的命令行参数设置方式。

3. 自定义命令行启动器： `var cli = require('starting').cli` 	   

	参考[starting](https://github.com/avwo/starting/blob/master/bin/starting.js)的实现
