// Creates the two local buckets. Development only; production buckets are created by whoever runs the storage.
import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

const env = process.env;
const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT, region: env.S3_REGION, forcePathStyle: true,
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
});
for (const Bucket of [env.S3_BUCKET_PRIVATE, env.S3_BUCKET_PUBLIC]) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket }));
    console.log(`exists: ${Bucket}`);
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket }));
    console.log(`created: ${Bucket}`);
  }
}
