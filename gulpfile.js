'use strict';

// 依存性のインポート
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

// ビルドに関わるパスの基本セット
var paths = {
  srcMain : 'src/main/resources',
  srcTest : 'src/test/resources',
  targetMain : 'target/classes',
  targetTest : 'target/test-classes'
};
// より詳細なパスの定義
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
//       その成果物の変更を検知して'_watchExceptTs'がコピーを行う
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
  // 'src/test/**/*.spec.ts'すべてを対象に
  // TypeScriptからJavaScriptへトランスパイルし
  // それを*.jsファイルとして出力後
  // Jasmineテストランナーでテスト実行
  return gulp.src(paths.srtTestAllSpecTs)
    .pipe(typescript(tsconfig.compilerOptions))
    .pipe(gulp.dest(paths.srcTest))
    .pipe(jasmine());
});
// *.tsファイル以外の変更を検知してコピーを実行するタスク
gulp.task('_watchExceptTs', ['_watchTs'], () => {
  // 'src/main/resources/**/*'のうち
  // 'src/main/resources/**/*.ts'を除くすべてを対象に
  // その変更（追加も含む）を監視する
  // 変更があった場合はログ出力も行う
  var w = watch([
    paths.srcMainAllResources,
    '!' + paths.srcMainAllTs
  ]).on('change', gutil.log);

  // 監視開始時点で'target/classes'が存在するかチェック
  if (fs.existsSync(paths.targetMain)) {
    // 存在する場合、ファイル変更検知時にファイルのコピーも行う
    return w.pipe(gulp.dest(paths.copiedResoucesDir));
  } else {
    // 存在しない場合、何も追加のアクションはなし
    // （監視とロギングはするがそれ以外は何もしない）
    return w;
  }
});
// *.tsファイルの変更を検知してトランスパイルと実行時依存性解決を行うタスク
// NOTE: ビルド処理は'_bundleTs'と同じ設定で行われる
gulp.task('_watchTs', ['_copyAllResources'], () => {
  // 'src/main/resources/**/*.ts'すべてを対象に
  // その変更（追加も含む）を監視する
  // 変更があった場合は'build'タスクに相当する処理を行い
  // ログ出力も行う
  var w = watch([
    paths.srcMainAllTs
  ], _bundleTsTask(true))
  .on('change', gutil.log);
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
    // （リスナー本体でthisを参照するためラムダ構文ではなくfunctionを使用）
    if (watchMode) {
      b.on('error', function (err) {
        gutil.log(err);
        this.emit('end');
      });
    }
    // バンドル結果のストリームに対して：
    // 1) 仮のファイル名をつけVinylファイルストリーム化し
    // 2) Vinyl対応できていないGulpプラグインのための加工を施し
    // 3) 既存のソースマップがあればロードする設定でsourcemapsを初期化し
    // 4) Uglify（圧縮・難読化）を行い
    // 5) 接尾辞として'.min'を付与し
    // 6) エラー発生時のリスナーを設定し
    // 7) sourcemapsにより*.mapファイルを出力し
    // 8) 変換後のファイルを出力する
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
    .reduce((prev, curr) => prev + '/' + curr)
    .replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
}
