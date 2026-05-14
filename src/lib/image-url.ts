interface OptimizedImageOptions {
  width?: number;
  quality?: number;
}

export const getOptimizedSupabaseImageUrl = (
  imageUrl: string | null | undefined,
  options: OptimizedImageOptions = {},
) => {
  if (!imageUrl) return "";

  try {
    const url = new URL(imageUrl);
    const publicObjectPath = "/storage/v1/object/public/";
    const publicRenderPath = "/storage/v1/render/image/public/";

    if (url.pathname.includes(publicObjectPath)) {
      url.pathname = url.pathname.replace(publicObjectPath, publicRenderPath);
    } else if (!url.pathname.includes(publicRenderPath)) {
      return imageUrl;
    }

    url.searchParams.set("width", String(options.width || 1920));
    url.searchParams.set("quality", String(options.quality || 78));
    url.searchParams.set("resize", "cover");

    return url.toString();
  } catch {
    return imageUrl;
  }
};

export const preloadImage = (imageUrl: string) => {
  if (!imageUrl || typeof document === "undefined") return;

  const existing = document.head.querySelector(`link[rel="preload"][href="${imageUrl}"]`);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = imageUrl;
  link.setAttribute("fetchpriority", "high");
  document.head.appendChild(link);
};
