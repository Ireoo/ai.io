const fs = require('fs');
const os = require("os");
const { spawn, exec, execSync } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const md5 = crypto.createHash("md5");
const log4js = require('log4js');
const email = require('./libs/email');

// 日志记录
if (!fs.existsSync(path.join(__dirname, `logs`))) {
    fs.mkdirSync(path.join(__dirname, `logs`));
}
log4js.configure({
    appenders: [{
        type: 'console' // 控制台输出
    }, {
        type: 'dateFile', // 文件输出
        filename: path.join(__dirname, `logs/`), // 需要手动创建此文件夹
        pattern: "yyyy-MM-dd.log",
        alwaysIncludePattern: true,
        maxLogSize: 1024,
        backups: 4, // 日志备份数量，大于该数则自动删除
        category: 'debug' // 记录器名  
    }],
    replaceConsole: true // 替换 console.log
});
debug = log4js.getLogger('debug');

// 加载队列模块
const Queue = require('promise-queue-plus');
var MaxQ = 1000;
const Q = new Queue(MaxQ, {
    "retry": 0,
    "retryIsJump": false,
    "timeout": 0,
    "event_succ": function (data) {
        // console.log(data);
        console.log(`queue-success: ${data.pid}; data: ${JSON.stringify(data.spawnargs)}`);
    },
    "event_err": function (err) {
        console.error('queue-error:', err);
    }
});

setInterval(function () {
    Q.go(build);
    // console.log(JSON.stringify({ code: c, str: str }));
}, 1);

function run(file, code) {
    let c = path.join(__dirname, `code/${file}.c`);
    let exe = path.join(__dirname, `exe/${file}`);
    let run = spawn(exe);
    let str = '';
    let err = '';

    run.stdout.on('data', (data) => {
        debug.wran(`[${code.length}] say: ${data.toString()}`);
        str += data.toString();
        email(`[${code.length}] say something in AI`, code, data.toString(), function () {
            console.log('[${file}] Send email is OK!');
        });
    });

    run.stderr.on('data', (data) => {
        console.error(`[${code.length}] error: ${data.toString()}`);
        err += data.toString();
        email(`[${code.length}] say something with error in AI`, code.str, data.toString(), function () {
            console.log('[${file}] Send email is OK!');
        });
    });

    run.on('close', (data) => {
        console.log(`[${code.length}] child process exited with code ${data}`);
        if (err !== '' || str === '') {
            if (fs.existsSync(c)) fs.unlinkSync(c);
            if (fs.existsSync(exe)) fs.unlinkSync(exe);
        } else if (str !== '') {
            debug.wran(`[${code.length}] exit; All say: ${data.toString()}`);
        }
    });
}

function build() {
    let str = getCode();

    let file = crypto.createHash('md5').update(str).digest('hex').toUpperCase(); //32位大写 

    if (!fs.existsSync(require('path').join(__dirname, "code"))) {
        fs.mkdir(require('path').join(__dirname, "code"));
    }
    fs.writeFile(path.join(__dirname, `code/${file}.c`), `#include <stdio.h>

int main()
{
    ${str}
    return 0;
}`, (err) => {
            if (!err) {
                if (!fs.existsSync(require('path').join(__dirname, "exe"))) {
                    fs.mkdir(require('path').join(__dirname, "exe"));
                }
                exec(`gcc ${path.join(__dirname, `code/${file}.c`)} -o ${path.join(__dirname, `exe/${file}`)}`, (err, stdout, stderr) => {
                    if (!err) {
                        if (fs.existsSync(path.join(__dirname, `exe/${file}`))) {
                            // console.log(`[${str.length}] ${file} Compile successfully!`);
                            run(file, str);
                        } else {
                            // console.log(`[${str.length}] ${file} Compile failure!`);
                            if (fs.existsSync(require('path').join(__dirname, `code/${file}.c`))) fs.unlinkSync(path.join(__dirname, `code/${file}.c`));
                        }
                    } else {
                        // console.error(stderr);
                        console.error(`[${str.length}] ${file} Compile error!`);
                        if (fs.existsSync(require('path').join(__dirname, `code/${file}.c`))) fs.unlinkSync(path.join(__dirname, `code/${file}.c`));
                    }
                });
            }
        });
}

function getCode() {
    let s = '', str = '', i = 0;

    while (s !== ';' || (s === ';' && i !== 1)) {

        s = String.fromCharCode(Math.floor(Math.random() * 128));
        if (s === ';') i = Math.floor(Math.random() * 2);
        str += s;
        // console.log(str);
        if (/^#/.test(str)) str = '';
    }

    return str;
}