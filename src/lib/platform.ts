// 轻量平台检测，避免在 SSR 或无 navigator 的环境报错
export const isMac = (): boolean => {
  try {
    const ua = navigator.userAgent || "";
    const plat = (navigator.platform || "").toLowerCase();
    return /mac/i.test(ua) || plat.includes("mac");
  } catch {
    return false;
  }
};

export const isWindows = (): boolean => {
  try {
    const ua = navigator.userAgent || "";
    return /windows|win32|win64/i.test(ua);
  } catch {
    return false;
  }
};

export const isLinux = (): boolean => {
  try {
    const ua = navigator.userAgent || "";
    return (
      /linux|x11/i.test(ua) && !/android/i.test(ua) && !isMac() && !isWindows()
    );
  } catch {
    return false;
  }
};
