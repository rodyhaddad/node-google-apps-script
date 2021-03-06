var _ = require('lodash');
var dir = require('node-dir');
var path = require('path');
var Promise = require('bluebird');

function getFilesFromDisk(subdir) {
  return new Promise(function(resolve, reject) {

    var filesOnDisk = [];

    // Only iterate through supported .js, .gs and .html files in dir
    dir.readFiles(subdir, { match: /.js$|.gs$|.html$/ },
      // Invoke this callback on each file
      function(err, content, filename, next) {
        if (err) return reject(err);

        // Parse file's absolute path and add its content to result object
        file = path.parse(filename);
        file.content = content;
        if (getFileType(file) === 'server_js') {
          file.content = fixGSIdentifiers(file.content);
        }

        file.fullName = path.relative(subdir, file.dir) + '/' + file.name;
        if (file.fullName[0] === '/') {
          file.fullName = file.fullName.substring(1);
        }

        filesOnDisk.push(file);

        // Continue to next file
        next();
      },
      // finished callback.
      function(err) {
        if (err) return reject(err);
        resolve(filesOnDisk);
      });
  })
  .error(function() {
    // swallow ENOENT
    return [];
  });
}

function updateFileSource(existingFile, newFile) {
  existingFile.source = newFile.content;
}

function hasFileOnDisk(filesOnDisk, fileOnline) {
  return _.any(filesOnDisk, function(fileOnDisk) {
    var sameName = fileOnline.name === fileOnDisk.fullName;
    var sameType = fileOnline.type === getFileType(fileOnDisk);
    return sameName && sameType;
  });
}

function getFileType(file) {
  if (file.ext === '.js') return 'server_js';
  if (file.ext === '.gs') return 'server_js';
  if (file.ext === '.html') return 'html';
  throw new Error('Unsupported file type found. Google Apps Script only allows .js and .html');
}

function getFileExtension(file) {
  if (file.type === 'server_js') return '.js';
  if (file.type === 'html') return '.html';
  throw new Error('Unsupported file type found');
}

// GApps is too restrictive about reserved words used as JS identifiers.
// This function tries its best at wrapping these reserved words with quotes
// so the GApps compiler won't complain and uploads would succeed.
function fixGSIdentifiers(content) {
  return content.replace(/\.(delete|return|catch|for|default)\(/g, function (match, prop) {
    return '[\'' + prop + '\'](';
  }).replace(/(delete|return|catch|for):/g, function (match, prop) {
    return '\'' + prop + '\':';
  }).replace(/,(default):/g, function (match, prop) {
    return ',\'' + prop + '\':';
  }).replace(/\.(delete|return|catch|for|default);/g, function (match, prop) {
    return '[\'' + prop + '\'];';
  }).replace(/\.(delete|return|catch|for|default)=/g, function (match, prop) {
    return '[\'' + prop + '\']=';
  }).replace(/\.(delete|return|catch|for|default)\?/g, function (match, prop) {
    return '[\'' + prop + '\']?';
  }).replace(/\.(delete|return|catch|for|default)}/g, function (match, prop) {
    return '[\'' + prop + '\']}';
  });
}

module.exports.getFilesFromDisk = getFilesFromDisk;
module.exports.updateFileSource = updateFileSource;
module.exports.hasFileOnDisk = hasFileOnDisk;
module.exports.getFileType = getFileType;
module.exports.getFileExtension = getFileExtension;
module.exports.fixGSIdentifiers = fixGSIdentifiers;
