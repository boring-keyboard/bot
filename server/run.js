const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

function checkInit(callback) {
    if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
        const installProcess = execFile('npm', ['install'], (error, stdout, stderr) => {

        });
        installProcess.stdout.pipe(process.stdout);
        installProcess.stderr.pipe(process.stderr);

        // 退出时执行后续操作
        installProcess.on('exit', () => {
            callback();
        });
    } else {
        callback();
    }
}

function checkCQHttp(callback) {
    // 检测是否install完成
    const isInstalled = fs.existsSync(path.join(__dirname, 'go-cqhttp'));
    if (!isInstalled) {
        const installProcess = execFile('node', ['install.js'], (error, stdout, stderr) => {

        });
        installProcess.stdout.pipe(process.stdout);
        installProcess.stderr.pipe(process.stderr);
        // 退出时执行后续操作
        installProcess.on('exit', () => {
            callback();
        });
    } else {
        callback();
    }
}

function startupCqhttp() {

    // 如果没有groups.txt创建一个
    if (!fs.existsSync(path.join(__dirname, 'groups.txt'))) {
        fs.writeFileSync(path.join(__dirname, 'groups.txt'), '');
    }
    const groups = fs.readFileSync(path.join(__dirname, 'groups.txt'), 'utf-8').split('\n').map((group) => parseInt(group.trim(), 10)).filter((group) => group);
    if (groups.length > 0) {
        const filter = require('./go-cqhttp/filter.json');
        filter['.or'][0]['group_id']['.in'] = groups;
        fs.writeFileSync(path.join(__dirname, 'go-cqhttp/filter.json'), JSON.stringify(filter, null, 2));
    }

    const options = {
        cwd: path.join(__dirname, 'go-cqhttp'),
    };

    const childProcess = execFile('./go-cqhttp', [], options, (error, stdout, stderr) => {

    });

    childProcess.stdout.pipe(process.stdout);
    childProcess.stderr.pipe(process.stderr);

    require('./ws');
}

checkInit(() => {
    checkCQHttp(() => {
        startupCqhttp();
    });
});