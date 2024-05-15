import fs from 'fs';
import https from 'https';
import { json2csv } from 'json-2-csv';
import { rimraf } from 'rimraf';

//types
import type { PassThrough } from 'stream';

async function downloadResource({
  destinationPath,
  resourceUrl,
}: {
  resourceUrl: string;
  destinationPath: string;
}) {
  return new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(destinationPath);
    const request = https.get(resourceUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    });
    request.on('error', (err) => {
      fs.unlink(destinationPath, () => reject(err));
    });
  });
}

const print = (...value: (string | number)[]) =>
  process.stdout.write(`[${process.pid}] ${value.join(' ')}\n`);

const saveToCsv = ({
  obj,
  pathToCsv,
  createNewCsv,
}: {
  obj: Record<string, string>;
  pathToCsv: string;
  createNewCsv?: boolean;
}) => {
  const isAppend = !createNewCsv && fs.existsSync(pathToCsv);
  const csv = json2csv([obj], {
    prependHeader: !isAppend,
    expandNestedObjects: false,
  });

  isAppend
    ? fs.appendFileSync(pathToCsv, '\r\n' + csv)
    : fs.writeFileSync(pathToCsv, csv);
};

const cleanupDirectory = (dir: string) =>
  rimraf(dir, {
    glob: true,
  });

const isStreamed = (stream: PassThrough) =>
  new Promise<void>((resolve, reject) =>
    stream.on('end', resolve).on('error', reject),
  );

export { downloadResource, print, saveToCsv, cleanupDirectory, isStreamed };
