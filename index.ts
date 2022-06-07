// require modules
const fs = require('fs');
const archiver = require('archiver');
const dotenv = require('dotenv');
const log = require('loglevel');

dotenv.config();
const { LOG_LEVEL, SOURCE_DIRECTORY_PATH, DESTINATION_DIRECTORY_PATH } = process.env;
log.setLevel(LOG_LEVEL);

// create a file to stream archive data to.
const output = fs.createWriteStream(`${__dirname}/example.zip`);
const archive = archiver('zip', {
  zlib: { level: 9 }, // Sets the compression level.
});

// listen for all archive data to be written
// 'close' event is fired only when a file descriptor is involved
output.on('close', () => {
  log.debug(`${archive.pointer()} total bytes`);
  log.debug('archiver has been finalized and the output file descriptor has closed.');
});

// This event is fired when the data source is drained no matter what was the data source.
// It is not part of this library but rather from the NodeJS Stream API.
// @see: https://nodejs.org/api/stream.html#stream_event_end
output.on('end', () => {
  log.debug('Data has been drained');
});

// good practice to catch warnings (ie stat failures and other non-blocking errors)
archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    // log warning
    log.warn(err);
  } else {
    // throw error
    throw err;
  }
});

// good practice to catch this error explicitly
archive.on('error', (err) => {
  throw err;
});

// pipe archive data to the file
archive.pipe(output);

// append a file
archive.directory(SOURCE_DIRECTORY_PATH, DESTINATION_DIRECTORY_PATH);

// finalize the archive (ie we are done appending files but streams have to finish yet)
// 'close', 'end' or 'finish' may be fired right after calling this method so register
// to them beforehand
archive.finalize();
