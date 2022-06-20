// require modules
const fs = require('fs');
// const archiver = require('archiver');
const dotenv = require('dotenv');
const log = require('loglevel');
const { google } = require('googleapis');

dotenv.config();
// const { LOG_LEVEL, SOURCE_DIRECTORY_PATH, DESTINATION_DIRECTORY_PATH } = process.env;
log.setLevel('DEBUG');

const scopes = [
  "https://www.googleapis.com/auth/drive.readonly"
]
const { CLIENT_EMAIL, PRIVATE_KEY } = process.env;
const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, scopes);
const drive = google.drive({ version: 'v3', auth });

/**
 * Creates a folder on the local filesystem
 * @param {string} folderName The folder to be created
 */
const createFolder = (folderName) => {
  fs.mkdirSync(folderName)
}

const outputDirectory = `${__dirname}/output`;
if (!fs.existsSync(outputDirectory)) {
  log.debug('Output folder doesn\'t exist, creating it now');
  createFolder(outputDirectory)
}

/**
 * Gets the list of all of the fild ids in a folder
 * @param {string} folderId The id of the parent folder
 * @return {array} An array of the files
 */
const getFiles = async (folderId) => {
  const res = await drive.files.list({ q: `'${folderId}' in parents`});
    // if (err) throw err;
  log.debug('Files to download:')
  log.debug(res.data.files);
  return res.data.files
}

/**
 * Downloads the files of a folder
 * @param {array} files Array of files to download
 * @param {string} folderName Name of parent folder
 */
const downloadFiles = (files, folderName) => {
  files.forEach(async (file) => {
    log.debug(`Downloading ${file.name}`)
    const folderPath = `${outputDirectory}/${folderName}`;
    if (!fs.existsSync(folderPath)) {
      createFolder(folderPath)
    }
    const outputPath = `${folderPath}/${file.name}`
    const output = fs.createWriteStream(outputPath)
    await drive.files.get({
      fileId: file.id,
      alt: 'media'
    }, { responseType: 'stream' }, (error, response) => {
      if (error) {
        log.error(error)
      } else {
        response.data
          .on("end", () => log.debug("Done"))
          .on("error", (newError) => log.error(newError))
          .pipe(output)
      }
    })
  })
}

/**
 * Downloads the files in a folder
 * @param {string} folderId The id of the folder
 * @param {string} folderName The name of the folder
 */
const downloadFolder = async (folderId, folderName) => {
  const files = await getFiles(folderId)

  downloadFiles(files, folderName)
}

drive.files.list({}, async (err, res) => {
  const folderType = 'application/vnd.google-apps.folder';
  if (err) throw err;
  const { files } = res.data;
  if (!files.length) {
    log.debug('No files found');
    return;
  }
  files.map(f => log.debug(f))
  files.forEach(async (file) => {
    if (file.mimeType === folderType) {
      downloadFolder(file.id, file.name)
    }
  })
});


// // create a file to stream archive data to.
// const output = fs.createWriteStream(`${__dirname}/example.zip`);
// const archive = archiver('zip', {
//   zlib: { level: 9 }, // Sets the compression level.
// });

// // listen for all archive data to be written
// // 'close' event is fired only when a file descriptor is involved
// output.on('close', () => {
//   log.info(`Finished. Compressed ${archive.pointer()} total bytes`);
// });

// // This event is fired when the data source is drained no matter what was the data source.
// // It is not part of this library but rather from the NodeJS Stream API.
// // @see: https://nodejs.org/api/stream.html#stream_event_end
// output.on('end', () => {
//   log.debug('Data has been drained');
// });

// // good practice to catch warnings (ie stat failures and other non-blocking errors)
// archive.on('warning', (err) => {
//   if (err.code === 'ENOENT') {
//     // log warning
//     log.warn(err);
//   } else {
//     // throw error
//     throw err;
//   }
// });

// // good practice to catch this error explicitly
// archive.on('error', (err) => {
//   throw err;
// });

// archive.on('progress', (progress) => {
//   // log.debug(`Progress: ${progress.entries.processed / progress.entries.total}`);
//   log.debug('PROCESSED', progress.entries.processed);
// });

// // pipe archive data to the file
// archive.pipe(output);

// // append a file
// archive.directory(SOURCE_DIRECTORY_PATH, DESTINATION_DIRECTORY_PATH);

// // finalize the archive (ie we are done appending files but streams have to finish yet)
// // 'close', 'end' or 'finish' may be fired right after calling this method so register
// // to them beforehand
// archive.finalize();
