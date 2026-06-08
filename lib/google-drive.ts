import { google } from 'googleapis';
import type { drive_v3 } from 'googleapis';

function getDriveClient(): drive_v3.Drive {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY no está configurado en las variables de entorno');

  let credentials: object;
  try {
    credentials = JSON.parse(key);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY no es un JSON válido');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

async function copyContents(
  drive: drive_v3.Drive,
  sourceFolderId: string,
  destFolderId: string,
): Promise<void> {
  const listRes = await drive.files.list({
    q: `'${sourceFolderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  for (const file of listRes.data.files ?? []) {
    if (!file.id || !file.name) continue;

    if (file.mimeType === 'application/vnd.google-apps.folder') {
      const sub = await drive.files.create({
        requestBody: {
          name: file.name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [destFolderId],
        },
        fields: 'id',
        supportsAllDrives: true,
      });
      if (sub.data.id) {
        await copyContents(drive, file.id, sub.data.id);
      }
    } else {
      await drive.files.copy({
        fileId: file.id,
        requestBody: { parents: [destFolderId], name: file.name },
        supportsAllDrives: true,
      });
    }
  }
}

export async function createProjectFolder(
  opportunityId: string,
  client: string,
  opportunityName: string,
): Promise<{ folderId: string; folderUrl: string }> {
  const templateFolderId = process.env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID;
  const destinationFolderId = process.env.GOOGLE_DRIVE_DESTINATION_FOLDER_ID;

  if (!templateFolderId) throw new Error('GOOGLE_DRIVE_TEMPLATE_FOLDER_ID no configurado');
  if (!destinationFolderId) throw new Error('GOOGLE_DRIVE_DESTINATION_FOLDER_ID no configurado');

  const drive = getDriveClient();
  const folderName = `${opportunityId} - ${client} - ${opportunityName}`;

  const newFolder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [destinationFolderId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  const folderId = newFolder.data.id;
  if (!folderId) throw new Error('No se pudo crear la carpeta en Google Drive');

  await copyContents(drive, templateFolderId, folderId);

  return {
    folderId,
    folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
  };
}
