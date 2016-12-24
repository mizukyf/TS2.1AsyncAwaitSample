'use strict';

var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var del = require('del');
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
var watchify = require('watchify');

var paths = {
  srcMain : 'src/main',
  srcTest : 'src/test'
};

gulp.task('clean', () => del(['build']));
gulp.task('copy', () => {
  return gulp.src([concatPath('src', 'main', '**', '*.html')])
  .pipe(gulp.dest('build'));
});
gulp.task('default', ['copy'], buildTask(false));
gulp.task('watch', ['copy'], buildTask(true));
gulp.task('test', () => {
  return gulp.src(concatPath('src', 'test', 'es', '*.spec.ts'))
    .pipe(typescript(tsconfig.compilerOptions))
    .pipe(jasmine());
});

function buildTask (watch) {
  // タスク本体となる関数を生成して呼び出し元に返す
  return () => {
    // Browserifyのインスタンスを初期化する
    // Tsifyプラグインを追加する
    var b = browserify({
      entries: concatPath('src', 'main', 'es', 'main.ts'),
      debug: true
    })
    .plugin(tsify, tsconfig);

    // buildTaskの第1引数にtrueが渡された場合
    // Watchifyプラグインを追加する
    if (watch) b.plugin(watchify);

    // Browserifyにより実行時依存性解決されたJSファイルを
    // UglifyJSやsourcemapsにより変換する
    var f = () => b
      .bundle()
      .pipe(source('app.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
          .pipe(uglify())
          .pipe(rename({suffix: '.min'}))
          .on('error', gutil.log)
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(concatPath('build', 'es')));

    // buildTaskの第1引数にtrueが渡された場合
    // 'update'イベントのリスナー関数としてfを追加する
    if (watch) b.on('update', f);

    // 初回の変換処理を行う
    // buildTaskの第1引数にfalseが渡された場合これでタスクは完了
    return f();
  };
}

function concatPath(args) {
  return Array.apply(null, arguments)
  .reduce(function (prev, curr, i, arr) {
    return curr ? (prev ? prev + '/' : '') + curr : prev;
  }, '');
}
