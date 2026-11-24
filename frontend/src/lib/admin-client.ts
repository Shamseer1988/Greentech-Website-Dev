type Problem = { loc: (string | number)[]; msg: string };

/** Turn a backend error into one readable line. */
export function errorText(status: number, data: unknown): string {
  const detail = (data as { detail?: string | Problem[] } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map(({ loc, msg }) => {
        const field = loc.filter((part) => part !== "body").join(" ").replaceAll("_", " ");
        const text = msg.replace(/^Value error, /, "");
        return field ? `${field}: ${text}` : text;
      })
      .join(" · ");
  }
  return status === 413 ? "The file is too large" : "Something went wrong. Please try again.";
}

/** A save made from the browser. Throws an Error with a message to show. */
export async function adminSend<T = unknown>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path.startsWith("/api/") ? path : `/api/admin${path}`, {
      method,
      ...(body !== undefined && {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    });
  } catch {
    throw new Error("No connection. Please try again.");
  }
  if (response.status === 401 && !window.location.pathname.startsWith("/admin/login")) {
    window.location.href = "/admin/login";
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(errorText(response.status, data));
  return data as T;
}

/** Upload with progress (fetch cannot report upload progress). */
export function adminUpload<T>(
  path: string,
  form: FormData,
  onProgress: (percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `/api/admin${path}`);
    request.responseType = "json";
    request.upload.onprogress = (event) =>
      event.lengthComputable && onProgress(Math.round((event.loaded / event.total) * 100));
    request.onerror = () => reject(new Error("No connection. Please try again."));
    request.onload = () => {
      if (request.status === 201) return resolve(request.response as T);
      if (request.status === 401) window.location.href = "/admin/login";
      reject(new Error(errorText(request.status, request.response)));
    };
    request.send(form);
  });
}
