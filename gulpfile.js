import markdown from 'gulp-markdown';
import { marked } from 'marked';
import { src, dest, watch, series, parallel } from 'gulp';
import cleanCSS from 'gulp-clean-css';
import FileInclude from 'gulp-file-include';
import WebServer from 'gulp-webserver';
import Clean from 'gulp-clean';
import webpack from 'webpack';
import gulpWebpack from 'webpack-stream';
import path from 'path';
import named from 'vinyl-named';
import through2 from 'through2';
import fs from 'fs/promises';
import Webpack_Config_Prod from './webpack.prod.js';
import Webpack_Config_Dev from './webpack.dev.js';
import ghpages from 'gh-pages';
import { log } from 'console';

const pkg = {
  "name": "yunjiang.xin",
  "port": 9602,
  "host": "localhost",
  "htmlIndex": "index.html"
};
const STRAT_PAGE = "http://" + pkg.host + ":" + pkg.port + "/" + pkg.htmlIndex;

const Dist_Prod = 'build/' + pkg.name;
const Dist_Dev = 'build/dev';
var Dist = Dist_Dev;
var Webpack_Config = Webpack_Config_Dev;

function watch_task(cb) {
  watch(['src/view/**/*.html', 'src/include/*'], copy_html);
  watch('src/js/compile-less/**', copy_js_compile_less);
  watch('src/js/lib/**', copy_js_lib);
  watch('src/css/*', copy_css);
  watch('src/css/lib/**', copy_css_lib);
  //watch('src/images/**', copy_images);
  watch(['src/js/main/**/*.js', 'src/js/module/*', 'src/js/part/*'], compile_js);
  cb();
}

function web_server() {
  return src(Dist).pipe(WebServer({
    port: pkg.port,
    host: pkg.host,
    livereload: true,
    open: STRAT_PAGE,
  }));
}

function injectOpusFileContent(templateContent) {
  return through2.obj(async function (file, enc, cb) {
    let outputContent = templateContent;
    outputContent = await injectArticleBreadcrumb(outputContent, file);
    const fileName = file.basename;
    const nameStem = fileName.substring(0, fileName.lastIndexOf("."));
    let title;
    if (/^\d+\./.test(nameStem)) {
      const pos = nameStem.indexOf(".");
      title = nameStem.substring(pos + 1);
    } else {
      title = nameStem;
    }
    outputContent = outputContent.replaceAll('<!-- @@title -->', title);
    outputContent = outputContent.replace('<!-- @@content -->', file.contents.toString());
    file.contents = Buffer.from(outputContent);
    file.extname = '.html';
    cb(null, file);
  });
}

async function injectArticleBreadcrumb(outputContent, file) {
  const dirname = file.dirname;
  const opusRoot = path.join(file.cwd, 'src/opus');
  if (!dirname.startsWith(opusRoot) || dirname == opusRoot)
    return outputContent;

  const breadcrumbHtmlArr = [];
  let currentDir = dirname;
  const endHref = "./";
  let upHref = "../";
  let num = 0;
  do {
    let folderName = currentDir.substring(currentDir.lastIndexOf(path.sep) + 1);
    let jsonPath = path.join(currentDir, 'index.json');
    try {
      await fs.access(jsonPath);
      const contentStr = await fs.readFile(jsonPath);
      const folderObj = JSON.parse(contentStr);
      folderName = folderObj.name || folderName;
    } catch (e) {
      console.log("parse folderInfo error: " + e);
    }
    if (num > 1)
      upHref = upHref + "../";
    let href = num == 0 ? endHref : upHref;
    let html = '<a href="' + href + '"><span>' + folderName + '</span></a>';
    breadcrumbHtmlArr.push(html);
    currentDir = currentDir.substring(0, currentDir.lastIndexOf(path.sep));
    num++;
  } while (currentDir != opusRoot);
  breadcrumbHtmlArr.reverse();
  const breadcrumbHtml = breadcrumbHtmlArr.join("");
  outputContent = outputContent.replace('<!-- @@breadcrumb -->', breadcrumbHtml);

  return outputContent;
}

async function injectFolderBreadcrumb(outputContent, file) {
  const dirname = file.dirname;
  const opusRoot = path.join(file.cwd, 'src/opus');
  if (!dirname.startsWith(opusRoot) || dirname == opusRoot)
    return outputContent;

  const breadcrumbHtmlArr = [];
  let currentDir = dirname;
  let upHref = "../";
  let num = 0;
  do {
    let folderName = currentDir.substring(currentDir.lastIndexOf(path.sep) + 1);
    if (num == 0) {
      const folderObj = JSON.parse(file.contents.toString());
      folderName = folderObj.name || folderName;
    } else {
      let jsonPath = path.join(currentDir, 'index.json');
      try {
        await fs.access(jsonPath);
        const contentStr = await fs.readFile(jsonPath);
        const folderObj = JSON.parse(contentStr);
        folderName = folderObj.name || folderName;
      } catch (e) {
        console.log("parse folderInfo error: " + e);
      }
    }
    if (num > 1)
      upHref = upHref + "../";
    let html;
    if (num == 0)
      html = '<span>' + folderName + '</span>';
    else
      html = '<a href="' + upHref + '"><span>' + folderName + '</span></a>';
    breadcrumbHtmlArr.push(html);
    currentDir = currentDir.substring(0, currentDir.lastIndexOf(path.sep));
    num++;
  } while (currentDir != opusRoot);
  breadcrumbHtmlArr.reverse();
  const breadcrumbHtml = breadcrumbHtmlArr.join("");
  outputContent = outputContent.replace('<!-- @@breadcrumb -->', breadcrumbHtml);

  return outputContent;
}

export async function copy_opus_article() {
  const opus_article_template = 'src/template/opus-article.htm';
  const opusArticleTemplateContent = await fs.readFile(opus_article_template, 'utf8');
  return src('src/opus/**/*.md')
    .pipe(markdown())
    .pipe(injectOpusFileContent(opusArticleTemplateContent))
    .pipe(FileInclude({
      prefix: '<!--%',
      suffix: '%-->',
      basepath: '@root'
    }))
    .on('error', function (err) {
      console.error('error: copy_opus_article: ' + err.message);
      process.exit(1);
    })
    .pipe(dest(Dist));
}


function injectOpusFolderContent(templateContent) {
  return through2.obj(async function (file, enc, cb) {
    let outputContent = templateContent;
    outputContent = await injectFolderBreadcrumb(outputContent, file);
    const jsonStr = file.contents.toString();
    let folderInfo;
    try {
      folderInfo = JSON.parse(jsonStr);
    } catch (e) {
      console.log("parse folderInfo error: " + e);
      folderInfo = {};
    }
    const title = folderInfo.name || file.dirname.substring(file.dirname.lastIndexOf(path.sep) + 1);
    outputContent = outputContent.replace('<!-- @@title -->', title);

    const topEmdFile = path.join(file.dirname, 'top.emd');
    let topContent;
    try {
      await fs.access(topEmdFile);
      topContent = await fs.readFile(topEmdFile, 'utf8');
      topContent = "<section id=\"topContent\">\n" + topContent + "</section>\n"
    } catch (e) {
      if (e.code != 'ENOENT') {
        console.log("parse topContent error: ", e);
      }
      topContent = "";
    }
    const summaryEmdFile = path.join(file.dirname, 'summary.emd');
    let summaryContent;
    try {
      await fs.access(summaryEmdFile);
      const mdContent = await fs.readFile(summaryEmdFile, 'utf8');
      summaryContent = marked.parse(mdContent);
      summaryContent = "<section id=\"summaryContent\">\n" + summaryContent + "</section>\n"
    } catch (e) {
      if (e.code != 'ENOENT') {
        console.log("parse summaryContent error: ", e);
      }
      summaryContent = "";
    }
    outputContent = outputContent.replace('<!-- @@topContent -->', topContent + summaryContent);

    const folderArr = folderInfo.directories;
    folderArr.sort(function (a, b) {
      return a.order - b.order;
    });
    if (folderArr.length == 0) {
      const displayClassName = " displayNone";
      outputContent = outputContent.replace('@@foldersContentDisplayClass', displayClassName);
      outputContent = outputContent.replace('<!-- @@foldersContent -->', "");
    } else {
      const displayClassName = " displayBlock";
      outputContent = outputContent.replace('@@foldersContentDisplayClass', displayClassName);
      const folderArrLiHtml = folderArr.map(function (item) {
        return '<li><a href="' + item.customPath + '">' + item.name + '</a></li>\n';
      });
      const folderArrUlHtml = '<section id=\"folderMenu\"><h3>栏目</h3><ul class="folder-list">\n' + folderArrLiHtml.join('') + '</ul></section>\n';
      outputContent = outputContent.replace('<!-- @@foldersContent -->', folderArrUlHtml);
    }

    const middleEmdFile = path.join(file.dirname, 'middle.emd');
    let middleContent;
    try {
      await fs.access(topEmdFile);
      middleContent = await fs.readFile(middleEmdFile, 'utf8');
      middleContent = "<section id=\"middleContent\">\n" + middleContent + "</section>\n"
    } catch (e) {
      if (e.code != 'ENOENT') {
        console.log("parse middleContent error: ", e);
      }
      middleContent = "";
    }
    outputContent = outputContent.replace('<!-- @@middleContent -->', middleContent);

    const fileArr = folderInfo.files;
    if (fileArr.length == 0) {
      const displayClassName = " displayNone";
      outputContent = outputContent.replace('@@articlesContentDisplayClass', displayClassName);
      outputContent = outputContent.replace('<!-- @@articlesContent -->', "");
    } else {
      const displayClassName = " displayBlock";
      outputContent = outputContent.replace('@@articlesContentDisplayClass', displayClassName);
      fileArr.sort(function (a, b) {
        return a.order - b.order;
      });
      const fileArrLiHtml = fileArr.map(function (item) {
        return '<li><a href="' + item.customPath + '">' + item.name + '</a></li>';
      })
      const fileArrUlHtml = '<section id=\"articleMenu\"><h3>文章</h3><ul class="article-list">\n' + fileArrLiHtml.join('') + '</ul></section>\n';
      outputContent = outputContent.replace('<!-- @@articlesContent -->', fileArrUlHtml);
    }

    const bottomEmdFile = path.join(file.dirname, 'bottom.emd');
    let bottomContent;
    try {
      await fs.access(bottomEmdFile);
      bottomContent = await fs.readFile(bottomEmdFile, 'utf8');
      bottomContent = "<section id=\"bottomContent\">\n" + bottomContent + "</section>\n"
    } catch (e) {
      if (e.code != 'ENOENT') {
        console.log("parse bottomContent error: ", e);
      }
      bottomContent = "";
    }
    outputContent = outputContent.replace('<!-- @@bottomContent -->', bottomContent);

    file.contents = Buffer.from(outputContent);
    file.extname = '.html';
    cb(null, file);
  });
}

export async function copy_opus_folder_index() {
  const opus_folder_template = 'src/template/opus-folder.htm';
  const templateContent = await fs.readFile(opus_folder_template, 'utf8');
  return src('src/opus/**/index.json')
    .pipe(injectOpusFolderContent(templateContent))
    .pipe(FileInclude({
      prefix: '<!--%',
      suffix: '%-->',
      basepath: '@root'
    }))
    .on('error', function (err) {
      console.error('error: copy_opus_folder_index: ' + err.message);
      process.exit(1);
    })
    .pipe(dest(Dist));
}

async function generateIndex(dirPath) {
  const fsItems = await fs.readdir(dirPath, { withFileTypes: true });

  const directories = [];
  const files = [];

  for (const item of fsItems) {
    if (item.isDirectory()) {
      const subDirJsonPath = path.join(item.parentPath, item.name, 'index.json');
      const subJsonStr = await readOrCreateFile(subDirJsonPath, '{}');
      let subDirJson;
      try {
        subDirJson = JSON.parse(subJsonStr);
      } catch (e) {
        console.log("parse subDirJson error: " + e);
        console.log(subDirJsonPath + ": " + subJsonStr);
        subDirJson = {};
      }
      const name = subDirJson.name || item.name;
      const customPath = subDirJson.customPath || item.name + '/';
      const order = subDirJson.order || 1;
      directories.push({
        name,
        customPath,
        order,
      });
    } else if (item.isFile()) {
      const itemName = item.name;
      if (itemName == "index.json")
        continue;

      if (itemName.endsWith(".md")) {
        const nameStem = itemName.substring(0, itemName.lastIndexOf("."));
        if (/^\d+\./.test(nameStem)) {
          const pos = nameStem.indexOf(".");
          const order = parseInt(nameStem.substring(0, pos));
          const name = nameStem.substring(pos + 1);
          const fileObj = {
            name,
            order,
            customPath: nameStem + ".html",
          };
          files.push(fileObj);
        } else {
          files.push({
            name: nameStem,
            customPath: nameStem + ".html",
            order: 99999999,
          });
        }
      }
    }
  }

  const indexPath = path.join(dirPath, 'index.json');
  const existContent = await readOrCreateFile(indexPath, '{}');
  let contentObj;
  try {
    contentObj = JSON.parse(existContent);
  } catch (e) {
    console.log("parse index.json error: " + e);
    contentObj = {};
  }
  contentObj.directories = directories;
  contentObj.files = files;
  const jsonContent = JSON.stringify(contentObj, null, 4);
  fs.writeFile(indexPath, jsonContent);
}

async function readOrCreateFile(filePath, defaultContent = '') {
  try {
    // 尝试读取文件内容
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (err) {
    if (err.code === 'ENOENT') {
      const dirPath = path.dirname(filePath);
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, defaultContent, 'utf8');
      return defaultContent;
    } else {
      console.error('error: readOrCreateFile: ' + err.message);
      throw err;
    }
  }
}

export function make_opus_index() {
  return src('src/opus/**/', { read: false })
    .pipe(through2.obj(async function (file, enc, cb) {
      const dirPath = file.path;
      await generateIndex(dirPath);
      cb();
    }));
}

function copy_html() {
  return src('src/view/**/*.html')
    .pipe(FileInclude({
      prefix: '<!--%',
      suffix: '%-->',
      basepath: '@file'
    }))
    .on('error', function (err) {
      console.error('error: copy_html: ' + err.message);
      process.exit(1);
    })
    .pipe(dest(Dist));
}

function compile_js() {
  return src('src/js/main/**/*.js')
    .pipe(named(function (file) {
      let fileRelative = file.relative;
      let extNameStart = fileRelative.lastIndexOf(".");
      let relativePathAndStem = fileRelative.substring(0, extNameStart);
      return relativePathAndStem;
    }))
    .pipe(gulpWebpack({
      config: Webpack_Config
    }, webpack))
    .pipe(dest(Dist + '/js'));
}

function copy_js_lib() {
  return src('src/js/lib/**').pipe(dest(Dist + '/js/lib'));
}

function copy_js_compile_less() {
  return src('src/js/compile-less/**').pipe(dest(Dist + '/js/compile-less'));
}

export function copy_css() {
  return src('src/css/*.css').pipe(cleanCSS()).pipe(dest(Dist + '/css'));
}

function copy_css_lib() {
  return src('src/css/lib/**', { encoding: false }).pipe(dest(Dist + '/css/lib'));
}

export function copy_images() {
  return src('src/images/**', { encoding: false }).pipe(dest(Dist + '/images'));
}

export function copy_deploy() {
  return src('src/deploy/**', { encoding: false }).pipe(dest(Dist));
}

var copy_sources = parallel(copy_css, copy_css_lib, copy_js_lib, copy_js_compile_less, copy_html, copy_opus_article, copy_images);

export function clean_task() {
  return src(Dist, {
    allowEmpty: true
  }).pipe(Clean());
}

const start = series(clean_task, copy_sources, copy_deploy, compile_js, web_server, watch_task, make_opus_index, copy_opus_folder_index);

function changeToProd(cb) {
  Dist = Dist_Prod;
  Webpack_Config = Webpack_Config_Prod;
  cb();
}

export const build = series(changeToProd, clean_task, copy_sources, copy_deploy, compile_js, make_opus_index, copy_opus_folder_index);

export const gh_deploy = (cb) => {
  ghpages.publish(Dist_Prod, (err) => {
    if (err) {
      console.error("gh_deploy error", err);
      return cb(err);
    }
    cb(null);
  });
};

export default start;
