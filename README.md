# yunjiang.xin

这是一个文档类型的静态页面站点项目，主要记录心理学相关基础知识。
文档主要由Markdown格式编写，使用git进行版本管理，编者可专注内容撰写，撰写记录可查。

访问地址：[yunjiang.xin](https://yunjiang.xin)

### 项目初始化和运行

项目依赖NodeJS和git，本地运行需要先安装NodeJS和git。

运行项目：
1. git clone https://github.com/yunjiangxin/yunjiang.xin.git
2. npm install
3. npm install -g gulp-cli
4. gulp

项目启动后，会自动打开默认浏览器访问：http://localhost:9602/

编译：
gulp build
执行上述命令后，会将站点文件输出到项目的/build/yunjiang.xin/目录
gulp gh_deploy 命令用于将站点内容发布到github.io

### 源代码目录结构说明

/src/opus/ 文章目录
/src/opus/theory/ 基础理论文章目录
/src/opus/technic/ 实操技能文章目录
/src/opus/insight/ 内观文章目录
/src/opus/practice/ 格物文章目录

/src/views/ 站点页面目录
/src/templates/ 模板目录

/src/images/ 图片目录
/src/images/opus/ 文章图片目录
/src/js/ 脚本目录
/src/css/ 样式目录

/build/dev/ 调试文件夹
/build/yunjiang.xin/ 发布文件夹

### 文章以及目录排序

- 目录（文件夹）以自身文件夹下的index.json文件为准，其中order字段为排序字段，越小越靠前，name字段为目录名称。
- 文章（Markdown文件）以自身文件名（如：1.文章标题.md）为准，文件名的开头数字即为排序，没有数字的文件排在后面。

### 贡献指南

请联系：antield[at]126.com
