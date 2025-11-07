declare module '@ffprobe-installer/ffprobe' {
  const ffprobe: {
    path: string;
    version: string;
  };

  export default ffprobe;
  export const path: string;
  export const version: string;
}

