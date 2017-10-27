const fs = require('fs');
const os = require("os");
const { spawn, exec, execSync } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const md5 = crypto.createHash("md5");
const log4js = require('log4js');
const email = require('./libs/email');

// 初始化内容
const initString = "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~!@#$%^&*()_+-=`'\"\\/><.,?!:;[]{}| \r\n";

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

// main
let code = {};
if (fs.existsSync(path.join(__dirname, `code.json`))) {
    try {
        code = JSON.parse(fs.readFileSync(path.join(__dirname, `code.json`)));
    } catch (e) {
        code = { code: [0], str: "1" };
    }
} else {
    code = { code: [0], str: "1" };
}

// for (let c = 0; c < 100; c++) {
setInterval(function () {
    getCode(function (str, c) {
        Q.go(build, [str, c]);
        // console.log(JSON.stringify({ code: c, str: str }));
    });
}, 1);

// setInterval(function () {

//     let cpus = os.loadavg();
//     if (cpus[0] < 8) {
//         MaxQ += 100;
//     } else {
//         MaxQ -= 100;
//     }
//     console.log(`Now threads: ${MaxQ}. ${JSON.stringify(cpus)}`);
//     Q.setMax(MaxQ);

// }, 1);


function run(file, code, cb = function () { }) {
    let c = path.join(__dirname, `code/${file}.c`);
    let exe = path.join(__dirname, `exe/${file}`);
    let run = spawn(exe);
    let str = '';
    let err = '';

    run.stdout.on('data', (data) => {
        debug.wran(`${JSON.stringify(code)} say: ${data.toString()}`);
        str += data.toString();
        email(`${JSON.stringify(code)} say something in AI`, code.str, data.toString(), function () {
            console.log('[${file}] Send email is OK!');
        });
    });

    run.stderr.on('data', (data) => {
        console.error(`${JSON.stringify(code)} error: ${data.toString()}`);
        err += data.toString();
        email(`${JSON.stringify(code)} say something with error in AI`, code.str, data.toString(), function () {
            console.log('[${file}] Send email is OK!');
        });
    });

    run.on('close', (data) => {
        console.log(`${JSON.stringify(code)} child process exited with code ${data}`);
        if (err !== '' || str === '') {
            if (fs.existsSync(c)) fs.unlinkSync(c);
            if (fs.existsSync(exe)) fs.unlinkSync(exe);
        } else if (str !== '') {
            debug.wran(`${JSON.stringify(code)} exit; All say: ${data.toString()}`);
        }
        cb(data);
    });
}

function build(str, c) {
    try {
        let file = crypto.createHash('md5').update(str).digest('hex').toUpperCase(); //32位大写 

        if (!fs.existsSync(require('path').join(__dirname, "code"))) {
            fs.mkdir(require('path').join(__dirname, "code"));
        }
        fs.writeFile(path.join(__dirname, `code/${file}.c`), `#include <stdio.h>

int main()
{
    ${str}
    return 0;
}`, function (err) {
                if (!err) {
                    if (!fs.existsSync(require('path').join(__dirname, "exe"))) {
                        fs.mkdir(require('path').join(__dirname, "exe"));
                    }
                    exec(`gcc ${path.join(__dirname, `code/${file}.c`)} -o ${path.join(__dirname, `exe/${file}`)}`, function (err, stdout, stderr) {
                        if (!err) {
                            if (fs.existsSync(path.join(__dirname, `exe/${file}`))) {
                                // console.log(`[${str.length}] ${file} Compile successfully!`);
                                run(file, { str: str, code: c });
                            } else {
                                // console.log(`[${str.length}] ${file} Compile failure!`);
                                if (fs.existsSync(require('path').join(__dirname, `code/${file}.c`))) fs.unlinkSync(path.join(__dirname, `code/${file}.c`));
                            }
                        } else {
                            // console.error(stderr);
                            // console.error(`[${str.length}] ${file} Compile error! Error code: ${JSON.stringify({ code: c, str: str })}`);
                            if (fs.existsSync(require('path').join(__dirname, `code/${file}.c`))) fs.unlinkSync(path.join(__dirname, `code/${file}.c`));
                        }
                        fs.writeFileSync(path.join(__dirname, `code.json`), JSON.stringify({ code: c, str: str }));
                    });
                }
            });
    } catch (e) {
        console.log(e);
    }
}

function getCode(cb) {
    if (!code) code = {
        code: [0],
        str: '1'
    };

    code.code[code.code.length - 1]++;
    for (let a = code.code.length - 1; a >= 0; a--) {
        if (code.code[a] >= initString.length) {
            if (a !== 0) {
                code.code[a] = 0;
                code.code[a - 1]++;
            } else {
                for (let b = 0; b < code.code.length; b++) {
                    code.code[b] = 0;
                }
                code.code.push(0);
            }
        }
    }

    let c = [];
    for (let w = 0; w < code.code.length; w++) {
        c.push(code.code[w]);
    }

    let str = '';
    for (let w = 0; w < code.code.length; w++) {
        str += initString[code.code[w]];
    }

    code.str = str;

    cb(str, c);
}

// process.on('exit', function () {
//     fs.writeFileSync(path.join(__dirname, `code.json`), JSON.stringify(code));
//     console.log('exit');
// });