import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, BUCKET } from '../config/r2.js';

export async function createPresignedPutUrl(storageKey, mimeType, expiresIn = 600) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    ContentType: mimeType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function createPresignedGetUrl(storageKey, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: storageKey });
  return getSignedUrl(s3, command, { expiresIn });
}

export async function deleteObject(storageKey) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey }));
}
