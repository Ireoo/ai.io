const fs = require("fs");
const os = require("os");
const { spawn, exec, execSync } = require("child_process");
const path = require("path");
const crypto = require("crypto");
const md5 = crypto.createHash("md5");
const log4js = require("log4js");

// 日志记录
if (!fs.existsSync(path.join(process.cwd(), `logs`))) {
    fs.mkdirSync(path.join(process.cwd(), `logs`));
}
log4js.configure({
    appenders: [{
            type: "console" // 控制台输出
        },
        {
            type: "dateFile", // 文件输出
            filename: path.join(process.cwd(), `logs/`), // 需要手动创建此文件夹
            pattern: "yyyy-MM-dd.log",
            alwaysIncludePattern: true,
            maxLogSize: 1024,
            backups: 4, // 日志备份数量，大于该数则自动删除
            category: "debug" // 记录器名
        }
    ],
    replaceConsole: true // 替换 console.log
});
debug = log4js.getLogger("debug");

(async() => {
    while (1) {
        try {
            let str = getCode();
            let file = crypto
                .createHash("md5")
                .update(str)
                .digest("hex")
                .toUpperCase(); //32位大写
            // console.log("[file] ->", file);
            if (await save(file, str)) {
                let result_build = await build(file);
                if (result_build) {
                    let result_run = await run(file);
                }
            }
        } catch (e) {
            //console.log(e);
        }
    }
})();

function run(file) {
    return new Promise((res, req) => {
        let c = path.join(process.cwd(), `code/${file}.c`);
        let exe = path.join(process.cwd(), `exe/${file}`);
        let run = spawn(exe);
        let str = "";
        let err = "";

        run.stdout.on("data", data => {
            debug.wran(`[${file}] say: ${data.toString()}`);
            str += data.toString();
            // email(`[${code.length}] say something in AI`, code, data.toString(), function () {
            // console.log('[${file}] Send email is OK!');
            // });
        });

        run.stderr.on("data", data => {
            console.error(`[${file}] error: ${data.toString()}`);
            err += data.toString();
            // email(`[${code.length}] say something with error in AI`, code.str, data.toString(), function () {
            //     console.log('[${file}] Send email is OK!');
            // });
        });

        run.on("close", data => {
            console.log(`[${file}] child process exited with code ${data}`);
            if (err !== "" || str === "") {
                if (fs.existsSync(c)) fs.unlinkSync(c);
                if (fs.existsSync(exe)) fs.unlinkSync(exe);
                res(false);
            } else if (str !== "") {
                debug.wran(`[${file}] exit; All say: ${data.toString()}`);
                res({ success: str, error: err });
            }
        });
    });
}

function save(file, code) {
    return new Promise((res, req) => {
        if (!fs.existsSync(require("path").join(process.cwd(), "code"))) {
            fs.mkdir(require("path").join(process.cwd(), "code"));
        }
        let str = `#include <stdio.h>

int main()
{
    ${code}
    return 0;
}`;
        fs.writeFile(path.join(process.cwd(), `code/${file}.c`), str, err => {
            if (!err) {
                if (!fs.existsSync(require("path").join(process.cwd(), "exe"))) {
                    fs.mkdir(require("path").join(process.cwd(), "exe"));
                }
                res(true);
            } else {
                res(false);
            }
        });
    });
}

function build(file) {
    return new Promise((res, req) => {
                // 计算与上一次时间差
                let startTime = new Date().getTime();
                exec(
                        `gcc -O0 ${path.join(process.cwd(), `code/${file}.c`)} -o ${path.join(
        process.cwd(),
        `exe/${file}`
      )}`,
      (err, stdout, stderr) => {
        let timer = new Date().getTime() - startTime;
        if (!err) {
          if (fs.existsSync(path.join(process.cwd(), `exe/${file}`))) {
            // console.log(`[${file}] ${file} Compile successfully!`);
            // run(file, str);
            res(true);
          } else {
            if (
              fs.existsSync(
                require("path").join(process.cwd(), `code/${file}.c`)
              )
            )
              fs.unlinkSync(path.join(process.cwd(), `code/${file}.c`));
            res(false);
            // console.log(`[${file}] ${file} Compile failure!`);
          }
        } else {
          // console.error(stderr);
          // console.error(`[${file}][${timer}MS] error!`);
          if (
            fs.existsSync(require("path").join(process.cwd(), `code/${file}.c`))
          )
            fs.unlinkSync(path.join(process.cwd(), `code/${file}.c`));
          req(stderr);
        }
      }
    );
  });
}

function getCode() {
  let s = "",
    str = "",
    i = 0;
  while (s !== ";" || (s === ";" && i !== 1)) {
    s = String.fromCharCode(Math.floor(Math.random() * 128));
    if (s === ";") i = Math.floor(Math.random() * 2);
    str += s;
    // console.log(str);
    if (/^#/.test(str)) str = "";
    if (s === ";" && i === 1 && str === ";") {
      i = 0;
      str = "";
    }
  }
  return str;
}
