import type { Readable } from 'node:stream';
import { CreateBucketCommand, GetObjectCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { ENV, type Env } from '../env.js';

export type Visibility = 'private' | 'public';

/** S3-compatible object storage (ArvanCloud, MinIO, ...). */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly s3: S3Client;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.s3 = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
    });
  }

  /** Local demo/development only: create missing buckets. Production buckets are made by whoever runs the storage. */
  async onModuleInit() {
    if (!this.env.S3_AUTO_CREATE_BUCKETS) return;
    for (const Bucket of [this.env.S3_BUCKET_PRIVATE, this.env.S3_BUCKET_PUBLIC]) {
      try {
        await this.s3.send(new HeadBucketCommand({ Bucket }));
      } catch {
        await this.s3.send(new CreateBucketCommand({ Bucket }));
      }
    }
  }

  bucket(v: Visibility) {
    return v === 'private' ? this.env.S3_BUCKET_PRIVATE : this.env.S3_BUCKET_PUBLIC;
  }

  async put(v: Visibility, key: string, body: Readable, contentType: string) {
    const upload = new Upload({ client: this.s3, params: { Bucket: this.bucket(v), Key: key, Body: body, ContentType: contentType } });
    await upload.done();
  }

  /** Short-lived link for private files (identity documents, videos). */
  signedUrl(key: string, seconds = 300) {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.env.S3_BUCKET_PRIVATE, Key: key }), { expiresIn: seconds });
  }

  publicUrl(key: string) {
    return `${this.env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
  }
}
