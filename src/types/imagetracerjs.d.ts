declare module 'imagetracerjs' {
  interface ImageTracerOptions {
    [key: string]: any;
  }

  interface ImageTracerResult {
    [key: string]: any;
  }

  export function imagedataToTracedata(img: ImageData, options?: ImageTracerOptions): ImageTracerResult;
  export function imageToTracedata(image: HTMLImageElement, options?: ImageTracerOptions, callback?: (result: ImageTracerResult) => void): void;
  export function imagedataToSVG(img: ImageData, options?: ImageTracerOptions): string;
  export function imageToSVG(image: HTMLImageElement, options?: ImageTracerOptions, callback?: (svg: string) => void): void;
  
  const ImageTracer: {
    imagedataToTracedata: typeof imagedataToTracedata;
    imageToTracedata: typeof imageToTracedata;
    imagedataToSVG: typeof imagedataToSVG;
    imageToSVG: typeof imageToSVG;
  };
  
  export default ImageTracer;
}