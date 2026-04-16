import cloudinary from "../config/cloudinary";

export async function uploadBufferToCloudinary(
    fileBuffer: Buffer,
    folder: string,
    publicId?: string
): Promise<{ secureUrl: string; publicId: string }> {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: publicId,
                resource_type: "image",
            },
            (error, result) => {
                if (error || !result) {
                    return reject(error || new Error("Cloudinary upload failed"));
                }

                resolve({
                    secureUrl: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        stream.end(fileBuffer);
    });
}

export async function deleteFromCloudinary(publicId: string) {
    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
    });
}