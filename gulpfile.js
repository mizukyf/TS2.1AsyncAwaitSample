// https://github.com/gulpjs/gulp/blob/master/docs/recipes/browserify-uglify-sourcemap.md
'use strict';

var browserify = require('browserify');
var gulp = require('gulp');
var del = require('del');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var rename = require("gulp-rename");
var typescript = require('gulp-typescript');
var tsify = require('tsify');

gulp.task('default', ['copy'], function () {
  // set up the browserify instance on a task basis
  var b = browserify({
    entries: 'build/ts/main.ts',
    debug: true
  }).plugin(tsify);

  return b.bundle()
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
        // Add transformation tasks to the pipeline here.
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .on('error', gutil.log)
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('build/js'));
});

//
// var gulp = require('gulp');
// // var browserify = require('browserify');
// var concat = require('gulp-concat');
// var del = require('del');
// // var uglify = require("gulp-uglify");
//
gulp.task('typescript', ['copy'], function() {
  return gulp.src('build/ts/*.ts')
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(typescript())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('build/js'))
});

gulp.task('copy', function() {
  return gulp.src(['src/**/*.html', 'src/**/*.ts'])
    .pipe(gulp.dest('build'));
});

gulp.task('clean', function() {
  del(['build']);
})
