import { env } from "@/lib/env";

const acceptedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif"
];

const maxImageSizeBytes = 5 * 1024 * 1024;

type UploadFolder = "products" | "categories";

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

  if (response.ok || response.status === 409) {
    return;
  }

  const message = await response.text();
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

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": file.type,
      "x-upsert": "false"
    },
    body: file
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Image upload failed. ${message}`);
  }

  return `${config.supabaseUrl}/storage/v1/object/public/${bucketName}/${encodedObjectPath(
    objectPath
  )}`;
}
