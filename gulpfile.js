'use strict';

var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var del = require('del');
var fs = require('fs');
var gulp = require('gulp');
var gutil = require('gulp-util');
var jasmine = require('gulp-jasmine');
var rename = require("gulp-rename");
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var tsconfig = require('./tsconfig.json');
var tsify = require('tsify');
var typescript = require('gulp-typescript');
var uglify = require('gulp-uglify');
var watch = require('gulp-watch');

var paths = {
  srcMain : 'src/main/resources',
  srcTest : 'src/test/resources',
  targetMain : 'target/classes',
  targetTest : 'target/test-classes'
};

paths.srcMainMainTs = concatPath(paths.srcMain, 'js', 'main.ts');
paths.srcMainJsDir = concatPath(paths.srcMain, 'js');
paths.srcMainAllJs = concatPath(paths.srcMainJsDir, '**', '*.js');
paths.srcMainAllTs = concatPath(paths.srcMainJsDir, '**', '*.ts');
paths.srcMainAllResources = concatPath(paths.srcMain, '**', '*');
paths.srcMainAllJsMap = concatPath(paths.srcMain, '**', '*.js.map');
paths.srtTestAllSpecTs = concatPath(paths.srcTest, '**', '*.spec.ts');
paths.srcTestAllJs = concatPath(paths.srcTest, '**', '*.js');
paths.srcTestAllJsMap = concatPath(paths.srcTest, '**', '*.js.map');
paths.copiedResoucesDir = paths.targetMain;
paths.bundledJsOutDir = paths.srcMainJsDir;
paths.bundledJsOutName = 'app.js';

// デフォルトのタスク
gulp.task('default', ['build']);
// ビルドを行うタスク
gulp.task('build', ['_copyAllResources']);
// *.jsや*.js.mapファイルを削除するタスク
gulp.task('clean', () => {
  del([paths.srcMainAllJs, paths.srcMainAllJsMap,
    paths.srcTestAllJs, paths.srcTestAllJsMap]);
});
gulp.task('test', ['_testTs']);
// ファイルの変更を検知してビルドを行うタスク
// NOTE: *.tsが変更された場合まず'_testTs'が検知して処理を行い、
//       その成果物の変更を検知して'_watchExceptTs'が
gulp.task('watch', ['_watchExceptTs']);

// *.tsファイルのトランスパイルと実行時依存性解決を行うタスク
// NOTE: この実行に先立ち'_testTs'が実行される
gulp.task('_bundleTs', _bundleTsTask());
// リソースをターゲット・ディレクトリ（例：'target/classes'）にコピーするタスク
// NOTE: ディレクトリが存在しない場合は何も行わない
gulp.task('_copyAllResources', ['_bundleTs'], () => {
  if (fs.existsSync(paths.targetMain)) {
    gulp.src(paths.srcMainAllResources)
    .pipe(gulp.dest(paths.copiedResoucesDir));
  }
});
// *.tsファイルのトランスパイルだけを行うタスク
// NOTE: '_bundleTs'と異なりこのタスクは実行時依存性の解決を行わない
gulp.task('_xpileTs', () => {
  return gulp.src(paths.srcMainAllTs)
    .pipe(typescript(tsconfig.compilerOptions))
    .pipe(gulp.dest(paths.srcMainJsDir));
});
// *.spec.tsファイルに記述されたテストを実行するタスク
gulp.task('_testTs', ['_xpileTs'], () => {
  return gulp.src(paths.srtTestAllSpecTs)
    .pipe(typescript(tsconfig.compilerOptions))
    .pipe(gulp.dest(paths.srcTest))
    .pipe(jasmine());
});
// *.tsファイル以外の変更を検知してコピーを実行するタスク
gulp.task('_watchExceptTs', ['_watchTs'], () => {
  var w = watch([
    paths.srcMainAllResources,
    '!' + paths.srcMainAllTs
  ]).on('change', gutil.log);

  if (fs.existsSync(paths.targetMain)) {
    return w.pipe(gulp.dest(paths.copiedResoucesDir));
  } else {
    return w;
  }
});
// *.tsファイルの変更を検知してトランスパイルと実行時依存性解決を行うタスク
// NOTE: ビルド処理は'_bundleTs'と同じ設定で行われる
gulp.task('_watchTs', ['_copyAllResources'], () => {
  var w = watch([
    paths.srcMainAllTs
  ], _bundleTsTask(true)).on('change', gutil.log);
});

function _bundleTsTask (watchMode) {
  // タスク本体となる関数を生成して呼び出し元に返す
  return () => {
    // Browserifyのインスタンスを初期化する
    // Tsifyプラグインを追加する
    var b = browserify({
      entries: paths.srcMainMainTs,
      debug: true
    })
    .plugin(tsify, tsconfig)
    .on('log', gutil.log);

    // Browserifyにより実行時依存性解決
    b = b.bundle();
    // 第1引数にtrueが指定されている場合はトランスパイルでエラーがあっても
    // 監視状態が解除されないよう、エラー処理用イベント・リスナーを追加する
    if (watchMode) {
      b.on('error', function (err) {
        gutil.log(err);
        this.emit('end');
      });
    }
    // UglifyJSやsourcemapsにより変換する
    return b
      .pipe(source(paths.bundledJsOutName))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
          .pipe(uglify())
          .pipe(rename({suffix: '.min'}))
          .on('error', gutil.log)
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(paths.bundledJsOutDir));
  };
}

function concatPath(args) {
  return Array.apply(null, arguments)
  .reduce(function (prev, curr, i, arr) {
    return curr ? (prev ? prev + '/' : '') + curr : prev;
  }, '').replace(/\/+/g, '/');
}
