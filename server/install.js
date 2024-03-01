const os = require('os');
const { execFile } = require('child_process');
const path = require('path');
const download = require('download');
const fs = require('fs');

// 获取当前操作系统类型
const platform = os.platform();

// 根据操作系统类型确定应该下载的包
let packageToDownload;
switch (platform) {
  case 'darwin':
    if (os.arch() === 'arm64') {
      packageToDownload = 'https://github.com/Mrs4s/go-cqhttp/releases/download/v1.2.0/go-cqhttp_darwin_arm64.tar.gz';
    } else {
      packageToDownload = 'https://github.com/Mrs4s/go-cqhttp/releases/download/v1.2.0/go-cqhttp_darwin_amd64.tar.gz';
    }
    break;
  case 'win32':
    if (os.arch() === 'x64') {
      packageToDownload = 'https://github.com/Mrs4s/go-cqhttp/releases/download/v1.2.0/go-cqhttp_windows_amd64.zip';
    } else {
      packageToDownload = 'https://github.com/Mrs4s/go-cqhttp/releases/download/v1.2.0/go-cqhttp_windows_386.zip';
    }
    break;
  default:
    console.error('Unsupported platform');
    process.exit(1);
}

console.log(`下载go-cqhttp ${platform}: ${packageToDownload}`);
// Download the package

const packageDir = path.join(__dirname, 'go-cqhttp');
// 执行下载
download(packageToDownload, packageDir, { extract: true }).then(() => {
  console.log('正在初始化配置');
  // 拷贝config.template.yml 到go-cqhttp目录下
  fs.copyFileSync(path.join(__dirname, 'config.template.yml'), path.join(packageDir, 'config.yml'));
  // 拷贝filter.tempalte.json 到go-cqhttp目录下
  fs.copyFileSync(path.join(__dirname, 'filter.template.json'), path.join(packageDir, 'filter.json'));

  const options = {
    // cwd: path.join(__dirname, 'go-cqhttp_darwin_amd64_1.2.0'),
    cwd: path.join(__dirname, 'go-cqhttp'),
  };

  const childProcess = execFile('./go-cqhttp', [], options, (error, stdout, stderr) => {

  });

  // childProcess.stdout.pipe(process.stdout);
  childProcess.stderr.pipe(process.stderr);

  // 监听标准输出，如果出现了“device.json”关键字则退出。考虑on('data')获取的数据可能不完整，获取换行符之前的数据
  let buffer = '';
  childProcess.stdout.on('data', (data) => {
    buffer += data;
    if (buffer.includes('device.json')) {
      // 注销监听
      childProcess.stdout.removeAllListeners('data');
      childProcess.kill();
      // 读取device.json文件, 重写protocol字段为3
      const deviceJsonPath = path.join(packageDir, 'device.json');
      const deviceJson = require(deviceJsonPath);
      deviceJson.protocol = 2;
      fs.writeFileSync(deviceJsonPath, JSON.stringify(deviceJson, null, 2));
      console.log('初始化配置完成');
    }
  });

}).catch((error) => {
  console.error('Failed to download the package');
  console.error(error);
  process.exit(1);
});
