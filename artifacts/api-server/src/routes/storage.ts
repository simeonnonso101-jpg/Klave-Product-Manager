import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { getAuth } from "@clerk/express";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

// ======================
// REQUEST UPLOAD URL
// ======================
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const auth = getAuth(req);

  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { name, size, contentType } = parsed.data;

  if (size > MAX_UPLOAD_BYTES) {
    res.status(413).json({ error: "File too large" });
    return;
  }

  if (!ALLOWED_CONTENT_TYPES.has(contentType.toLowerCase())) {
    res.status(415).json({ error: "Unsupported file type" });
    return;
  }

  try {
    const key = `${auth.userId}/${Date.now()}-${name}`;

    const uploadURL = await objectStorageService.getObjectEntityUploadURL(key);
    const objectPath = objectStorageService.normalizeObjectEntityPath(key);

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

// ======================
// PUBLIC FILES
// ======================
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;

    const results = await objectStorageService.searchPublicObject(filePath);

    if (!results.length) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const key = results[0].key;
    const response = await objectStorageService.downloadObject(key);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as unknown as ReadableStream<Uint8Array>
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

// ======================
// PRIVATE FILES
// ======================
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;

    const objectPath = `/objects/${wildcardPath}`;
    const response = await objectStorageService.downloadObject(objectPath);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as unknown as ReadableStream<Uint8Array>
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }

    console.error(error);
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
