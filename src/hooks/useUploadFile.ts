import { useMutation } from "@tanstack/react-query";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';

import { ACTIVE } from "@/lib/constants";
import { useCurrentUser } from "./useCurrentUser";

/**
 * Upload an arbitrary file to the configured Blossom servers. The first
 * URL in `ACTIVE.blossom` is the upload target; additional URLs become
 * `server` tags so clients can fall back when fetching the blob.
 *
 * Returns the NIP-94-style tag array from the uploader, e.g.
 * `[['url', '...'], ['x', '<sha256>'], ['m', '<mime>'], ['size', '...']]`.
 */
export function useUploadFile() {
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        throw new Error('Must be logged in to upload files');
      }

      const uploader = new BlossomUploader({
        servers: [...ACTIVE.blossom],
        signer: user.signer,
      });

      const tags = await uploader.upload(file);
      return tags;
    },
  });
}