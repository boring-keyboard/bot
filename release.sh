#!/bin/bash

# 修改manifest.json中的版本号
sed -i '' 's/"version": ".*"/"version": "'$1'"/g' manifest.json

# 修改popup.html中的<span id="version"></span>的版本号
sed -i '' 's/<span id="version">.*<\/span>/<span id="version">'$1'<\/span>/g' popup.html

# 读取groups.txt中的内容缓存再内存中
groups=$(cat server/groups.txt)
# 清空groups.txt
echo -n > server/groups.txt

# 压缩成zip并已bot-{版本号}命名
zip -r releases/bot-$1.zip . -x ".*" -x "__MACOSX" -x "release.sh" -x "builddoc.js" -x "*node_modules/*" -x "releases/*" -x package.json -x package-lock.json -x "*.DS_Store" -x "使用*" -x "server/go-cqhttp*"

# 写回groups.txt
echo $groups > server/groups.txt


