var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var util   = require('gulp-util');
var cssPrefix = require('gulp-css-prefix');

var paths = {
  scripts: ['js/*.js'],
  styles : ['css/*.css']
};

gulp.task('scripts', [], function() {
    util.log('Concatentating scripts...');
  return gulp.src([
                    'js/materialize.min.js',
                    'js/leaflet.js',
                    'js/leaflet.draw.js',
                    'js/L.Control.Locate.min.js',
                    'js/turf.min.js',
                    'js/arcarbon.js'
                 ])
    //  .pipe(uglify())
      .pipe(concat('arcarbon-map.js'))
    .pipe(gulp.dest('../public/js/'));
});

gulp.task('prefix-css', function() {
  return gulp.src('css/unprefixed/materialize.min.css')
    .pipe(cssPrefix('mat-'))
    .pipe(gulp.dest('css/'));
});

gulp.task('styles', [], function() {
    util.log('Concatentating styles...');
  return gulp.src([ 'css/leaflet.css',
                    'css/leaflet.draw.css',
                    'css/materialize.min.css',
                    'css/font-awesome.min.css',
                    'L.Control.Locate.min.css',
                    'css/main.css'
                ])
      .pipe(concat('arcarbon-map.css'))
    .pipe(gulp.dest('../public/css/'));
});

// Rerun the task when a file changes
gulp.task('watch', function() {
  gulp.watch(paths.scripts, ['scripts']);
  gulp.watch(paths.styles, ['styles']); // 'prefix-css','styles']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['watch']);
