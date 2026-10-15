import { env } from "@/lib/env";
import { isExistingBucketResponse } from "./supabase-storage-response";

const acceptedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif"
];

const maxImageSizeBytes = 5 * 1024 * 1024;

type UploadFolder = "products" | "categories" | "homepage";

const bucketName = env.SUPABASE_STORAGE_BUCKET;

function storageConfig() {
  const supabaseUrl = env.SUPABASE_URL;
  const serviceRoleKey =
    env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    serviceRoleKey
  };
}

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extensionFor(file: File) {
  const extension = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();

  if (extension && ["jpg", "jpeg", "png", "webp", "avif"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/avif") return "avif";

  return "jpg";
}

function encodedObjectPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function ensurePublicBucket(config: NonNullable<ReturnType<typeof storageConfig>>) {
  const response = await fetch(`${config.supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: bucketName,
      name: bucketName,
      public: true,
      file_size_limit: maxImageSizeBytes,
      allowed_mime_types: acceptedImageTypes
    })
  });

  if (response.ok) {
    return;
  }

  const message = await response.text();

  // Supabase Storage currently reports an existing bucket as HTTP 400 while
  // carrying statusCode "409" and code "BucketAlreadyExists" in the body.
  // Treat every documented duplicate representation as an idempotent success.
  if (isExistingBucketResponse(response.status, message)) {
    return;
  }

  throw new Error(
    `Could not prepare Supabase Storage bucket "${bucketName}". ${message}`
  );
}

export async function uploadAdminImageFromForm(
  formData: FormData,
  {
    fieldName = "imageFile",
    folder,
    slug
  }: {
    fieldName?: string;
    folder: UploadFolder;
    slug: string;
  }
) {
  const file = formData.get(fieldName);

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return uploadAdminImage(file, { folder, slug });
}

export async function uploadAdminImage(
  file: File,
  { folder, slug }: { folder: UploadFolder; slug: string }
) {
  if (!acceptedImageTypes.includes(file.type)) {
    throw new Error("Upload a JPG, PNG, WebP or AVIF image.");
  }

  if (file.size > maxImageSizeBytes) {
    throw new Error("Image upload is too large. Use an image below 5MB.");
  }

  const config = storageConfig();

  if (!config) {
    throw new Error(
      "Supabase Storage is not configured yet. Add SUPABASE_URL and SUPABASE_SECRET_KEY, or paste an Image URL instead."
    );
  }

  await ensurePublicBucket(config);

  const baseName = safeFilename(slug || file.name) || "talomart-image";
  const objectPath = `${folder}/${baseName}-${crypto.randomUUID()}.${extensionFor(file)}`;
  const uploadUrl = `${config.supabaseUrl}/storage/v1/object/${bucketName}/${encodedObjectPath(
    objectPath
  )}`;

  // Files reconstructed from a Server Action can have a different runtime
  // representation from files read by a Route Handler. Send plain bytes so
  // the storage request never tries to serialize the File as an object.
  const imageBytes = new Uint8Array(await file.arrayBuffer());
  if (imageBytes.byteLength !== file.size) {
    throw new Error("The image could not be read completely. Choose the image again and retry.");
  }
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": file.type,
      "x-upsert": "false"
    },
    body: imageBytes
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Image upload failed. ${message}`);
  }

  return `${config.supabaseUrl}/storage/v1/object/public/${bucketName}/${encodedObjectPath(
    objectPath
  )}`;
}
